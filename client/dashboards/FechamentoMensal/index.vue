<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header sticky-header">
      <div class="header-title">
        <h1 class="main-title">CS</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">Fechamento Mensal</h2>
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
        <div class="legend-wrapper">
          <i data-lucide="info" class="legend-icon"></i>
          <div class="legend-tooltip">
            <div class="legend-title">Legenda de Cores</div>
            <div class="legend-item"><span class="legend-dot legend-dot--green"></span>Bom / Acima da meta</div>
            <div class="legend-item"><span class="legend-dot legend-dot--yellow"></span>Atenção / Moderado</div>
            <div class="legend-item"><span class="legend-dot legend-dot--red"></span>Crítico / Abaixo da meta</div>
            <div class="legend-sep"></div>
            <div class="legend-note">% Perdas: verde ≤25%, amarelo ≤60%, vermelho &gt;60%</div>
            <div class="legend-note">% Monet.: verde ≥50%, amarelo ≥15%, vermelho &lt;15%</div>
            <div class="legend-note">Demais: relativo ao grupo</div>
          </div>
        </div>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !tableRows.length" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !tableRows.length" class="skeleton-table">
      <div v-for="i in 6" :key="i" class="skeleton-row">
        <div v-for="j in 12" :key="j" class="skeleton-cell"></div>
      </div>
    </div>

    <!-- Heatmap Table -->
    <div v-if="tableRows.length" class="table-wrapper">
      <table class="heatmap-table">
        <thead>
          <tr>
            <th class="col-squad">Squad</th>
            <th class="col-coord">Coordenador</th>
            <th v-for="col in COLUMNS" :key="col.key" class="col-metric">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.squad" :class="{ 'row-total': row.isTotal }">
            <td class="col-squad">{{ row.squad }}</td>
            <td class="col-coord">{{ row.coordenador }}</td>
            <td
              v-for="col in COLUMNS"
              :key="col.key"
              class="col-metric"
              :class="[heatClass(col.key, row[col.key], tableRows), { 'bold-cell': col.bold }]"
            >
              <span v-if="row[col.key] === null || row[col.key] === undefined" class="em-dash">—</span>
              <span v-else>{{ col.fmt(row[col.key]) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatCurrency } from '../../composables/useFormatters.js'
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

const MONTH_LABELS = [
  '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

function fmtBRL(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return v.toFixed(1) + '%'
}

const COLUMNS = [
  { key: 'mrr',          label: 'MRR Médio',        fmt: fmtBRL,  bold: false },
  { key: 'churn',        label: 'Rev. Churn',        fmt: fmtBRL,  bold: false },
  { key: 'isencao',      label: 'Isenção',           fmt: fmtBRL,  bold: false },
  { key: 'totalPerdas',  label: 'Total Perdas',      fmt: fmtBRL,  bold: true  },
  { key: 'pctPerdas',    label: '% Perdas',          fmt: fmtPct,  bold: true  },
  { key: 'monetRec',     label: 'Monet. Rec.',       fmt: fmtBRL,  bold: false },
  { key: 'monetOneTime', label: 'Monet. One-Time',   fmt: fmtBRL,  bold: false },
  { key: 'monetVar',     label: 'Monet. Variável',   fmt: fmtBRL,  bold: false },
  { key: 'totalMonet',   label: 'Total Monet.',      fmt: fmtBRL,  bold: true  },
  { key: 'pctMonet',     label: '% Monetização',     fmt: fmtPct,  bold: true  },
  { key: 'saldoFinal',   label: 'Saldo Final',       fmt: fmtBRL,  bold: true  }
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const periodMode = ref('trimestre')
const selectedQuarter = ref(null)
const mesInicial = ref(null)
const mesFinal = ref(null)

const { data, loading, error, fetchData, fromCache } = useDashboardData(DASHBOARD_ID)

const lastUpdateTime = ref(null)

// ---------------------------------------------------------------------------
// Data parsing helpers
// ---------------------------------------------------------------------------

function parseCurrency(raw) {
  if (!raw) return 0
  // "R$ 6.634,23" or "-R$ 500,00" or "6.634,23"
  const cleaned = String(raw)
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

/**
 * Parse "MM/DD/YYYY" → { year, month } (1-indexed month)
 */
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
// Raw rows from API
// ---------------------------------------------------------------------------

const rawRows = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return []
  return data.value.map(row => {
    const parsed = parseMonth(row['Mês'])
    return {
      squad:       row['Squad'] || '',
      coordenador: row['Coordenador'] || '',
      year:        parsed?.year ?? 0,
      month:       parsed?.month ?? 0,
      mrr:         parseCurrency(row['Receita Recorrente']),
      churn:       parseCurrency(row['Revenue Churn']),
      isencao:     parseCurrency(row['Isenção']),
      monetRec:    parseCurrency(row['Monetização Recorrente']),
      monetOneTime: parseCurrency(row['Atribuição One Time / Bookado']),
      monetVar:    parseCurrency(row['Monetização Variável'])
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
      result.push({ value: v, label: `${MONTH_LABELS[r.month]}/${r.year}`, year: r.year, month: r.month })
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
          result.push({ value: key, label: `${q} ${r.year}`, year: r.year, quarter: q })
        }
      }
    }
  })
  return result.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.quarter.localeCompare(b.quarter)
  })
})

