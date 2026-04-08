<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Operação</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">Comparativo Entre Squads</h2>
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
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Squad Filter -->
    <div v-if="allSquads.length" class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Squads</label>
        <button class="filter-toggle" @click="showSquadFilter = !showSquadFilter">
          {{ selectedSquads.length }} de {{ allSquads.length }}
          <i :data-lucide="showSquadFilter ? 'chevron-up' : 'chevron-down'" class="filter-chevron"></i>
        </button>
      </div>
      <button v-if="showSquadFilter" class="filter-preset" @click="selectAllSquads">Todas</button>
      <button v-if="showSquadFilter" class="filter-preset" @click="selectDefaultSquads">Padrão</button>
    </div>
    <div v-if="showSquadFilter && allSquads.length" class="squad-chips">
      <button
        v-for="squad in allSquads"
        :key="squad"
        class="squad-chip"
        :class="{ 'squad-chip--active': selectedSquads.includes(squad) }"
        @click="toggleSquad(squad)"
      >{{ squad }}</button>
    </div>

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
              <span class="metric-label-text">
                {{ metric.label }}
                <span v-if="metric.tip" class="metric-tip">
                  <i data-lucide="info" class="metric-tip-icon"></i>
                  <span class="metric-tip-tooltip">{{ metric.tip }}</span>
                </span>
              </span>
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
    <div v-if="squadColumns.length" class="legend-section">
      <div class="legend-bar">
        <span class="legend-item"><span class="legend-dot legend-dot--green"></span>Bom</span>
        <span class="legend-item"><span class="legend-dot legend-dot--yellow"></span>Atenção</span>
        <span class="legend-item"><span class="legend-dot legend-dot--red"></span>Crítico</span>
      </div>

      <table class="legend-table">
        <thead>
          <tr>
            <th class="legend-th">Métrica</th>
            <th class="legend-th legend-th--green">Bom</th>
            <th class="legend-th legend-th--yellow">Atenção</th>
            <th class="legend-th legend-th--red">Crítico</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="legend-td legend-td--label">MRR Médio</td>
            <td class="legend-td">≥ R$ 150k</td>
            <td class="legend-td">R$ 120k – R$ 150k</td>
            <td class="legend-td">&lt; R$ 120k</td>
          </tr>
          <tr>
            <td class="legend-td legend-td--label">Churn / Isenção / Total de Perdas</td>
            <td class="legend-td" colspan="3">Segue a cor do % Médio de Perdas da squad</td>
          </tr>
          <tr>
            <td class="legend-td legend-td--label">% Médio de Perdas sobre o MRR</td>
            <td class="legend-td">≤ 6%</td>
            <td class="legend-td">6% – 9%</td>
            <td class="legend-td">&gt; 9%</td>
          </tr>
          <tr>
            <td class="legend-td legend-td--label">Monetização Total / % Monetização</td>
            <td class="legend-td" colspan="3">Mapa de calor relativo entre as squads</td>
          </tr>
          <tr>
            <td class="legend-td legend-td--label">Saldo Final</td>
            <td class="legend-td" colspan="3">Mapa de calor relativo entre as squads</td>
          </tr>
          <tr>
            <td class="legend-td legend-td--label">NPS</td>
            <td class="legend-td">≥ 50</td>
            <td class="legend-td">20 – 50</td>
            <td class="legend-td">&lt; 20</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    message="Deseja atualizar os dados do Comparativo Squads? A atualização leva poucos segundos."
    confirmText="Sim, atualizar"
    cancelText="Cancelar"
    type="warning"
    @confirm="confirmRefresh"
    @cancel="cancelRefresh"
  />

  <!-- Modal: Atualização já em andamento -->
  <VConfirmModal
    :visible="showUpdatingModal"
    title="Atualização em andamento"
    message="Já existe uma atualização dos dados em andamento. Aguarde a conclusão antes de solicitar uma nova atualização."
    confirmText="Entendido"
    type="info"
    @confirm="showUpdatingModal = false"
    @cancel="showUpdatingModal = false"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import { HISTORICO_2025 } from './historico-2025.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DASHBOARD_ID = 'comparativo-squads'

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

