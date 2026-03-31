<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header sticky-header">
      <div class="header-title">
        <h1 class="main-title">Fechamento Mensal</h1>
        <span class="title-sep">—</span>
        <h2 class="main-subtitle">Competência</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">Última atualização: {{ lastUpdateTime }}</span>
        <VToggleGroup v-model="periodMode" :options="periodModeOptions" />
        <div v-if="periodMode === 'mes'" class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in mesesDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinaisDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div v-else class="period-range">
          <select class="month-select" v-model="selectedQuarter">
            <option v-for="q in quartersDisponiveis" :key="q.value" :value="q.value">{{ q.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>
    <p class="page-subtitle">Performance por Squad &amp; Coordenador</p>

    <!-- Error State -->
    <div v-if="error && !squadColumns.length" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !squadColumns.length" class="skeleton-table">
      <div v-for="i in 8" :key="i" class="skeleton-row">
        <div v-for="j in 7" :key="j" class="skeleton-cell"></div>
      </div>
    </div>

    <!-- Transposed Heatmap Table: rows = metrics, columns = squads -->
    <div v-if="squadColumns.length" class="table-wrapper">
      <table class="heatmap-table">
        <thead>
          <tr>
            <!-- Period label in first column -->
            <th class="col-period">{{ periodLabel }}</th>
            <!-- One column per squad -->
            <th v-for="squad in squadColumns" :key="squad.squad" class="col-squad-header">
              <div class="squad-name">{{ squad.squad }}</div>
              <div class="squad-coord">{{ squad.coordenador || '—' }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="metric in METRICS" :key="metric.key" :class="{ 'row-bold': metric.bold }">
            <td class="col-metric-label" :class="{ 'label-bold': metric.bold }">
              {{ metric.label }}
            </td>
            <td
              v-for="squad in squadColumns"
              :key="squad.squad"
              class="col-value"
              :class="heatClass(metric.key, squad[metric.key], squadColumns)"
            >
              <span v-if="squad[metric.key] === null || squad[metric.key] === undefined" class="em-dash">—</span>
              <span v-else>{{ metric.fmt(squad[metric.key]) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div v-if="squadColumns.length" class="legend-bar">
      <span class="legend-item"><span class="legend-dot legend-dot--green"></span>Bom desempenho</span>
      <span class="legend-item"><span class="legend-dot legend-dot--yellow"></span>Atenção</span>
      <span class="legend-item"><span class="legend-dot legend-dot--red"></span>Crítico</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DASHBOARD_ID = 'fechamento-mensal'

const periodModeOptions = [
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'mes', label: 'Mensal' }
]

const QUARTER_MONTHS = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12]
}

const MONTH_NAMES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtBRL(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(v))
  return v < 0 ? `-${formatted}` : formatted
}

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return v.toFixed(2) + '%'
}

const METRICS = [
  { key: 'mrr',          label: 'MRR Médio',                               fmt: fmtBRL, bold: false },
  { key: 'churn',        label: 'Churn Total',                             fmt: fmtBRL, bold: false },
  { key: 'isencao',      label: 'Isenção Total',                           fmt: fmtBRL, bold: false },
  { key: 'totalPerdas',  label: 'Total de Perdas',                         fmt: fmtBRL, bold: true  },
  { key: 'pctPerdas',    label: '% de Total de Perdas Sobre o MRR Médio',  fmt: fmtPct, bold: false },
  { key: 'totalMonet',   label: 'Monetização Total',                       fmt: fmtBRL, bold: false },
  { key: 'pctMonet',     label: '% de Monetização sobre o MRR Médio',      fmt: fmtPct, bold: false },
  { key: 'saldoFinal',   label: 'Saldo Final',                             fmt: fmtBRL, bold: true  }
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const periodMode = ref('trimestre')
const selectedQuarter = ref(null)
const mesInicial = ref(null)
const mesFinal = ref(null)
const lastUpdateTime = ref(null)

const { data, loading, error, fetchData } = useDashboardData(DASHBOARD_ID)

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseCurrency(raw) {
  if (!raw) return 0
  const cleaned = String(raw).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseMonth(raw) {
  if (!raw) return null
  const parts = raw.split('/')
  if (parts.length < 3) return null
  return { month: parseInt(parts[0], 10), year: parseInt(parts[2], 10) }
}

function monthValue(year, month) {
  return year * 100 + month
}

// ---------------------------------------------------------------------------
// Squad normalization — case-insensitive, with grouping rules
// Returns canonical squad name or null (filtered out)
// ---------------------------------------------------------------------------

const SQUAD_CANONICAL = [
  { canonical: 'Assemble', test: s => /assemble/i.test(s) },
  { canonical: 'Growthx',  test: s => /growthx/i.test(s) },
  { canonical: 'V4x',      test: s => /v4\s*x/i.test(s) || /silvania/i.test(s) }
]

function normalizeSquad(raw) {
  const match = SQUAD_CANONICAL.find(e => e.test(raw))
  return match ? match.canonical : null
}

// ---------------------------------------------------------------------------
// Raw rows
// ---------------------------------------------------------------------------

const rawRows = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return []
  return data.value.map(row => {
    const parsed   = parseMonth(row['Mês'])
    const squad    = normalizeSquad(row['Squad'] || '')
    return {
      squad,
      coordenador:  row['Coordenador'] || '',
      year:         parsed?.year ?? 0,
      month:        parsed?.month ?? 0,
      mrr:          parseCurrency(row['Receita Recorrente']),
      churn:        parseCurrency(row['Revenue Churn']),
      isencao:      parseCurrency(row['Isenção']),
      monetRec:     parseCurrency(row['Monetização Recorrente']),
      monetOneTime: parseCurrency(row['Atribuição One Time / Bookado']),
      monetVar:     parseCurrency(row['Monetização Variável'])
    }
  }).filter(r => r.squad && r.year > 0)
})