// Initialize period selectors when data arrives
watch(mesesDisponiveis, (months) => {
  if (!months.length) return
  if (!mesInicial.value) mesInicial.value = months[0].value
  if (!mesFinal.value) mesFinal.value = months[months.length - 1].value
}, { immediate: true })

watch(quartersDisponiveis, (quarters) => {
  if (!quarters.length) return
  if (!selectedQuarter.value) selectedQuarter.value = quarters[quarters.length - 1].value
}, { immediate: true })

// ---------------------------------------------------------------------------
// Filtered rows by period
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
// Aggregation by squad
// ---------------------------------------------------------------------------

function aggregateBySquad(rows) {
  const map = new Map()

  rows.forEach(r => {
    if (!map.has(r.squad)) {
      map.set(r.squad, {
        squad: r.squad,
        coordenador: r.coordenador,
        mrrSum: 0,
        mrrCount: 0,
        churnSum: 0,
        isencaoSum: 0,
        monetRecSum: 0,
        monetOneTimeSum: 0,
        monetVarSum: 0
      })
    }
    const g = map.get(r.squad)
    g.mrrSum += r.mrr
    g.mrrCount += 1
    g.churnSum += r.churn
    g.isencaoSum += r.isencao
    g.monetRecSum += r.monetRec
    g.monetOneTimeSum += r.monetOneTime
    g.monetVarSum += r.monetVar
  })

  return Array.from(map.values()).map(g => {
    const mrr = g.mrrCount > 0 ? g.mrrSum / g.mrrCount : 0
    const churn = g.churnSum
    const isencao = g.isencaoSum
    const totalPerdas = Math.abs(churn) + Math.abs(isencao)
    const pctPerdas = mrr > 0 ? (totalPerdas / mrr) * 100 : null
    const monetRec = g.monetRecSum
    const monetOneTime = g.monetOneTimeSum
    const monetVar = g.monetVarSum
    const totalMonet = monetRec + monetOneTime + monetVar
    const pctMonet = mrr > 0 ? (totalMonet / mrr) * 100 : null
    const saldoFinal = mrr - totalPerdas + totalMonet

    return {
      squad: g.squad,
      coordenador: g.coordenador,
      mrr,
      churn,
      isencao,
      totalPerdas,
      pctPerdas,
      monetRec,
      monetOneTime,
      monetVar,
      totalMonet,
      pctMonet,
      saldoFinal,
      isTotal: false
    }
  })
}

function buildTotalRow(squads) {
  if (!squads.length) return null
  const sum = (key) => squads.reduce((acc, s) => acc + (s[key] || 0), 0)
  const mrr = sum('mrr') / squads.length
  const churn = sum('churn')
  const isencao = sum('isencao')
  const totalPerdas = sum('totalPerdas')
  const pctPerdas = mrr > 0 ? (totalPerdas / mrr) * 100 : null
  const monetRec = sum('monetRec')
  const monetOneTime = sum('monetOneTime')
  const monetVar = sum('monetVar')
  const totalMonet = sum('totalMonet')
  const pctMonet = mrr > 0 ? (totalMonet / mrr) * 100 : null
  const saldoFinal = sum('saldoFinal')

  return {
    squad: 'Total',
    coordenador: '',
    mrr,
    churn,
    isencao,
    totalPerdas,
    pctPerdas,
    monetRec,
    monetOneTime,
    monetVar,
    totalMonet,
    pctMonet,
    saldoFinal,
    isTotal: true
  }
}

