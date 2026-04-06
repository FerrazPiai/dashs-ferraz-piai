<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Produção Comercial</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">GTM Motion</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">
          Última atualização: {{ lastUpdateTime }}
        </span>
        <VToggleGroup v-model="periodMode" :options="periodModeOptions" />
        <div v-if="periodMode === 'mes'" class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in mesesDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinalDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
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
            <div class="legend-item">
              <span class="legend-dot legend-dot--green"></span>
              {{ legendGreenText }}
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot--yellow"></span>
              {{ legendYellowText }}
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-dot--red"></span>
              {{ legendRedText }}
            </div>
          </div>
        </div>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Filters + KPI Layout Toggle -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Canal</label>
        <select class="filter-select" v-model="selectedChannel">
          <option value="consolidado">Consolidado</option>
          <option v-for="canal in channelOptions" :key="canal.id" :value="canal.id">
            {{ canal.label }}
          </option>
        </select>
      </div>
      <div class="filter-group" :class="{ 'filter-hide': tableDrilldown === 'closer' }">
        <label class="filter-label">Closer</label>
        <select class="filter-select" v-model="selectedCloser">
          <option value="todos">Todos</option>
          <option v-for="c in closerOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="filter-group" :class="{ 'filter-hide': tableDrilldown === 'sdr' }">
        <label class="filter-label">SDR</label>
        <select class="filter-select" v-model="selectedSdr">
          <option value="todos">Todos</option>
          <option v-for="s in sdrOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="filter-group" :class="{ 'filter-hide': tableDrilldown === 'step' }">
        <label class="filter-label">Step</label>
        <select class="filter-select" v-model="selectedStep">
          <option value="todos">Todos</option>
          <option v-for="s in stepOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="kpi-layout-toggle">
        <button
          class="layout-btn"
          :class="{ active: kpiLayout === 'compact' }"
          @click="kpiLayout = 'compact'"
          aria-label="1 linha"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="5" width="14" height="4" rx="1" fill="currentColor"/></svg>
        </button>
        <button
          class="layout-btn"
          :class="{ active: kpiLayout === 'expanded' }"
          @click="kpiLayout = 'expanded'"
          aria-label="2 linhas"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="4" rx="1" fill="currentColor"/><rect x="0" y="9" width="14" height="4" rx="1" fill="currentColor"/></svg>
        </button>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid" :class="{ 'kpi-grid--compact': kpiLayout === 'compact' }">
      <GtmScorecard
        label="Investimento"
        tooltip="Investimento total no período"
        :value="kpis.investimento?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :previousDelta="previousDeltas.investimento"
        :loading="loading"
        hideMeta
      />
      <GtmScorecard
        label="Prospects"
        tooltip="Total de leads captados no período"
        :value="kpis.leads?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.leads?.provisionado ?? null"
        :meta="kpis.leads?.meta ?? null"
        :delta="kpis.leads?.delta ?? null"
        :previousDelta="previousDeltas.leads"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="MQL"
        tooltip="Leads qualificados pelo marketing que demonstraram interesse real"
        :value="kpis.mql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.mql?.provisionado ?? null"
        :meta="kpis.mql?.meta ?? null"
        :delta="kpis.mql?.delta ?? null"
        :previousDelta="previousDeltas.mql"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="SQL"
        tooltip="Leads aceitos por vendas com reunião agendada"
        :value="kpis.sql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sql?.provisionado ?? null"
        :meta="kpis.sql?.meta ?? null"
        :delta="kpis.sql?.delta ?? null"
        :previousDelta="previousDeltas.sql"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="SAL"
        tooltip="Reuniões realizadas com o prospect"
        :value="kpis.sal?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sal?.provisionado ?? null"
        :meta="kpis.sal?.meta ?? null"
        :delta="kpis.sal?.delta ?? null"
        :previousDelta="previousDeltas.sal"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="Commit"
        tooltip="Contratos assinados no período"
        :value="kpis.commit?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.commit?.provisionado ?? null"
        :meta="kpis.commit?.meta ?? null"
        :delta="kpis.commit?.delta ?? null"
        :previousDelta="previousDeltas.commit"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="Avg Ticket"
        tooltip="Valor médio por contrato (TCV / Commits)"
        :value="kpis.avgTicket?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.avgTicket?.provisionado ?? null"
        :meta="kpis.avgTicket?.meta ?? null"
        :delta="kpis.avgTicket?.delta ?? null"
        :previousDelta="previousDeltas.avgTicket"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="TCV"
        tooltip="Receita total contratada no período (Total Contract Value)"
        :value="kpis.booking?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.booking?.provisionado ?? null"
        :meta="kpis.booking?.meta ?? null"
        :delta="kpis.booking?.delta ?? null"
        :previousDelta="previousDeltas.booking"
        :loading="loading"
        :greenThreshold="colorThresholds.green"
        :yellowThreshold="colorThresholds.yellow"
      />
      <GtmScorecard
        label="ROAS Booking"
        tooltip="Retorno sobre investimento (TCV / Investimento)"
        :value="kpis.roas_booking?.value ?? null"
        :formatter="formatRoas"
        :previousDelta="previousDeltas.roas_booking"
        :loading="loading"
        hideMeta
      />
      <GtmScorecard
        label="ROAS Fee"
        tooltip="Retorno sobre investimento em fee (Fee / Investimento)"
        :value="kpis.roas_fee?.value ?? null"
        :formatter="formatRoas"
        :previousDelta="previousDeltas.roas_fee"
        :loading="loading"
        hideMeta
      />
    </div>

    <!-- Funnel Table -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">{{ tableTitle }}</h3>
        <VToggleGroup v-model="tableDrilldown" :options="drilldownOptions" />
      </div>
      <GtmFunnelTable :tiers="currentTiers" :loading="loading" />
    </div>

    <!-- Marketing & Vendas Toggle -->
    <div class="mv-toggle-wrapper">
      <VToggleGroup v-model="mvView" :options="mvViewOptions" />
    </div>

    <!-- Agrupada: Analista + Canal -->
    <div v-if="mvView === 'agrupada'" class="mv-sections">
      <MvSectionTable
        title="Visão por Analista"
        icon="users"
        type="analyst"
        nameLabel="Analista"
        :mode="analistaMode"
        :rows="mvAnalistaRows"
        :loading="loading"
        sortable
      >
        <template #header-actions>
          <VToggleGroup v-model="analistaMode" :options="analistaModeOptions" />
        </template>
      </MvSectionTable>
      <MvSectionTable
        title="Visão por Canal"
        icon="radio-tower"
        type="canal"
        :rows="mvCanalData"
        :loading="loading"
        sortable
      />
    </div>

    <!-- Lista: Listagem de Prospects -->
    <MvListagemTable
      v-if="mvView === 'lista'"
      :rows="mvListagemData"
      :loading="loading"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatNumber, formatCurrencyAbbrev, formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import GtmScorecard from './components/GtmScorecard.vue'
import GtmFunnelTable from './components/GtmFunnelTable.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import MvSectionTable from '../MarketingVendas/components/MvSectionTable.vue'
import MvListagemTable from '../MarketingVendas/components/MvListagemTable.vue'
import { MOCK_DATA, CANAIS, MESES, QUARTERS } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('gtm-motion')

// ── KPI Layout Toggle ───────────────────────────────────────────────────────
const kpiLayout = ref('expanded')

// ── MV Toggle ─────────────────────────────────────────────────────────────────
const mvView = ref('agrupada')
const mvViewOptions = [
  { value: 'agrupada', label: 'Agrupada' },
  { value: 'lista', label: 'Lista' }
]

// ── Analista SDR/Closer toggle ───────────────────────────────────────────────
const analistaMode = ref('sdr')
const analistaModeOptions = [
  { value: 'sdr', label: 'SDR' },
  { value: 'closer', label: 'Closer' }
]