// ---------------------------------------------------------------------------
// Available periods
// ---------------------------------------------------------------------------

const mesesDisponiveis = computed(() => {
  const seen = new Set()
  const result = []
  rawRows.value.forEach(r => {
    const v = monthValue(r.year, r.month)
    if (!seen.has(v)) {
      seen.add(v)
      result.push({ value: v, label: `${MONTH_NAMES[r.month]}/${r.year}`, year: r.year, month: r.month })
    }
  })
  return result.sort((a, b) => a.value - b.value)
})

const mesesFinaisDisponiveis = computed(() => {
  if (!mesInicial.value) return mesesDisponiveis.value
  return mesesDisponiveis.value.filter(m => m.value >= mesInicial.value)
})

const quartersDisponiveis = computed(() => {
  const seen = new Set()
  const result = []
  rawRows.value.forEach(r => {
    for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
      if (months.includes(r.month)) {
        const key = `${r.year}-${q}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ value: key, label: `${q}/${r.year}`, year: r.year, quarter: q })
        }
      }
    }
  })
  return result.sort((a, b) => a.year !== b.year ? a.year - b.year : a.quarter.localeCompare(b.quarter))
})

watch(mesesDisponiveis, (months) => {
  if (!months.length) return
  if (!mesInicial.value) mesInicial.value = months[0].value
  if (!mesFinal.value)   mesFinal.value   = months[months.length - 1].value
}, { immediate: true })

watch(quartersDisponiveis, (quarters) => {
  if (!quarters.length) return
  if (!selectedQuarter.value) selectedQuarter.value = quarters[quarters.length - 1].value
}, { immediate: true })

// ---------------------------------------------------------------------------
// Period label (shown in first column header)
// ---------------------------------------------------------------------------

const periodLabel = computed(() => {
  if (periodMode.value === 'trimestre' && selectedQuarter.value) {
    return selectedQuarter.value.replace('-', '/')
  }
  if (periodMode.value === 'mes') {
    const ini = mesesDisponiveis.value.find(m => m.value === mesInicial.value)
    const fim = mesesDisponiveis.value.find(m => m.value === mesFinal.value)
    if (ini && fim && ini.value === fim.value) return ini.label
    if (ini && fim) return `${ini.label} – ${fim.label}`
  }
  return ''
})

// ---------------------------------------------------------------------------
// Filtered rows
// ---------------------------------------------------------------------------

const filteredRows = computed(() => {
  if (!rawRows.value.length) return []

  if (periodMode.value === 'trimestre' && selectedQuarter.value) {
    const [yearStr, q] = selectedQuarter.value.split('-')
    const year = parseInt(yearStr, 10)
    const months = QUARTER_MONTHS[q] || []
    return rawRows.value.filter(r => r.year === year && months.includes(r.month))
  }

  if (periodMode.value === 'mes' && mesInicial.value && mesFinal.value) {
    return rawRows.value.filter(r => {
      const v = monthValue(r.year, r.month)
      return v >= mesInicial.value && v <= mesFinal.value
    })
  }

  return rawRows.value
})

// ---------------------------------------------------------------------------
// Aggregation → one object per squad (columns)
// ---------------------------------------------------------------------------

const squadColumns = computed(() => {
  if (!filteredRows.value.length) return []

  const map = new Map()
  filteredRows.value.forEach(r => {
    if (!map.has(r.squad)) {
      map.set(r.squad, {
        squad: r.squad,
        coordenador: r.coordenador,
        mrrSum: 0, mrrCount: 0,
        churnSum: 0, isencaoSum: 0,
        monetRecSum: 0, monetOneTimeSum: 0, monetVarSum: 0
      })
    }
    const g = map.get(r.squad)
    g.mrrSum      += r.mrr
    g.mrrCount    += 1
    g.churnSum    += r.churn
    g.isencaoSum  += r.isencao
    g.monetRecSum     += r.monetRec
    g.monetOneTimeSum += r.monetOneTime
    g.monetVarSum     += r.monetVar
  })

  return Array.from(map.values())
    .sort((a, b) => a.squad.localeCompare(b.squad, 'pt-BR'))
    .map(g => {
      const mrr        = g.mrrCount > 0 ? g.mrrSum / g.mrrCount : 0
      const churn      = g.churnSum
      const isencao    = g.isencaoSum
      const totalPerdas = Math.abs(churn) + Math.abs(isencao)
      const pctPerdas  = mrr > 0 ? (totalPerdas / mrr) * 100 : null
      const totalMonet = g.monetRecSum + g.monetOneTimeSum + g.monetVarSum
      const pctMonet   = mrr > 0 ? (totalMonet / mrr) * 100 : null
      const saldoFinal = mrr - totalPerdas + totalMonet
      return { squad: g.squad, coordenador: g.coordenador, mrr, churn, isencao, totalPerdas, pctPerdas, totalMonet, pctMonet, saldoFinal }
    })
})

// ---------------------------------------------------------------------------
// Heatmap coloring
// ---------------------------------------------------------------------------

function relativeColor(key, value, squads, lowerIsBetter) {
  if (value === null || value === undefined || isNaN(value)) return ''
  const values = squads.map(s => s[key]).filter(v => v !== null && v !== undefined && !isNaN(v))
  if (values.length < 2) return ''
  const sorted = [...values].sort((a, b) => lowerIsBetter ? a - b : b - a)
  const rank = sorted.indexOf(value)
  const pct = rank / (sorted.length - 1)
  if (pct <= 0.33) return 'c-green'
  if (pct <= 0.66) return 'c-yellow'
  return 'c-red'
}

function heatClass(key, value, squads) {
  if (value === null || value === undefined || isNaN(value)) return ''

  switch (key) {
    case 'pctPerdas':
      if (value <= 25) return 'c-green'
      if (value <= 60) return 'c-yellow'
      return 'c-red'

    case 'pctMonet':
      if (value >= 50) return 'c-green'
      if (value >= 15) return 'c-yellow'
      return 'c-red'

    case 'saldoFinal':
      if (value > 0)  return 'c-green'
      if (value === 0) return 'c-yellow'
      return 'c-red'

    case 'mrr':
      return relativeColor(key, value, squads, false)

    case 'churn':
    case 'isencao':
    case 'totalPerdas':
      return relativeColor(key, value, squads, true)

    case 'totalMonet':
      return relativeColor(key, value, squads, false)

    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  await fetchData()
  if (data.value) {
    lastUpdateTime.value = new Date().toLocaleString('pt-BR', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

watch(loading, async (val) => {
  if (!val) {
    if (data.value) {
      lastUpdateTime.value = new Date().toLocaleString('pt-BR', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
      })
    }
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
})

async function handleRefresh() {
  await fetchData(true)
}
</script>

<style scoped>
/* ---- Layout ---- */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0d0d0d;
  padding-bottom: 4px;
}

.title-sep {
  color: #888;
  margin: 0 8px;
  font-weight: 300;
}

.page-subtitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 20px;
}

/* ---- Period controls ---- */
.period-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.period-sep {
  color: #666;
  font-size: 12px;
}

/* ---- Table ---- */
.table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #222;
}

.heatmap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

/* Column widths */
.col-period {
  min-width: 52px;
  width: 52px;
  padding: 12px 16px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  border-right: 1px solid #2a2a2a;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-align: left;
  vertical-align: bottom;
}

.col-squad-header {
  min-width: 140px;
  padding: 10px 16px 12px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  border-right: 1px solid #1e1e1e;
  text-align: right;
  vertical-align: bottom;
}

.squad-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 3px;
}

.squad-coord {
  font-size: 11px;
  color: #666;
}

/* Row cells */
.col-metric-label {
  padding: 10px 16px;
  background: #111;
  border-bottom: 1px solid #1e1e1e;
  border-right: 1px solid #2a2a2a;
  font-size: 13px;
  color: #aaa;
  white-space: nowrap;
  text-align: left;
}

.label-bold {
  color: #fff;
  font-weight: 600;
}

.col-value {
  padding: 10px 16px;
  border-bottom: 1px solid #1a1a1a;
  border-right: 1px solid #1e1e1e;
  text-align: right;
  font-size: 13px;
  color: #ccc;
  white-space: nowrap;
}

.row-bold .col-value {
  font-weight: 600;
  color: #fff;
}

.row-bold .col-metric-label {
  background: #131313;
}

.heatmap-table tbody tr:last-child td {
  border-bottom: none;
}

.em-dash {
  color: #444;
}

/* ---- Heat map colors ---- */
.c-green {
  background: rgba(34, 197, 94, 0.18) !important;
  color: #4ade80 !important;
}

.c-yellow {
  background: rgba(180, 130, 20, 0.22) !important;
  color: #d4a017 !important;
}

.c-red {
  background: rgba(180, 30, 30, 0.30) !important;
  color: #f87171 !important;
}

/* ---- Legend ---- */
.legend-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 16px;
  padding: 0 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #888;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot--green  { background: #22c55e; }
.legend-dot--yellow { background: #ca8a04; }
.legend-dot--red    { background: #ef4444; }

/* ---- Skeleton ---- */
.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.skeleton-row {
  display: flex;
  gap: 3px;
}

.skeleton-cell {
  height: 40px;
  flex: 1;
  background: #141414;
  border-radius: 3px;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}

/* ---- Error ---- */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
}
</style>