const tableRows = computed(() => {
  const squads = aggregateBySquad(filteredRows.value).sort((a, b) =>
    a.squad.localeCompare(b.squad, 'pt-BR')
  )
  if (!squads.length) return []
  const total = buildTotalRow(squads)
  return total ? [...squads, total] : squads
})

// ---------------------------------------------------------------------------
// Heatmap coloring
// ---------------------------------------------------------------------------

/**
 * Relative color: best value in group = green, worst = red.
 * lowerIsBetter: true for churn/isenção/perdas, false for mrr/monetização
 */
function relativeColor(key, value, rows, lowerIsBetter) {
  if (value === null || value === undefined || isNaN(value)) return ''
  const values = rows
    .filter(r => !r.isTotal && r[key] !== null && r[key] !== undefined && !isNaN(r[key]))
    .map(r => r[key])
  if (values.length < 2) return ''

  const sorted = [...values].sort((a, b) => lowerIsBetter ? a - b : b - a)
  const rank = sorted.indexOf(value)
  const pct = rank / (sorted.length - 1)

  if (pct <= 0.33) return 'c-green'
  if (pct <= 0.66) return 'c-yellow'
  return 'c-red'
}

function heatClass(key, value, rows) {
  if (value === null || value === undefined || isNaN(value)) return ''
  const row = rows.find(r => r[key] === value)
  if (row?.isTotal) return ''

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
      if (value > 0) return 'c-green'
      if (value === 0) return 'c-yellow'
      return 'c-red'

    case 'mrr':
      return relativeColor(key, value, rows, false)

    case 'churn':
    case 'isencao':
    case 'totalPerdas':
      return relativeColor(key, value, rows, true)

    case 'monetRec':
    case 'monetOneTime':
    case 'monetVar':
    case 'totalMonet':
      return relativeColor(key, value, rows, false)

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
    lastUpdateTime.value = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

watch(loading, async (val) => {
  if (!val) {
    if (data.value) {
      lastUpdateTime.value = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
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
  padding-bottom: 12px;
}

.title-sep {
  color: #ff0000;
  margin: 0 8px;
  font-weight: 300;
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

/* ---- Legend ---- */
.legend-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.legend-icon {
  width: 16px;
  height: 16px;
  color: #666;
  cursor: pointer;
}

.legend-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px 14px;
  width: 260px;
  z-index: 50;
}

.legend-wrapper:hover .legend-tooltip {
  display: block;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #ccc;
  margin-bottom: 4px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot--green  { background: #22c55e; }
.legend-dot--yellow { background: #fbbf24; }
.legend-dot--red    { background: #ef4444; }

.legend-sep {
  border-top: 1px solid #333;
  margin: 8px 0;
}

.legend-note {
  font-size: 11px;
  color: #666;
  margin-bottom: 3px;
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
  min-width: 1100px;
}

.heatmap-table thead tr {
  background: #141414;
  border-bottom: 2px solid #333;
}

.heatmap-table th {
  padding: 10px 12px;
  text-align: right;
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.heatmap-table th.col-squad,
.heatmap-table th.col-coord {
  text-align: left;
}

.heatmap-table tbody tr {
  border-bottom: 1px solid #1a1a1a;
  transition: background 0.15s;
}

.heatmap-table tbody tr:hover {
  background: #161616;
}

.heatmap-table tbody tr.row-total {
  background: #161616;
  border-top: 2px solid #333;
  font-weight: 600;
}

.heatmap-table td {
  padding: 10px 12px;
  text-align: right;
  color: #ccc;
  white-space: nowrap;
}

.heatmap-table td.col-squad {
  text-align: left;
  color: #fff;
  font-weight: 500;
}

.heatmap-table td.col-coord {
  text-align: left;
  color: #888;
  font-size: 12px;
}

.bold-cell {
  font-weight: 600;
  color: #fff !important;
}

.em-dash {
  color: #444;
}

/* ---- Heat map colors ---- */
.c-green {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80 !important;
}

.c-yellow {
  background: rgba(251, 191, 36, 0.12);
  color: #fcd34d !important;
}

.c-red {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171 !important;
}

/* ---- Skeleton ---- */
.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.skeleton-row {
  display: flex;
  gap: 4px;
}

.skeleton-cell {
  height: 36px;
  flex: 1;
  background: #141414;
  border-radius: 4px;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
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