const SQUAD_ALIASES = [
  { canonical: 'Assemble',     test: s => /assemble/i.test(s) },
  { canonical: 'Growthx',      test: s => /growthx|growth\s*x/i.test(s) },
  { canonical: 'V4x',          test: s => /v4\s*x/i.test(s) || /silvania/i.test(s) },
  { canonical: 'Roi Eagles',   test: s => /roi\s*eagles/i.test(s) },
  { canonical: 'Data Hawk',    test: s => /data\s*hawk/i.test(s) },
  { canonical: 'Rev Hunters',  test: s => /rev\s*hunters/i.test(s) },
  { canonical: 'Army',         test: s => /^army$/i.test(s) },
  { canonical: 'Mkt Place',    test: s => /mkt\s*place/i.test(s) }
]

const DEFAULT_SQUADS = ['Assemble', 'Growthx', 'V4x']

// NPS hardcoded — Q1/2026
const NPS_DATA = {
  '2026-Q1': {
    'Growthx': 55.6,
    'V4x': 100.0,
    'Sharks': 66.7,
    'Assemble': 50.0,
    'Growth Lab': 100.0,
    'Roi Eagles': -33.3
  }
}

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
  { key: 'mrr',          label: 'MRR Médio',                               fmt: fmtBRL, bold: false, tip: 'Média da receita recorrente mensal no período selecionado' },
  { key: 'churn',        label: 'Churn Total',                             fmt: fmtBRL, bold: false, tip: 'Soma da receita recorrente dos clientes com status "Recorrência Cancelada"' },
  { key: 'isencao',      label: 'Isenção Total',                           fmt: fmtBRL, bold: false, tip: 'Soma de todas as isenções concedidas no período' },
  { key: 'totalPerdas',  label: 'Total de Perdas',                         fmt: fmtBRL, bold: true,  tip: 'Churn Total + Isenção Total' },
  { key: 'pctPerdas',    label: '% Médio de Perdas sobre o MRR',           fmt: fmtPct, bold: false, tip: 'Média das % mensais de (Perdas do mês ÷ MRR do mês)' },
  { key: 'totalMonet',   label: 'Monetização Total',                       fmt: fmtBRL, bold: false, tip: 'Soma de monetização recorrente + one time + variável' },
  { key: 'pctMonet',     label: '% Médio de Monetização sobre o MRR',      fmt: fmtPct, bold: false, tip: 'Média das % mensais de (Monetização do mês ÷ MRR do mês)' },
  { key: 'saldoFinal',   label: 'Saldo Final',                             fmt: fmtBRL, bold: true,  tip: 'Monetização Total − Total de Perdas' },
  { key: 'nps',          label: 'NPS',                                     fmt: v => v != null ? v.toFixed(1) : '—', bold: false, tip: 'Net Promoter Score da squad (dados trimestrais)' }
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const periodMode = ref('trimestre')
const selectedQuarter = ref(null)
const mesInicial = ref(null)
const mesFinal = ref(null)
const lastUpdateTime = ref(null)
const selectedSquads = ref([...DEFAULT_SQUADS])
const showSquadFilter = ref(false)

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
  // Formato dd/mm/yyyy — mês é parts[1]
  return { month: parseInt(parts[1], 10), year: parseInt(parts[2], 10) }
}

function monthValue(year, month) {
  return year * 100 + month
}

// ---------------------------------------------------------------------------
// Squad normalization — case-insensitive, with grouping rules
// ---------------------------------------------------------------------------

function normalizeSquad(raw) {
  if (!raw || !raw.trim()) return null
  const match = SQUAD_ALIASES.find(e => e.test(raw))
  return match ? match.canonical : raw.trim()
}

// ---------------------------------------------------------------------------
// Raw rows
// ---------------------------------------------------------------------------