// ── Period mode (Quarter / Mês) ──────────────────────────────────────────────
const periodMode = ref('mes')
const periodModeOptions = [
  { value: 'quarter', label: 'Quarter' },
  { value: 'mes', label: 'Mês' },
]

// ── Quarter selection ────────────────────────────────────────────────────────
function getCurrentQuarterValue() {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

function getPreviousQuarter(q) {
  const [year, qNum] = [parseInt(q.split('-Q')[0]), parseInt(q.split('-Q')[1])]
  if (qNum === 1) return `${year - 1}-Q4`
  return `${year}-Q${qNum - 1}`
}

const selectedQuarter = ref(getCurrentQuarterValue())
const compQuarter = ref(getPreviousQuarter(selectedQuarter.value))

watch(selectedQuarter, (q) => {
  compQuarter.value = getPreviousQuarter(q)
})

// ── Month range ───────────────────────────────────────────────────────────────
function getCurrentQuarterRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const qStart = Math.floor((month - 1) / 3) * 3 + 1
  const qEnd = qStart + 2
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${year}-${pad(qStart)}`
  const end = `${year}-${pad(qEnd)}`
  const vals = MESES.map((m) => m.value)
  return {
    start: vals.includes(start) ? start : (vals.find((v) => v >= start) ?? vals[0]),
    end:   vals.includes(end)   ? end   : ([...vals].reverse().find((v) => v <= end) ?? vals[vals.length - 1]),
  }
}

function shiftMonth(mes, n) {
  const [y, m] = mes.split('-').map(Number)
  const total = y * 12 + m - 1 - n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

const { start: defaultStart, end: defaultEnd } = getCurrentQuarterRange()
const mesInicial = ref(defaultStart)
const mesFinal   = ref(defaultEnd)

// Comparison month range — defaults to previous equivalent range
function calcComparisonRange(ini, fim) {
  const [y1, m1] = ini.split('-').map(Number)
  const [y2, m2] = fim.split('-').map(Number)
  const rangeSize = (y2 * 12 + m2) - (y1 * 12 + m1) + 1
  return { start: shiftMonth(ini, rangeSize), end: shiftMonth(fim, rangeSize) }
}

const { start: compStart, end: compEnd } = calcComparisonRange(defaultStart, defaultEnd)
const compMesInicial = ref(compStart)
const compMesFinal   = ref(compEnd)

const mesesFinalDisponiveis = computed(() =>
  mesesDisponiveis.value.filter((m) => m.value >= mesInicial.value)
)

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
  const comp = calcComparisonRange(val, mesFinal.value)
  compMesInicial.value = comp.start
  compMesFinal.value = comp.end
})

watch(mesFinal, (val) => {
  const comp = calcComparisonRange(mesInicial.value, val)
  compMesInicial.value = comp.start
  compMesFinal.value = comp.end
})

// Sync period mode ↔ selectors
watch(periodMode, (mode) => {
  if (mode === 'quarter') {
    // Infer quarter from current month
    const [y, m] = mesInicial.value.split('-').map(Number)
    const q = Math.ceil(m / 3)
    selectedQuarter.value = `${y}-Q${q}`
    compQuarter.value = getPreviousQuarter(selectedQuarter.value)
  } else {
    // Infer month range from current quarter
    const [year, qNum] = [parseInt(selectedQuarter.value.split('-Q')[0]), parseInt(selectedQuarter.value.split('-Q')[1])]
    const pad = (n) => String(n).padStart(2, '0')
    const qStart = (qNum - 1) * 3 + 1
    const qEnd = qStart + 2
    mesInicial.value = `${year}-${pad(qStart)}`
    mesFinal.value = `${year}-${pad(qEnd)}`
    const comp = calcComparisonRange(mesInicial.value, mesFinal.value)
    compMesInicial.value = comp.start
    compMesFinal.value = comp.end
  }
})

const fetchAllData = (forceRefresh = false) => fetchData(forceRefresh)

// ── Filters ──────────────────────────────────────────────────────────────────
const selectedChannel = ref('consolidado')
const selectedCloser  = ref('todos')
const selectedSdr     = ref('todos')
const selectedStep    = ref('todos')
const ALL_CHANNEL_IDS = CANAIS.map((c) => c.id)

const isConsolidado = computed(() => selectedChannel.value === 'consolidado')

// ── Available periods from raw data ──────────────────────────────────────────
const rawSource = computed(() => {
  const raw = data.value
  if (!raw) return null
  return Array.isArray(raw) ? raw[0]?.data : raw?.data
})

const mesesDisponiveis = computed(() => {
  const src = rawSource.value
  if (!src) return MESES
  const rows = [...(src.kpis ?? []), ...(src.funil ?? [])]
  const set = new Set(rows.map(r => r.mes).filter(Boolean))
  if (!set.size) return MESES
  return MESES.filter(m => set.has(m.value))
})

const quartersDisponiveis = computed(() => {
  const src = rawSource.value
  if (!src) return QUARTERS
  const rows = [...(src.kpis ?? []), ...(src.funil ?? [])]
  const set = new Set(rows.map(r => r.quarter).filter(Boolean))
  if (!set.size) return QUARTERS
  return QUARTERS.filter(q => set.has(q.value))
})

// Snap selections to available data when it loads
watch(mesesDisponiveis, (available) => {
  if (!available.length) return
  const vals = available.map(m => m.value)
  if (!vals.includes(mesInicial.value)) mesInicial.value = vals[vals.length - 1]
  if (!vals.includes(mesFinal.value))   mesFinal.value   = vals[vals.length - 1]
  if (mesInicial.value > mesFinal.value) mesInicial.value = mesFinal.value
}, { immediate: false })

watch(quartersDisponiveis, (available) => {
  if (!available.length) return
  const vals = available.map(q => q.value)
  if (!vals.includes(selectedQuarter.value)) selectedQuarter.value = vals[vals.length - 1]
}, { immediate: false })

// ── Closer / SDR options (from raw API data) ─────────────────────────────────
const closerOptions = computed(() => {
  const source = Array.isArray(data.value) ? data.value[0]?.data : data.value?.data
  if (!source) return []
  const set = new Set()
  for (const r of (source.funil ?? [])) {
    if (r.closer) set.add(r.closer)
  }
  return [...set].sort()
})

const sdrOptions = computed(() => {
  const source = Array.isArray(data.value) ? data.value[0]?.data : data.value?.data
  if (!source) return []
  const set = new Set()
  for (const r of (source.funil ?? [])) {
    if (r.sdr) set.add(r.sdr)
  }
  return [...set].sort()
})

const stepOptions = computed(() => {
  const source = Array.isArray(data.value) ? data.value[0]?.data : data.value?.data
  if (!source) return []
  const set = new Set()
  for (const r of (source.funil ?? [])) {
    const s = r.subcategorias ?? r.subcategoria
    if (Array.isArray(s)) { for (const item of s) if (item) set.add(item) }
    else if (s) set.add(s)
  }
  const items = [...set]
  items.sort((a, b) => {
    const ia = STEP_ORDER.indexOf(a)
    const ib = STEP_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
  return items
})

// ── Table drill-down selector ───────────────────────────────────────────────
const tableDrilldown = ref('step')
const drilldownOptions = [
  { value: 'step', label: 'Step' },
  { value: 'closer', label: 'Closer' },
  { value: 'sdr', label: 'SDR' },
]

// When drill-down changes, reset the corresponding filter to prevent ghost filtering
watch(tableDrilldown, (newVal) => {
  if (newVal === 'closer') selectedCloser.value = 'todos'
  if (newVal === 'sdr') selectedSdr.value = 'todos'
  if (newVal === 'step') selectedStep.value = 'todos'
})

// ── Data ──────────────────────────────────────────────────────────────────────
const formatRoas = (v) => {
  if (v == null || isNaN(v)) return '-'
  return v.toFixed(2).replace('.', ',') + 'x'
}

const STEP_ORDER = ['Saber', 'Ter', 'Executar', 'Sem Mapeamento']
const TIER_ORDER = ['Tiny', 'Small', 'Medium', 'Large', 'Enterprise', 'Non-ICP', 'Sem mapeamento', 'Total']
const toNum = (v) => (v === '' || v == null) ? null : Number(v)

function transformApiData(rawData, mesIni, mesFim, closer, sdr, quarter = null, step = null, drilldownBy = 'step') {
  // API retorna { data: { kpis, funil } } ou [{ data: { kpis, funil } }]
  const source = Array.isArray(rawData) ? rawData[0]?.data : rawData?.data
  if (!source) return null
  // Guard against null-payload API responses (all inner fields null)
  if (!source.kpis && !source.funil) return null

  const rawListagem = source.listagem ?? []
  const filterPeriod = quarter
    ? (r) => r.quarter === quarter
    : (r) => r.mes >= mesIni && r.mes <= mesFim
  const allKpisByMonth = (source.kpis ?? []).filter(filterPeriod)
  const allFunilByMonth = (source.funil ?? []).filter(filterPeriod)

  // Filtered by closer/sdr (for values)
  let rawKpis = allKpisByMonth
  let rawFunil = allFunilByMonth

  if (closer && closer !== 'todos') {
    const cl = closer.toLowerCase()
    rawKpis = rawKpis.filter((r) => r.closer?.toLowerCase() === cl)
    rawFunil = rawFunil.filter((r) => r.closer?.toLowerCase() === cl)
  }
  if (sdr && sdr !== 'todos') {
    const sd = sdr.toLowerCase()
    rawKpis = rawKpis.filter((r) => r.sdr?.toLowerCase() === sd)
    rawFunil = rawFunil.filter((r) => r.sdr?.toLowerCase() === sd)
  }
  if (step && step !== 'todos') {
    const st = step.toLowerCase()
    // KPIs: field is 'steps' (array)
    rawKpis = rawKpis.filter((r) => {
      const rs = r.steps
      if (!rs) return true
      if (Array.isArray(rs)) return rs.some(s => s.toLowerCase() === st)
      return String(rs).toLowerCase() === st
    })
    // Funil: field is 'subcategorias' (array) or legacy 'subcategoria' (string)
    rawFunil = rawFunil.filter((r) => {
      const rs = r.subcategorias ?? r.subcategoria
      if (!rs) return true
      if (Array.isArray(rs)) return rs.some(s => s.toLowerCase() === st)
      return String(rs).toLowerCase() === st
    })
  }
  const CANAL_LABEL = Object.fromEntries(CANAIS.map((c) => [c.id, c.label]))
  const CANAL_LABEL_TO_ID = Object.fromEntries(
    CANAIS.map(c => [c.label.toLowerCase(), c.id])
  )
  const normalizeCanal = (name) => CANAL_LABEL_TO_ID[name.toLowerCase()] ?? name

  // Sum metas per canal from all rows (before closer/sdr filtering)
  const metasByCanal = {}
  for (const row of allKpisByMonth) {
    const canal = normalizeCanal(row.canal)
    if (!metasByCanal[canal]) {
      metasByCanal[canal] = {
        leads_meta: 0, mql_meta: 0, sql_meta: 0,
        sal_meta: 0, commit_meta: 0, booking_meta: 0,
      }
    }
    const m = metasByCanal[canal]
    m.leads_meta   += toNum(row.leads_meta)   ?? 0
    m.mql_meta     += toNum(row.mql_meta)     ?? 0
    m.sql_meta     += toNum(row.sql_meta)     ?? 0
    m.sal_meta     += toNum(row.sal_meta)     ?? 0
    m.commit_meta  += toNum(row.commit_meta)  ?? 0
    m.booking_meta += toNum(row.booking_meta) ?? 0
  }

  // Group KPIs by canal, summing values from filtered rows + metas from all rows
  const kpisByCanal = {}
  for (const row of rawKpis) {
    const canal = normalizeCanal(row.canal)
    if (!kpisByCanal[canal]) {
      const cm = metasByCanal[canal] ?? {}
      kpisByCanal[canal] = {
        leads_value: 0, leads_provisionado: null, leads_meta: cm.leads_meta ?? 0,
        mql_value: 0,   mql_provisionado: null,   mql_meta: cm.mql_meta ?? 0,
        sql_value: 0,   sql_meta: cm.sql_meta ?? 0,
        sal_value: 0,   sal_meta: cm.sal_meta ?? 0,
        commit_value: 0, commit_meta: cm.commit_meta ?? 0,
        booking_value: 0, booking_meta: cm.booking_meta ?? 0,
        investimento_value: 0, fee_sum: 0,
      }
    }
    const acc = kpisByCanal[canal]
    acc.leads_value += toNum(row.leads_value) ?? 0
    const lp = toNum(row.leads_provisionado)
    if (lp != null) acc.leads_provisionado = (acc.leads_provisionado ?? 0) + lp
    acc.mql_value += toNum(row.mql_value) ?? 0
    const mp = toNum(row.mql_provisionado)
    if (mp != null) acc.mql_provisionado = (acc.mql_provisionado ?? 0) + mp
    acc.sql_value += toNum(row.sql_value) ?? 0
    acc.sal_value += toNum(row.sal_value) ?? 0
    acc.commit_value  += toNum(row.commit_value)  ?? 0
    acc.booking_value += toNum(row.booking_value) ?? 0
    const rowInvest = toNum(row.investimento_value ?? row.investimento) ?? 0
    acc.investimento_value += rowInvest
    // fee_sum = sum(roas_fee * investimento) para derivar ROAS Fee = fee_sum / total_invest
    const rowRoasFee = toNum(row.roas_fee_value ?? row.roas_fee) ?? 0
    acc.fee_sum += rowRoasFee * rowInvest
  }

  // Ensure channels with metas but no filtered value rows still appear
  for (const canal of Object.keys(metasByCanal)) {
    if (!kpisByCanal[canal]) {
      const cm = metasByCanal[canal]
      kpisByCanal[canal] = {
        leads_value: 0, leads_provisionado: null, leads_meta: cm.leads_meta ?? 0,
        mql_value: 0,   mql_provisionado: null,   mql_meta: cm.mql_meta ?? 0,
        sql_value: 0,   sql_meta: cm.sql_meta ?? 0,
        sal_value: 0,   sal_meta: cm.sal_meta ?? 0,
        commit_value: 0, commit_meta: cm.commit_meta ?? 0,
        booking_value: 0, booking_meta: cm.booking_meta ?? 0,
        investimento_value: 0, fee_sum: 0,
      }
    }
  }

  // Check if funil has tier-level data (field "tier" present in rows)
  const hasTierData = rawFunil.some((r) => r.tier != null)

  const TIER_ORDER = ['Tiny', 'Small', 'Medium', 'Large', 'Enterprise', 'Non-ICP', 'Sem mapeamento', 'Total']
  const TIER_RENAME = { 'Sem informação': 'Non-ICP' }

  // Detect data format:
  // - New format (node "1"): subcategorias is an array, one row per canal+tier+closer+sdr (no duplication)
  // - Old format: subcategoria is a string, summary rows (empty) + detail rows (non-empty) for same record
  const isNewFormat = rawFunil.some((r) => Array.isArray(r.subcategorias))

  // Group Funil by canal + tier (when tier data is available), or by canal only
  const funilByCanal = {}
  for (const row of rawFunil) {
    const canal = row.canal
    if (!funilByCanal[canal]) funilByCanal[canal] = {}

    if (hasTierData) {
      const rawTier   = row.tier ?? 'Sem mapeamento'
      const tier      = TIER_RENAME[rawTier] ?? rawTier
      const isEmpty   = !!(row.is_empty_row || row.isEmptyRow)
      const isTotalRow = !!(row.is_total || row.isTotal)
      if (!funilByCanal[canal][tier]) {
        funilByCanal[canal][tier] = {
          leads_value: 0, mql_value: 0, sql_value: 0,
          sal_value: 0, commit_value: 0, booking_value: 0,
          investimento_value: 0, roas_booking_value: 0, roas_fee_value: 0,
          isEmptyRow: isEmpty,
          isTotal: isTotalRow,
          steps: {},
        }
      }
      const acc = funilByCanal[canal][tier]
      const fLeads   = toNum(row.leads   ?? row.leads_value)   ?? 0
      const fMql     = toNum(row.mql     ?? row.mql_value)     ?? 0
      const fSql     = toNum(row.sql     ?? row.sql_value)     ?? 0
      const fSal     = toNum(row.sal     ?? row.sal_value)     ?? 0
      const fCommit  = toNum(row.commit  ?? row.commit_value)  ?? 0
      const fBooking = toNum(row.booking ?? row.booking_value) ?? 0
      const fInvest  = toNum(row.investimento ?? row.investimento_value) ?? 0
      const fRoasB   = toNum(row.roas_booking ?? row.roas_booking_value) ?? 0
      const fRoasF   = toNum(row.roas_fee ?? row.roas_fee_value)         ?? 0

      if (isNewFormat) {
        // New format: each row is unique (no duplication), always accumulate to tier totals
        acc.leads_value   += fLeads
        acc.mql_value     += fMql
        acc.sql_value     += fSql
        acc.sal_value     += fSal
        acc.commit_value  += fCommit
        acc.booking_value += fBooking
        acc.investimento_value += fInvest
        acc.roas_booking_value += fRoasB
        acc.roas_fee_value     += fRoasF

        // Step drilldown: distribute row metrics to each subcategoria in the array
        if (drilldownBy === 'step') {
          const subs = row.subcategorias ?? []
          for (const subKey of subs) {
            if (!subKey) continue
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, roas_booking: 0, roas_fee: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.roas_booking  += fRoasB
            sa.roas_fee      += fRoasF
          }
        } else {
          // Closer/SDR drilldown
          const subKey = drilldownBy === 'closer' ? row.closer
            : drilldownBy === 'sdr' ? row.sdr : null
          if (subKey) {
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, roas_booking: 0, roas_fee: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.roas_booking  += fRoasB
            sa.roas_fee      += fRoasF
          }
        }
      } else {
        // Old format: summary rows (subcategoria="") for tier totals,
        // detail rows (subcategoria="Saber" etc.) for step breakdown
        const subVal = row.subcategoria ?? ''
        const isSummaryRow = !subVal

        if (isSummaryRow) {
          acc.leads_value   += fLeads
          acc.mql_value     += fMql
          acc.sql_value     += fSql
          acc.sal_value     += fSal
          acc.commit_value  += fCommit
          acc.booking_value += fBooking
          acc.investimento_value += fInvest
          acc.roas_booking_value += fRoasB
          acc.roas_fee_value     += fRoasF
        }

        if (drilldownBy === 'step' && !isSummaryRow) {
          if (!acc.steps[subVal]) {
            acc.steps[subVal] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, roas_booking: 0, roas_fee: 0 }
          }
          const sa = acc.steps[subVal]
          sa.leads   += fLeads
          sa.mql     += fMql
          sa.sql     += fSql
          sa.sal     += fSal
          sa.commit  += fCommit
          sa.booking += fBooking
          sa.investimento  += fInvest
          sa.roas_booking  += fRoasB
          sa.roas_fee      += fRoasF
        } else if (drilldownBy !== 'step' && isSummaryRow) {
          const subKey = drilldownBy === 'closer' ? row.closer
            : drilldownBy === 'sdr' ? row.sdr : null
          if (subKey) {
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, roas_booking: 0, roas_fee: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.roas_booking  += fRoasB
            sa.roas_fee      += fRoasF
          }
        }
      }
    } else {
      // No tier data: aggregate canal totals
      if (!funilByCanal[canal].__total) {
        funilByCanal[canal].__total = {
          leads_value: 0, mql_value: 0, sql_value: 0,
          sal_value: 0, commit_value: 0, booking_value: 0,
        }
      }
      const acc = funilByCanal[canal].__total
      acc.leads_value   += toNum(row.leads_value)   ?? 0
      acc.mql_value     += toNum(row.mql_value)     ?? 0
      acc.sql_value     += toNum(row.sql_value)     ?? 0
      acc.sal_value     += toNum(row.sal_value)     ?? 0
      acc.commit_value  += toNum(row.commit_value)  ?? 0
      acc.booking_value += toNum(row.booking_value) ?? 0
    }
  }

  // Build channels map
  const channels = {}
  const allCanals = new Set([...Object.keys(kpisByCanal), ...Object.keys(funilByCanal)])

  for (const canal of allCanals) {
    const k = kpisByCanal[canal] ?? {}

    const commitVal   = k.commit_value  ?? 0
    const commitMeta  = k.commit_meta   ?? 0
    const bookingVal  = k.booking_value ?? 0
    const bookingMeta = k.booking_meta  ?? 0

    const kpis = {
      leads:   { value: k.leads_value ?? 0, provisionado: k.leads_provisionado, meta: k.leads_meta ?? 0, delta: null },
      mql:     { value: k.mql_value   ?? 0, provisionado: k.mql_provisionado,   meta: k.mql_meta   ?? 0, delta: null },
      sql:     { value: k.sql_value   ?? 0, provisionado: null, meta: k.sql_meta   ?? 0, delta: null },
      sal:     { value: k.sal_value   ?? 0, provisionado: null, meta: k.sal_meta   ?? 0, delta: null },
      commit:  { value: commitVal,          provisionado: null, meta: commitMeta,         delta: null },
      avgTicket: {
        value:        commitVal  > 0 ? Math.round(bookingVal  / commitVal)  : null,
        provisionado: null,
        meta:         commitMeta > 0 ? Math.round(bookingMeta / commitMeta) : null,
        delta: null,
      },
      booking: { value: bookingVal, provisionado: null, meta: bookingMeta, delta: null },
      investimento: { value: k.investimento_value ?? 0, provisionado: null, meta: null, delta: null },
      roas_booking: { value: (k.investimento_value ?? 0) > 0 ? bookingVal / k.investimento_value : 0, provisionado: null, meta: null, delta: null },
      roas_fee:     { value: (k.investimento_value ?? 0) > 0 ? (k.fee_sum ?? 0) / k.investimento_value : 0, provisionado: null, meta: null, delta: null },
    }

    let tiers
    const canalFunil = funilByCanal[canal] ?? {}

    if (hasTierData) {
      // Build tier rows — include ALL tiers from data (not just hardcoded)
      tiers = []
      let totLeads = 0, totMql = 0, totSql = 0, totSal = 0, totCommit = 0, totBooking = 0, totInvest = 0, totFeeProd = 0

      // Collect all tier names from data, sort by TIER_ORDER (unknown tiers go before Total)
      const allTierNames = Object.keys(canalFunil).filter(t => t !== 'Total' && !canalFunil[t]?.isTotal)
      allTierNames.sort((a, b) => {
        const ia = TIER_ORDER.indexOf(a)
        const ib = TIER_ORDER.indexOf(b)
        return (ia === -1 ? TIER_ORDER.length - 1 : ia) - (ib === -1 ? TIER_ORDER.length - 1 : ib)
      })

      for (const tierName of allTierNames) {
        const t = canalFunil[tierName]
        if (!t) continue

        if (t.isEmptyRow) {
          const eInv = t.investimento_value
          const eFee = t.roas_fee_value * eInv
          tiers.push({
            tier: tierName, leads: t.leads_value, mql: t.mql_value, investimento: eInv,
            roas_booking: eInv > 0 ? t.booking_value / eInv : 0,
            roas_fee: eInv > 0 ? eFee / eInv : 0,
            isEmptyRow: true,
          })
          totLeads   += t.leads_value
          totMql     += t.mql_value
          totSql     += t.sql_value
          totSal     += t.sal_value
          totCommit  += t.commit_value
          totBooking += t.booking_value
          totInvest  += eInv
          totFeeProd += eFee
          continue
        }

        const fl  = t.leads_value
        const fm  = t.mql_value
        const fs  = t.sql_value
        const fsal = t.sal_value
        const fc  = t.commit_value
        const fb  = t.booking_value
        const fi  = t.investimento_value
        // fee_product for weighted ROAS Fee aggregation
        const tierFeeProd = t.roas_fee_value * fi

        const cr1v = fl   > 0 ? (fm  / fl)   * 100 : 0
        const cr2v = fm   > 0 ? (fs  / fm)   * 100 : 0
        const cr3v = fs   > 0 ? (fsal / fs)  * 100 : 0
        const cr4v = fsal > 0 ? (fc  / fsal) * 100 : 0
        const mwv  = fm   > 0 ? (fc  / fm)   * 100 : 0

        const steps = Object.entries(t.steps).map(([name, s]) => {
          const sInv = s.investimento ?? 0
          return {
            name, leads: s.leads, mql: s.mql, sql: s.sql,
            sal: s.sal, commit: s.commit, booking: s.booking,
            investimento: sInv,
            roas_booking: sInv > 0 ? (s.booking ?? 0) / sInv : 0,
            roas_fee: sInv > 0 ? ((s.roas_fee ?? 0) * sInv) / sInv : 0,
          }
        })
        if (drilldownBy === 'step') {
          steps.sort((a, b) => {
            const ia = STEP_ORDER.indexOf(a.name)
            const ib = STEP_ORDER.indexOf(b.name)
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
          })
        }

        tiers.push({
          tier: tierName,
          leads: fl, mql: fm, sql: fs, sal: fsal, commit: fc, booking: fb,
          investimento: fi,
          roas_booking: fi > 0 ? fb / fi : 0,
          roas_fee: fi > 0 ? tierFeeProd / fi : 0,
          avgTicket: fc > 0 ? Math.round(fb / fc) : 0,
          cr1:    { val: cr1v, color: crColor(cr1v, 70, 50) },
          cr2:    { val: cr2v, color: crColor(cr2v, 25, 15) },
          cr3:    { val: cr3v, color: crColor(cr3v, 80, 65) },
          cr4:    { val: cr4v, color: crColor(cr4v, 20, 12) },
          mqlWon: { val: mwv,  color: crColor(mwv,  5,  3)  },
          steps,
        })

        totLeads   += fl;   totMql    += fm;   totSql  += fs
        totSal     += fsal; totCommit += fc;   totBooking += fb
        totInvest  += fi;   totFeeProd += tierFeeProd
      }

      // Add Total row
      const tcr1 = totLeads   > 0 ? (totMql    / totLeads)   * 100 : 0
      const tcr2 = totMql     > 0 ? (totSql    / totMql)     * 100 : 0
      const tcr3 = totSql     > 0 ? (totSal    / totSql)     * 100 : 0
      const tcr4 = totSal     > 0 ? (totCommit / totSal)     * 100 : 0
      const tmw  = totMql     > 0 ? (totCommit / totMql)     * 100 : 0
      tiers.push({
        tier: 'Total',
        leads: totLeads, mql: totMql, sql: totSql, sal: totSal,
        commit: totCommit, booking: totBooking,
        investimento: totInvest,
        roas_booking: totInvest > 0 ? totBooking / totInvest : 0,
        roas_fee: totInvest > 0 ? totFeeProd / totInvest : 0,
        avgTicket: totCommit > 0 ? Math.round(totBooking / totCommit) : 0,
        cr1:    { val: tcr1, color: crColor(tcr1, 70, 50) },
        cr2:    { val: tcr2, color: crColor(tcr2, 25, 15) },
        cr3:    { val: tcr3, color: crColor(tcr3, 80, 65) },
        cr4:    { val: tcr4, color: crColor(tcr4, 20, 12) },
        mqlWon: { val: tmw,  color: crColor(tmw,  5,  3)  },
        isTotal: true,
      })
    } else {
      // No tier data: one aggregated row per canal (canal label as tier name)
      const f = canalFunil.__total ?? {}
      const fl  = f.leads_value   ?? 0
      const fm  = f.mql_value     ?? 0
      const fs  = f.sql_value     ?? 0
      const fsal = f.sal_value    ?? 0
      const fc  = f.commit_value  ?? 0
      const fb  = f.booking_value ?? 0

      const cr1v = fl   > 0 ? (fm  / fl)   * 100 : 0
      const cr2v = fm   > 0 ? (fs  / fm)   * 100 : 0
      const cr3v = fs   > 0 ? (fsal / fs)  * 100 : 0
      const cr4v = fsal > 0 ? (fc  / fsal) * 100 : 0
      const mwv  = fm   > 0 ? (fc  / fm)   * 100 : 0

      tiers = [{
        tier:      CANAL_LABEL[canal] ?? canal,
        leads: fl, mql: fm, sql: fs, sal: fsal, commit: fc, booking: fb,
        avgTicket: fc > 0 ? Math.round(fb / fc) : 0,
        cr1:    { val: cr1v, color: crColor(cr1v, 70, 50) },
        cr2:    { val: cr2v, color: crColor(cr2v, 25, 15) },
        cr3:    { val: cr3v, color: crColor(cr3v, 80, 65) },
        cr4:    { val: cr4v, color: crColor(cr4v, 20, 12) },
        mqlWon: { val: mwv,  color: crColor(mwv,  5,  3)  },
        isTotal: true,
        investimento: 0, roas_booking: 0, roas_fee: 0,
      }]
    }

    channels[canal] = { kpis, tiers }
  }

  // Parse agrupadas (JSON string or array)
  let agrupadas = source.agrupadas ?? []
  if (typeof agrupadas === 'string') {
    try { agrupadas = JSON.parse(agrupadas) } catch { agrupadas = [] }
  }
  // Filter agrupadas by period and closer/sdr
  agrupadas = agrupadas.filter(filterPeriod)
  if (closer && closer !== 'todos') {
    const cl = closer.toLowerCase()
    agrupadas = agrupadas.filter((r) => r.closer?.toLowerCase() === cl)
  }
  if (sdr && sdr !== 'todos') {
    const sd = sdr.toLowerCase()
    agrupadas = agrupadas.filter((r) => r.sdr?.toLowerCase() === sd)
  }
  if (step && step !== 'todos') {
    const st = step.toLowerCase()
    agrupadas = agrupadas.filter((r) => {
      const rs = r.step ?? r.subcategoria
      if (!rs) return true
      return rs.toLowerCase() === st
    })
  }

  // Extract taxa (color thresholds per canal/month)
  const rawTaxa = source.taxa ?? []

  return { channels, listagem: rawListagem, rawKpis, rawFunil: rawFunil.filter(r => !r.is_empty_row && !r.is_total), agrupadas, taxa: rawTaxa }
}

const useMockData = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.has('mock-data')
})

const resolvedData = computed(() => {
  if (useMockData.value) return MOCK_DATA
  if (data.value) {
    if (periodMode.value === 'quarter') {
      return transformApiData(data.value, null, null, selectedCloser.value, selectedSdr.value, selectedQuarter.value, selectedStep.value, tableDrilldown.value)
    }
    return transformApiData(data.value, mesInicial.value, mesFinal.value, selectedCloser.value, selectedSdr.value, null, selectedStep.value, tableDrilldown.value)
  }
  if (import.meta.env.DEV) return MOCK_DATA
  return null
})

// Comparison period data
const comparisonData = computed(() => {
  if (useMockData.value || !data.value) return null
  if (periodMode.value === 'quarter') {
    return transformApiData(data.value, null, null, selectedCloser.value, selectedSdr.value, compQuarter.value, selectedStep.value, tableDrilldown.value)
  }
  return transformApiData(data.value, compMesInicial.value, compMesFinal.value, selectedCloser.value, selectedSdr.value, null, selectedStep.value, tableDrilldown.value)
})

// Build channel dropdown options dynamically from API data only
const channelOptions = computed(() => {
  const source = resolvedData.value
  if (!source?.channels) return []
  return Object.keys(source.channels).map(id => ({ id, label: id }))
})

const activeChannelIds = computed(() => {
  if (!isConsolidado.value) return [selectedChannel.value]
  const source = resolvedData.value
  return source?.channels ? Object.keys(source.channels) : ALL_CHANNEL_IDS
})

function crColor(val, green, yellow) {
  return val >= green ? 'green' : val >= yellow ? 'yellow' : 'red'
}

// Keys that are derived ratios (not summed across channels)
const DERIVED_KEYS = new Set(['roas_booking', 'roas_fee'])

// Aggregate KPIs from active channels
const kpis = computed(() => {
  const source = resolvedData.value
  if (!source) return {}
  const sum = {}
  for (const channelId of activeChannelIds.value) {
    const chKpis = source.channels?.[channelId]?.kpis ?? {}
    for (const [key, kpi] of Object.entries(chKpis)) {
      if (key === 'avgTicket' || DERIVED_KEYS.has(key)) continue
      if (!sum[key]) sum[key] = { value: 0, provisionado: null, meta: null, delta: null }
      sum[key].value += kpi.value ?? 0
      if (kpi.provisionado != null) sum[key].provisionado = (sum[key].provisionado ?? 0) + kpi.provisionado
      if (kpi.meta       != null) sum[key].meta          = (sum[key].meta       ?? 0) + kpi.meta
    }
  }
  // ROAS = computed from aggregated totals
  const totalInvest = sum.investimento?.value ?? 0
  const totalBooking = sum.booking?.value ?? 0
  sum.roas_booking = { value: totalInvest > 0 ? totalBooking / totalInvest : 0, provisionado: null, meta: null, delta: null }
  // ROAS Fee: back-compute from per-channel fee_sum (roas_fee * invest per row)
  let totalFee = 0
  for (const channelId of activeChannelIds.value) {
    const chRoasFee = source.channels?.[channelId]?.kpis?.roas_fee?.value ?? 0
    const chInvest = source.channels?.[channelId]?.kpis?.investimento?.value ?? 0
    totalFee += chRoasFee * chInvest
  }
  sum.roas_fee = { value: totalInvest > 0 ? totalFee / totalInvest : 0, provisionado: null, meta: null, delta: null }
  // avgTicket = booking / commit (weighted average)
  const commitVal  = sum.commit?.value ?? 0
  const commitMeta = sum.commit?.meta  ?? 0
  const bookingVal = sum.booking?.value ?? 0
  const bookingMeta = sum.booking?.meta ?? 0
  sum.avgTicket = {
    value:       commitVal  > 0 ? Math.round(bookingVal  / commitVal)  : null,
    provisionado: null,
    meta:        commitMeta > 0 ? Math.round(bookingMeta / commitMeta) : null,
    delta: null,
  }
  return sum
})

// ── Previous period deltas (comparison KPIs) ────────────────────────────────
const previousDeltas = computed(() => {
  const compData = comparisonData.value
  if (!compData?.channels) return {}

  // Aggregate comparison KPIs from active channels
  const compSum = {}
  for (const channelId of activeChannelIds.value) {
    const chKpis = compData.channels?.[channelId]?.kpis ?? {}
    for (const [key, kpi] of Object.entries(chKpis)) {
      if (key === 'avgTicket' || DERIVED_KEYS.has(key)) continue
      if (!compSum[key]) compSum[key] = { value: 0 }
      compSum[key].value += kpi.value ?? 0
    }
  }
  // ROAS from totals
  const compInvest = compSum.investimento?.value ?? 0
  const compBooking = compSum.booking?.value ?? 0
  compSum.roas_booking = { value: compInvest > 0 ? compBooking / compInvest : 0 }
  let compFee = 0
  for (const channelId of activeChannelIds.value) {
    const chRoasFee = compData.channels?.[channelId]?.kpis?.roas_fee?.value ?? 0
    const chInvest = compData.channels?.[channelId]?.kpis?.investimento?.value ?? 0
    compFee += chRoasFee * chInvest
  }
  compSum.roas_fee = { value: compInvest > 0 ? compFee / compInvest : 0 }
  // avgTicket = booking / commit
  const compCommitVal = compSum.commit?.value ?? 0
  const compBookingVal = compSum.booking?.value ?? 0
  compSum.avgTicket = { value: compCommitVal > 0 ? Math.round(compBookingVal / compCommitVal) : null }

  // Calculate % change: (current - previous) / previous * 100
  // When no previous data exists, return 0 to avoid nonsensical numbers
  const current = kpis.value
  const hasAnyPrevData = Object.values(compSum).some(v => v.value > 0)
  if (!hasAnyPrevData) {
    const zeros = {}
    for (const key of Object.keys(current)) zeros[key] = 0
    return zeros
  }

  const result = {}
  for (const key of Object.keys(current)) {
    const curVal = current[key]?.value
    const prevVal = compSum[key]?.value
    if (curVal != null && prevVal != null && prevVal > 0) {
      const pct = ((curVal - prevVal) / prevVal) * 100
      result[key] = Math.abs(pct) > 1500 ? 0 : pct
    } else {
      result[key] = 0
    }
  }
  return result
})

// ── Color thresholds from taxa (dynamic green/yellow cutoffs) ────────────────
const colorThresholds = computed(() => {
  const source = resolvedData.value
  const taxa = source?.taxa ?? []
  if (!taxa.length) return { green: 100, yellow: 85 } // fallback: hardcoded

  const mesIni = mesInicial.value
  const mesFim = mesFinal.value
  const channels = activeChannelIds.value

  // Filter taxa by month range and active channels
  const normalizeCanal = (name) => {
    const CANAL_LABEL_TO_ID = Object.fromEntries(CANAIS.map(c => [c.label.toLowerCase(), c.id]))
    return CANAL_LABEL_TO_ID[name.toLowerCase()] ?? name
  }
  const filtered = taxa.filter((t) => {
    const mes = t.mes ?? t['Mês']
    if (!mes || mes < mesIni || mes > mesFim) return false
    const canal = normalizeCanal(t.canal ?? t['Canal'] ?? '')
    return channels.includes(canal)
  })

  if (!filtered.length) return { green: 100, yellow: 85 }

  // Group by cor, collect "% abaixo da meta" values
  const verdeValues = []
  const amareloValues = []
  for (const t of filtered) {
    const cor = (t.cor ?? '').toLowerCase()
    const pct = Number(t['% abaixo da meta'] ?? t.pct_abaixo_meta ?? 0)
    if (cor === 'verde') verdeValues.push(pct)
    else if (cor === 'amarelo') amareloValues.push(pct)
  }

  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

  const verdeAvg = avg(verdeValues)
  const amareloAvg = avg(amareloValues)

  // green threshold = 100 - verde_pct (e.g., 10 → 90%)
  // yellow threshold = 100 - amarelo_pct (e.g., 25 → 75%)
  return {
    green: verdeAvg != null ? 100 - verdeAvg : 100,
    yellow: amareloAvg != null ? 100 - amareloAvg : 85,
  }
})

const legendGreenText = computed(() => {
  const t = colorThresholds.value
  if (t.green >= 100) return 'Meta atingida ou superada'
  const pctBelow = Math.round(100 - t.green)
  return `Até ${pctBelow}% abaixo da meta`
})

const legendYellowText = computed(() => {
  const t = colorThresholds.value
  const greenPct = Math.round(100 - t.green)
  const yellowPct = Math.round(100 - t.yellow)
  return `De ${greenPct}% a ${yellowPct}% abaixo da meta`
})

const legendRedText = computed(() => {
  const t = colorThresholds.value
  const yellowPct = Math.round(100 - t.yellow)
  return `Mais de ${yellowPct}% abaixo da meta`
})

// Aggregate tiers from active channels
const currentTiers = computed(() => {
  const source = resolvedData.value
  if (!source) return []
  const tierMap   = {}
  // Track fee_sum per tier and step (fee = roas_fee * investimento per source row)
  const tierFeeSums = {} // { tierName: { fee: number, steps: { name: number } } }
  for (const channelId of activeChannelIds.value) {
    const tiers = source.channels?.[channelId]?.tiers ?? []
    for (const row of tiers) {
      if (!tierFeeSums[row.tier]) tierFeeSums[row.tier] = { fee: 0, steps: {} }
      const fs = tierFeeSums[row.tier]
      fs.fee += (row.roas_fee ?? 0) * (row.investimento ?? 0)

      if (!tierMap[row.tier]) {
        tierMap[row.tier] = { ...row, roas_booking: 0, roas_fee: 0 }
        if (row.steps?.length) {
          tierMap[row.tier].steps = row.steps.map(s => ({ ...s, roas_booking: 0, roas_fee: 0 }))
          for (const s of row.steps) {
            fs.steps[s.name] = (fs.steps[s.name] ?? 0) + (s.roas_fee ?? 0) * (s.investimento ?? 0)
          }
        }
      } else {
        const ex = tierMap[row.tier]
        if (row.isEmptyRow) {
          ex.leads   = (ex.leads   ?? 0) + (row.leads   ?? 0)
          ex.mql     = (ex.mql     ?? 0) + (row.mql     ?? 0)
          ex.sql     = (ex.sql     ?? 0) + (row.sql     ?? 0)
          ex.sal     = (ex.sal     ?? 0) + (row.sal     ?? 0)
          ex.commit  = (ex.commit  ?? 0) + (row.commit  ?? 0)
          ex.booking = (ex.booking ?? 0) + (row.booking ?? 0)
          ex.investimento = (ex.investimento ?? 0) + (row.investimento ?? 0)
          continue
        }
        ex.leads   = (ex.leads   ?? 0) + (row.leads   ?? 0)
        ex.mql     = (ex.mql     ?? 0) + (row.mql     ?? 0)
        ex.sql     = (ex.sql     ?? 0) + (row.sql     ?? 0)
        ex.sal     = (ex.sal     ?? 0) + (row.sal     ?? 0)
        ex.commit  = (ex.commit  ?? 0) + (row.commit  ?? 0)
        ex.booking = (ex.booking ?? 0) + (row.booking ?? 0)
        ex.investimento = (ex.investimento ?? 0) + (row.investimento ?? 0)
        ex.avgTicket = ex.commit > 0 ? Math.round(ex.booking / ex.commit) : 0
        const cr1v = ex.leads  > 0 ? (ex.mql    / ex.leads)  * 100 : 0
        const cr2v = ex.mql    > 0 ? (ex.sql    / ex.mql)    * 100 : 0
        const cr3v = ex.sql    > 0 ? (ex.sal    / ex.sql)    * 100 : 0
        const cr4v = ex.sal    > 0 ? (ex.commit / ex.sal)    * 100 : 0
        const mwv  = ex.mql    > 0 ? (ex.commit / ex.mql)    * 100 : 0
        ex.cr1    = { val: cr1v, color: crColor(cr1v, 70, 50) }
        ex.cr2    = { val: cr2v, color: crColor(cr2v, 25, 15) }
        ex.cr3    = { val: cr3v, color: crColor(cr3v, 80, 65) }
        ex.cr4    = { val: cr4v, color: crColor(cr4v, 20, 12) }
        ex.mqlWon = { val: mwv,  color: crColor(mwv,   5,  3) }
        // Merge steps by name
        if (row.steps?.length > 0) {
          if (!ex.steps?.length) {
            ex.steps = row.steps.map(s => ({ ...s, roas_booking: 0, roas_fee: 0 }))
            for (const s of row.steps) {
              fs.steps[s.name] = (fs.steps[s.name] ?? 0) + (s.roas_fee ?? 0) * (s.investimento ?? 0)
            }
          } else {
            for (const step of row.steps) {
              fs.steps[step.name] = (fs.steps[step.name] ?? 0) + (step.roas_fee ?? 0) * (step.investimento ?? 0)
              const exStep = ex.steps.find(s => s.name === step.name)
              if (exStep) {
                exStep.leads   = (exStep.leads   ?? 0) + (step.leads   ?? 0)
                exStep.mql     = (exStep.mql     ?? 0) + (step.mql     ?? 0)
                exStep.sql     = (exStep.sql     ?? 0) + (step.sql     ?? 0)
                exStep.sal     = (exStep.sal     ?? 0) + (step.sal     ?? 0)
                exStep.commit  = (exStep.commit  ?? 0) + (step.commit  ?? 0)
                exStep.booking = (exStep.booking ?? 0) + (step.booking ?? 0)
                exStep.investimento = (exStep.investimento ?? 0) + (step.investimento ?? 0)
              } else {
                ex.steps.push({ ...step, roas_booking: 0, roas_fee: 0 })
              }
            }
          }
        }
      }
    }
  }
  // Compute ROAS from aggregated totals: booking/investimento
  for (const [name, ex] of Object.entries(tierMap)) {
    const inv = ex.investimento ?? 0
    ex.roas_booking = inv > 0 ? (ex.booking ?? 0) / inv : 0
    const fs = tierFeeSums[name]
    ex.roas_fee = inv > 0 && fs ? fs.fee / inv : 0
    if (ex.steps?.length) {
      for (const s of ex.steps) {
        const sInv = s.investimento ?? 0
        s.roas_booking = sInv > 0 ? (s.booking ?? 0) / sInv : 0
        s.roas_fee = sInv > 0 && fs?.steps[s.name] ? fs.steps[s.name] / sInv : 0
      }
    }
  }
  // Sort steps within each tier by STEP_ORDER
  for (const tier of Object.values(tierMap)) {
    if (tier.steps?.length > 1) {
      tier.steps.sort((a, b) => {
        const ia = STEP_ORDER.indexOf(a.name)
        const ib = STEP_ORDER.indexOf(b.name)
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
      })
    }
  }
  // Include ALL tiers from data, sorted by TIER_ORDER (unknown tiers before Total)
  const allNames = Object.keys(tierMap)
  allNames.sort((a, b) => {
    const ia = TIER_ORDER.indexOf(a)
    const ib = TIER_ORDER.indexOf(b)
    return (ia === -1 ? TIER_ORDER.length - 1 : ia) - (ib === -1 ? TIER_ORDER.length - 1 : ib)
  })
  return allNames.map(name => tierMap[name])
})

const tableTitle = computed(() => {
  if (isConsolidado.value) return 'Consolidado — Todos os Canais'
  return CANAIS.find((c) => c.id === selectedChannel.value)?.label ?? selectedChannel.value
})

// ── Marketing & Vendas data (from GTM Motion webhook) ────────────────────────
const MV_CANAL_META = {
  'Lead Broker': { icon: 'users', color: '#14b8a6' },
  'Black Box':   { icon: 'box',   color: '#888'    },
  'Eventos':     { icon: 'calendar', color: '#a855f7' },
  'Outros':      { icon: 'more-horizontal', color: '#666' },
}

function mvAvgTicketColor(v) {
  if (v >= 30000) return 'green'
  if (v >= 15000) return 'yellow'
  if (v >= 5000)  return 'orange'
  return 'red'
}

function mvAddConversions(row) {
  const cr1 = row.leads     > 0 ? (row.agendadas  / row.leads)     * 100 : 0
  const cr2 = row.agendadas > 0 ? (row.realizadas / row.agendadas) * 100 : 0
  const cr3 = row.realizadas > 0 ? (row.contratos / row.realizadas) * 100 : 0
  const avg = row.contratos > 0 ? Math.round(row.booking / row.contratos) : 0
  return {
    ...row,
    cr1: { val: cr1, color: crColor(cr1, 70, 50) },
    cr2: { val: cr2, color: crColor(cr2, 50, 30) },
    cr3: { val: cr3, color: crColor(cr3, 20, 10) },
    avgTicket: avg,
    avgTicketColor: mvAvgTicketColor(avg),
  }
}

// Read agrupadas fields (keys with accents/spaces from N8N)
function readAgrupada(r) {
  return {
    leads:      Number(r['Leads'] ?? r.leads_value ?? r.Leads ?? 0) || 0,
    agendadas:  Number(r['Reuniões Agendadas'] ?? r.reunioes_agendadas_value ?? 0) || 0,
    realizadas: Number(r['Reuniões Realizadas'] ?? r.reunioes_realizadas_value ?? 0) || 0,
    contratos:  Number(r['Contratos Assinados'] ?? r.contratos_assinados_value ?? 0) || 0,
    booking:    Number(r['Booking'] ?? r.booking_value ?? 0) || 0,
    avgTicket:  Number(r['Avg. Ticket'] ?? r.avg_ticket ?? 0) || 0,
  }
}

// SDR view: group agrupadas by SDR → leads, agendadas, realizadas
const mvAnalistaSdrData = computed(() => {
  const source = resolvedData.value
  if (!source?.agrupadas?.length) return []
  const map = new Map()
  for (const r of source.agrupadas) {
    const name = r.sdr
    if (!name || name.toLowerCase() === 'sem sdr') continue
    if (!map.has(name)) {
      map.set(name, { name, avatar: name.slice(0, 2).toUpperCase(), leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
    }
    const a = map.get(name)
    const v = readAgrupada(r)
    a.leads      += v.leads
    a.agendadas  += v.agendadas
    a.realizadas += v.realizadas
  }
  return [...map.values()].map(mvAddConversions)
})

// Closer view: group agrupadas by Closer → contratos, booking, avgTicket
const mvAnalistaCloserData = computed(() => {
  const source = resolvedData.value
  if (!source?.agrupadas?.length) return []
  const map = new Map()
  for (const r of source.agrupadas) {
    const name = r.closer
    if (!name || name.toLowerCase() === 'sem closer') continue
    if (!map.has(name)) {
      map.set(name, { name, avatar: name.slice(0, 2).toUpperCase(), leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
    }
    const a = map.get(name)
    const v = readAgrupada(r)
    a.contratos  += v.contratos
    a.booking    += v.booking
  }
  // Agrupadas may lack booking — supplement from KPIs (same dimensions)
  for (const kpi of (source.rawKpis ?? [])) {
    const name = kpi.closer
    if (!name || name.toLowerCase() === 'sem closer') continue
    if (map.has(name)) {
      map.get(name).booking += Number(kpi.booking_value) || 0
    }
  }
  return [...map.values()].map(mvAddConversions)
})

const mvAnalistaRows = computed(() =>
  analistaMode.value === 'sdr' ? mvAnalistaSdrData.value : mvAnalistaCloserData.value
)

const mvCanalData = computed(() => {
  const source = resolvedData.value
  if (!source?.agrupadas?.length) return []
  const map = new Map()
  for (const r of source.agrupadas) {
    const canal = r.canal
    if (!canal) continue
    if (!map.has(canal)) {
      const meta = MV_CANAL_META[canal] ?? { icon: 'radio-tower', color: '#888' }
      map.set(canal, { name: canal, icon: meta.icon, iconColor: meta.color, leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
    }
    const c = map.get(canal)
    const v = readAgrupada(r)
    c.leads      += v.leads
    c.agendadas  += v.agendadas
    c.realizadas += v.realizadas
    c.contratos  += v.contratos
    c.booking    += v.booking
  }
  // Agrupadas may lack booking — supplement from KPIs (same dimensions)
  for (const kpi of (source.rawKpis ?? [])) {
    const canal = kpi.canal
    if (!canal) continue
    if (map.has(canal)) {
      map.get(canal).booking += Number(kpi.booking_value) || 0
    }
  }
  return [...map.values()].map(mvAddConversions)
})

const mvListagemData = computed(() => resolvedData.value?.listagem ?? [])

const lastUpdateTime = ref(null)

async function handleRefresh() {
  loading.value = true

  // Step 1: POST trigger webhook para N8N regenerar os dados
  try {
    const res = await fetch('/api/gtm-motion/trigger-update')
    if (!res.ok) console.warn('[GTM Motion] Webhook de atualização retornou', res.status)
  } catch (err) {
    console.warn('[GTM Motion] Falha ao chamar webhook de atualização:', err.message)
  }

  // Step 2: GET dados atualizados (bypassa cache)
  await fetchAllData(true)
  lastUpdateTime.value = formatDateTime(new Date().toISOString())
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(async () => {
  // Auto-load: apenas GET dos dados (sem POST trigger)
  await fetchAllData()
  lastUpdateTime.value = formatDateTime(new Date().toISOString())
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
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

/* Legend tooltip */
.legend-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.legend-icon {
  width: 16px;
  height: 16px;
  color: #666;
  transition: color 0.2s;
}

.legend-wrapper:hover .legend-icon {
  color: #999;
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
  min-width: 220px;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.legend-wrapper:hover .legend-tooltip {
  display: block;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #ccc;
  padding: 3px 0;
  white-space: nowrap;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
  flex-shrink: 0;
}

.legend-dot--green {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.legend-dot--yellow {
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.4);
}

.legend-dot--red {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

/* Period range */
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

/* Filters Bar */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 10px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
  min-width: 160px;
  margin: 0 16px 4px 0;
  max-width: 300px;
  transition: max-width 0.3s ease, min-width 0.3s ease, opacity 0.25s ease,
              padding 0.3s ease, margin 0.3s ease, border-color 0.3s ease;
}

.filter-group.filter-hide {
  max-width: 0;
  min-width: 0;
  padding: 0;
  margin: 0;
  border-color: transparent;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}

.filter-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.filter-select {
  flex: 1;
  min-width: 0;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.filter-select option,
.month-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 8px 12px;
}

/* KPI Layout Toggle */
.kpi-layout-toggle {
  display: inline-flex;
  gap: 0;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 3px;
  margin-left: auto;
}

.layout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border: none;
  background: transparent;
  color: #444;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.layout-btn:hover {
  color: #777;
  background: rgba(255, 255, 255, 0.04);
}

.layout-btn.active {
  color: #aaa;
  background: #252525;
}

/* KPI Grid — expanded (2 rows) */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

/* KPI Grid — compact (1 row) */
.kpi-grid--compact {
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
}

.kpi-grid--compact :deep(.gtm-scorecard) {
  padding: 10px 10px;
  gap: 4px;
}

.kpi-grid--compact :deep(.scorecard-value) {
  font-size: 18px;
  min-height: 24px;
}

.kpi-grid--compact :deep(.scorecard-label) {
  font-size: 10px;
}

.kpi-grid--compact :deep(.scorecard-sub) {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.kpi-grid--compact :deep(.sub-row) {
  gap: 2px;
}

.kpi-grid--compact :deep(.sub-key) {
  font-size: 9px;
  color: #666;
}

.kpi-grid--compact :deep(.sub-val) {
  font-size: 10px;
  font-weight: 600;
}

@media (max-width: 1600px) {
  .kpi-grid--compact { grid-template-columns: repeat(5, 1fr); }
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .kpi-grid--compact { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .kpi-grid--compact { grid-template-columns: repeat(2, 1fr); }
}

/* Table section */
.table-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

/* Marketing & Vendas section */
.mv-toggle-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 20px;
}

.mv-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

</style>