const rawRows = computed(() => {
  if (!data.value) return []
  // API retorna [{ data: [...rows] }] — extrair o array interno
  const rows = Array.isArray(data.value?.[0]?.data) ? data.value[0].data
    : Array.isArray(data.value) ? data.value
    : []
  return rows.map(row => {
    const parsed   = parseMonth(row['Mês'])
    const squad    = normalizeSquad(row['Squad'] || '')
    const isCancelado = row['Status'] === 'Recorrência Cancelada'
    const receitaRecorrente = parseCurrency(row['Receita Recorrente'])
    return {
      squad,
      coordenador:  row['Coordenador'] || '',
      year:         parsed?.year ?? 0,
      month:        parsed?.month ?? 0,
      mrr:          receitaRecorrente,
      churn:        isCancelado ? receitaRecorrente : 0,
      isencao:      parseCurrency(row['Isenção']),
      monetRec:     parseCurrency(row['Monetização Recorrente']),
      monetOneTime: parseCurrency(row['Atribuição One Time / Bookado']),
      monetVar:     parseCurrency(row['Monetização Variável']),
      nps:          row['NPS'] != null && row['NPS'] !== '' ? Number(row['NPS']) : null
    }
  }).filter(r => r.squad && r.year > 0)
})

// ---------------------------------------------------------------------------
// Squad filter
// ---------------------------------------------------------------------------

const allSquads = computed(() => {
  const squads = new Set()
  rawRows.value.forEach(r => squads.add(r.squad))
  // Incluir squads do histórico
  for (const q of Object.values(HISTORICO_2025)) {
    for (const s of Object.keys(q.squads)) squads.add(s)
  }
  return Array.from(squads).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

function toggleSquad(squad) {
  const arr = selectedSquads.value
  const idx = arr.indexOf(squad)
  if (idx >= 0) {
    if (arr.length > 1) selectedSquads.value = arr.filter(s => s !== squad)
  } else {
    selectedSquads.value = [...arr, squad]
  }
}

function selectAllSquads() {
  selectedSquads.value = [...allSquads.value]
}

function selectDefaultSquads() {
  selectedSquads.value = [...DEFAULT_SQUADS]
}

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

  // Trimestres do histórico 2025
  for (const key of Object.keys(HISTORICO_2025)) {
    if (!seen.has(key)) {
      seen.add(key)
      const [year, q] = key.split('-')
      result.push({ value: key, label: `${q}/${year}`, year: parseInt(year), quarter: q })
    }
  }

  // Trimestres dos dados da API (2026+)
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

const quarterInitialized = ref(false)

watch(quartersDisponiveis, (quarters) => {
  if (!quarters.length) return
  if (!quarterInitialized.value) {
    const now = new Date()
    const curYear = now.getFullYear()
    const curQ = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
    const curKey = `${curYear}-${curQ}`
    const match = quarters.find(q => q.value === curKey)
    selectedQuarter.value = match ? match.value : quarters[quarters.length - 1].value
    // Só marcar como inicializado quando os dados da API já carregaram
    if (rawRows.value.length > 0) quarterInitialized.value = true
  }
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
  // Dados do histórico 2025 (hardcoded)
  if (periodMode.value === 'trimestre' && selectedQuarter.value && HISTORICO_2025[selectedQuarter.value]) {
    const historico = HISTORICO_2025[selectedQuarter.value].squads
    return Object.entries(historico)
      .filter(([squad]) => selectedSquads.value.includes(squad))
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([squad, data]) => ({ squad, ...data }))
  }

  if (!filteredRows.value.length) return []

  const map = new Map()
  filteredRows.value.forEach(r => {
    if (!map.has(r.squad)) {
      map.set(r.squad, {
        squad: r.squad,
        coordenador: r.coordenador,
        mrrByMonth: new Map(),
        churnByMonth: new Map(),
        isencaoByMonth: new Map(),
        monetByMonth: new Map(),
        npsValues: []
      })
    }
    const g = map.get(r.squad)
    const mv = monthValue(r.year, r.month)
    g.mrrByMonth.set(mv, (g.mrrByMonth.get(mv) ?? 0) + r.mrr)
    g.churnByMonth.set(mv, (g.churnByMonth.get(mv) ?? 0) + r.churn)
    g.isencaoByMonth.set(mv, (g.isencaoByMonth.get(mv) ?? 0) + r.isencao)
    const monetRow = r.monetRec + r.monetOneTime + r.monetVar
    g.monetByMonth.set(mv, (g.monetByMonth.get(mv) ?? 0) + monetRow)
    if (r.nps !== null) g.npsValues.push(r.nps)
  })

  return Array.from(map.values())
    .filter(g => selectedSquads.value.includes(g.squad))
    .sort((a, b) => a.squad.localeCompare(b.squad, 'pt-BR'))
    .map(g => {
      // MRR Médio: soma mensal por mês → média entre os meses
      const monthKeys = Array.from(g.mrrByMonth.keys())
      const monthlyMrr = Array.from(g.mrrByMonth.values())
      const mrr = monthlyMrr.length > 0
        ? monthlyMrr.reduce((acc, v) => acc + v, 0) / monthlyMrr.length
        : 0

      // Churn e Isenção: soma total
      const churn   = Array.from(g.churnByMonth.values()).reduce((a, v) => a + v, 0)
      const isencao = Array.from(g.isencaoByMonth.values()).reduce((a, v) => a + v, 0)
      const totalPerdas = Math.abs(churn) + Math.abs(isencao)

      // % Perdas: média das % mensais (perdas_mes / mrr_mes)
      const pctPerdasMensal = monthKeys.map(mv => {
        const mrrMes = g.mrrByMonth.get(mv) || 0
        const perdasMes = Math.abs(g.churnByMonth.get(mv) || 0) + Math.abs(g.isencaoByMonth.get(mv) || 0)
        return mrrMes > 0 ? (perdasMes / mrrMes) * 100 : null
      }).filter(v => v !== null)
      const pctPerdas = pctPerdasMensal.length > 0
        ? pctPerdasMensal.reduce((a, v) => a + v, 0) / pctPerdasMensal.length
        : null

      // Monetização: soma total
      const totalMonet = Array.from(g.monetByMonth.values()).reduce((a, v) => a + v, 0)

      // % Monetização: média das % mensais (monet_mes / mrr_mes)
      const pctMonetMensal = monthKeys.map(mv => {
        const mrrMes = g.mrrByMonth.get(mv) || 0
        const monetMes = g.monetByMonth.get(mv) || 0
        return mrrMes > 0 ? (monetMes / mrrMes) * 100 : null
      }).filter(v => v !== null)
      const pctMonet = pctMonetMensal.length > 0
        ? pctMonetMensal.reduce((a, v) => a + v, 0) / pctMonetMensal.length
        : null
      const saldoFinal = totalMonet - totalPerdas

      // NPS: buscar hardcoded pelo período selecionado
      let nps = null
      if (periodMode.value === 'trimestre' && selectedQuarter.value) {
        const npsQuarter = NPS_DATA[selectedQuarter.value]
        if (npsQuarter && npsQuarter[g.squad] !== undefined) nps = npsQuarter[g.squad]
      } else {
        // Modo mensal: verificar se os meses selecionados formam um trimestre completo
        for (const [key, npsMap] of Object.entries(NPS_DATA)) {
          const [year, q] = key.split('-')
          const qMonths = QUARTER_MONTHS[q]
          const selectedMonths = monthKeys.map(mv => mv % 100)
          if (parseInt(year) === monthKeys[0] && qMonths && qMonths.every(m => selectedMonths.includes(m))) {
            if (npsMap[g.squad] !== undefined) nps = npsMap[g.squad]
            break
          }
        }
      }
      return { squad: g.squad, coordenador: g.coordenador, mrr, churn, isencao, totalPerdas, pctPerdas, totalMonet, pctMonet, saldoFinal, nps }
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

function pctPerdasColor(value) {
  if (value <= 6) return 'c-green'
  if (value <= 9) return 'c-yellow'
  return 'c-red'
}

function heatClass(key, value, squads) {
  if (value === null || value === undefined || isNaN(value)) return ''

  switch (key) {
    case 'mrr':
      if (value >= 150000) return 'c-green'
      if (value >= 120000) return 'c-yellow'
      return 'c-red'

    case 'pctPerdas':
      return pctPerdasColor(value)

    case 'churn':
    case 'isencao':
    case 'totalPerdas': {
      // Mesma cor do % de perdas da squad
      const squad = squads.find(s => s[key] === value)
      if (squad?.pctPerdas != null) return pctPerdasColor(squad.pctPerdas)
      return ''
    }

    case 'totalMonet':
    case 'pctMonet':
      return relativeColor(key, value, squads, false)

    case 'saldoFinal':
      return relativeColor(key, value, squads, false)

    case 'nps':
      if (value >= 50) return 'c-green'
      if (value >= 20) return 'c-yellow'
      return 'c-red'

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

watch(showSquadFilter, async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// ── Update confirmation modal state ──────────────────────────────────────────
const refreshing = ref(false)
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

async function handleRefresh() {
  // Check if another update is already in progress
  try {
    const statusRes = await fetch(`/api/update-status/${DASHBOARD_ID}`)
    const statusData = await statusRes.json()
    if (statusData.updating) {
      showUpdatingModal.value = true
      return
    }
  } catch {
    // If status check fails, proceed with confirmation anyway
  }

  showConfirmModal.value = true
}

function cancelRefresh() {
  showConfirmModal.value = false
}

async function confirmRefresh() {
  showConfirmModal.value = false
  refreshing.value = true

  // Step 1: POST trigger webhook para N8N regenerar os dados
  try {
    const res = await fetch(`/api/${DASHBOARD_ID}/trigger-update`)
    if (!res.ok) {
      if (res.status === 409) {
        refreshing.value = false
        showUpdatingModal.value = true
        return
      }
      console.warn('[Comparativo Squads] Webhook de atualização retornou', res.status)
    }
  } catch (err) {
    console.warn('[Comparativo Squads] Falha ao chamar webhook de atualização:', err.message)
  }

  // Step 2: GET dados atualizados (bypassa cache)
  refreshing.value = false
  await fetchData(true)
}
</script>

<style scoped>
/* ---- Header ---- */
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.title-sep {
  font-size: 20px;
  color: #333;
  font-weight: 300;
}

.main-subtitle {
  font-size: 18px;
  font-weight: 400;
  color: #888;
  margin: 0;
}

/* ---- Period controls ---- */
.period-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.period-sep {
  font-size: 12px;
  color: #555;
}

.month-select {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding: 6px 18px 6px 4px;
  appearance: none;
  -webkit-appearance: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.month-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 8px 12px;
}

/* ---- Filters bar ---- */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.filter-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

.filter-chevron {
  width: 14px;
  height: 14px;
  color: #666;
}

.filter-preset {
  background: transparent;
  border: 1px solid #333;
  border-radius: 4px;
  color: #888;
  font-size: 11px;
  font-family: inherit;
  padding: 4px 10px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.filter-preset:hover {
  color: #ccc;
  border-color: #555;
}

/* ---- Squad chips ---- */
.squad-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.squad-chip {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #888;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.squad-chip:hover {
  border-color: #555;
  color: #ccc;
}

.squad-chip--active {
  background: rgba(255, 255, 255, 0.08);
  border-color: #666;
  color: #fff;
  font-weight: 500;
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

.metric-label-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.metric-tip {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.metric-tip-icon {
  width: 13px;
  height: 13px;
  color: #444;
  transition: color 0.15s;
}

.metric-tip:hover .metric-tip-icon {
  color: #888;
}

.metric-tip-tooltip {
  display: none;
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: #ccc;
  font-weight: 400;
  white-space: nowrap;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.metric-tip:hover .metric-tip-tooltip {
  display: block;
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
.legend-section {
  margin-top: 20px;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 14px;
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

/* Legend table */
.legend-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.legend-th {
  padding: 8px 12px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
  text-align: left;
}

.legend-th--green  { color: #4ade80; }
.legend-th--yellow { color: #d4a017; }
.legend-th--red    { color: #f87171; }

.legend-td {
  padding: 7px 12px;
  border-bottom: 1px solid #1a1a1a;
  color: #888;
}

.legend-td--label {
  color: #ccc;
  font-weight: 500;
  white-space: nowrap;
}

.legend-table tbody tr:last-child .legend-td {
  border-bottom: none;
}

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
