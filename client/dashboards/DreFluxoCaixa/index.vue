<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header sticky-header">
      <div class="header-title">
        <h1 class="main-title">Raio-X Financeiro</h1>
        <span class="main-subtitle">{{ periodoLabel }}</span>
      </div>
      <div class="main-actions">
        <VToggleGroup :options="VISUALIZACOES" v-model="currentView" />
        <VToggleGroup :options="periodModeOptions" v-model="periodMode" />
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
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="filters-bar">
      <div class="filters-bar-left">
        <VToggleGroup :options="CAIXA_MODES" v-model="caixaMode" />
        <label v-if="currentView === 'caixa' && caixaMode === 'realizado'" class="previsto-switch">
          <input type="checkbox" v-model="previstoEnabled" />
          <span class="previsto-label">Previsto</span>
        </label>
      </div>
      <div class="filters-bar-right">
        <div class="kpi-value-toggle">
          <button class="layout-btn" :class="{ active: kpiValueMode === 'abbrev' }" @click="kpiValueMode = 'abbrev'" aria-label="Valores abreviados">
            <span class="toggle-hint" data-tip="Valores abreviados (ex: R$ 25k)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">K</text></svg>
            </span>
          </button>
          <button class="layout-btn" :class="{ active: kpiValueMode === 'full' }" @click="kpiValueMode = 'full'" aria-label="Valores completos">
            <span class="toggle-hint" data-tip="Valores completos (ex: R$ 25.000,00)">
              <svg width="22" height="14" viewBox="0 0 22 14" fill="none"><text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">0,0</text></svg>
            </span>
          </button>
        </div>
        <div class="kpi-layout-toggle">
          <button class="layout-btn" :class="{ active: kpiLayout === 'compact' }" @click="kpiLayout = 'compact'" aria-label="1 linha">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="5" width="14" height="4" rx="1" fill="currentColor"/></svg>
          </button>
          <button class="layout-btn" :class="{ active: kpiLayout === 'expanded' }" @click="kpiLayout = 'expanded'" aria-label="2 linhas">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="1" width="14" height="4" rx="1" fill="currentColor"/><rect x="0" y="9" width="14" height="4" rx="1" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>


    <!-- KPI Cards -->
    <div class="kpi-all-grid" :class="{ 'kpi-all-grid--compact': kpiLayout === 'compact' }">
      <!-- Executive KPIs -->
      <div v-for="kpi in mainKpis" :key="kpi.label" class="kpi-card">
        <div class="kpi-label">
          <span class="kpi-label-text">{{ kpi.label }}</span>
          <span v-if="kpi.tooltip" class="info-hint" :data-tip="kpi.tooltip">?</span>
        </div>
        <div v-if="loading" class="kpi-value"><span class="spinner"></span></div>
        <div v-else class="kpi-value" :class="{ 'value-negative': kpi.value < 0 }">
          {{ kpiCurrencyFormatter(kpi.value) }}
        </div>
        <div v-if="!loading && kpi.pctLabel" class="kpi-badge" :class="kpi.badgeClass">
          {{ kpi.pctLabel }}
        </div>
        <div v-if="!loading && kpi.delta !== null && kpi.delta !== undefined" class="kpi-delta" :class="kpi.deltaClass">
          Δ Período Anterior {{ kpi.deltaLabel }}
        </div>
        <div v-if="!loading && kpi.planDelta !== null && kpi.planDelta !== undefined" class="kpi-delta kpi-delta-plan" :class="kpi.planDeltaClass">
          Δ Vs Planejado {{ kpi.planDeltaLabel }}
        </div>
      </div>

      <!-- Expense KPIs -->
      <div v-for="item in expenseItems" :key="item.label" class="kpi-card">
        <div class="kpi-label">
          <span class="kpi-label-text">{{ item.label }}</span>
          <span v-if="item.tooltip" class="info-hint" :data-tip="item.tooltip">?</span>
        </div>
        <div v-if="loading" class="kpi-value">—</div>
        <template v-else>
          <div class="kpi-value">{{ item.pct }}</div>
          <div class="kpi-sub-value">{{ item.abs }}</div>
          <div v-if="item.delta !== null && item.delta !== undefined" class="kpi-delta" :class="item.deltaClass">
            Δ Período Anterior {{ item.deltaLabel }}
          </div>
          <div v-if="item.planDelta !== null && item.planDelta !== undefined" class="kpi-delta kpi-delta-plan" :class="item.planDeltaClass">
            Δ Vs Planejado {{ item.planDeltaLabel }}
          </div>
        </template>
      </div>
    </div>

    <!-- Sankey Chart -->
    <VChartCard title="Diagrama de Sankey" :loading="loading && !resolvedData">
      <template v-if="resolvedData">
        <DreSankeyChart :financeData="resolvedData" :key="chartKey" />

        <!-- Margin Strip -->
        <div v-if="marginIndicators.length" class="margin-strip">
          <template v-for="(m, i) in marginIndicators" :key="m.label">
            <div class="margin-strip-item">
              <span class="margin-strip-label">{{ m.label }}</span>
              <span class="margin-strip-value" :class="{ 'value-negative': m.value < 0 }">{{ m.formattedValue }}</span>
              <span class="margin-strip-hint" :data-tip="m.formula">?</span>
            </div>
            <div v-if="i < marginIndicators.length - 1" class="margin-strip-sep"></div>
          </template>
        </div>

        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-dot legend-green"></span>
            Entradas / Saldo Acumulado
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-orange-red"></span>
            Deduções / Custos / Despesas
          </div>
        </div>
      </template>
    </VChartCard>
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    message="Deseja atualizar os dados do Raio-X Financeiro? A atualização leva poucos segundos."
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
import { formatCurrency, formatCurrencyAbbrev } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VChartCard from '../../components/charts/VChartCard.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import DreSankeyChart from './components/DreSankeyChart.vue'
import { VISUALIZACOES, CAIXA_MODES, MESES as MESES_FALLBACK, QUARTERS as QUARTERS_FALLBACK } from './mock-data.js'

const currentView = ref('competencia')
const caixaMode = ref('realizado')
const previstoEnabled = ref(false)

// caixaMode changes → reset previsto
watch(caixaMode, () => { previstoEnabled.value = false })
watch(currentView, () => { previstoEnabled.value = false })

const effectiveView = computed(() => {
  const sub = caixaMode.value
  if (sub === 'planejado') return 'planejado'
  if (currentView.value === 'competencia') return 'dre'
  return previstoEnabled.value ? 'caixa-previsto' : 'caixa-realizado'
})

// ── KPI Layout Toggle ───────────────────────────────────────────────────────
const kpiLayout = ref('expanded')

// ── KPI Value Mode (abbreviated / full) ────────────────────────────────────
const kpiValueMode = ref('abbrev')
const kpiCurrencyFormatter = computed(() =>
  kpiValueMode.value === 'full' ? formatCurrency : formatCurrencyAbbrev
)

// ── Period Mode (Quarter / Mês) ─────────────────────────────────────────────
const periodMode = ref('mes')
const periodModeOptions = [
  { value: 'quarter', label: 'Quarter' },
  { value: 'mes', label: 'Mês' },
]

const pad = (n) => String(n).padStart(2, '0')

function getCurrentQuarterRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const qStart = Math.floor((month - 1) / 3) * 3 + 1
  const qEnd = qStart + 2
  const start = `${year}-${pad(qStart)}`
  const end = `${year}-${pad(qEnd)}`
  const valores = MESES_FALLBACK.map((m) => m.value)
  return {
    start: valores.includes(start) ? start : (valores.find((v) => v >= start) ?? valores[0]),
    end: valores.includes(end) ? end : ([...valores].reverse().find((v) => v <= end) ?? valores[valores.length - 1]),
  }
}

const { start: defaultStart, end: defaultEnd } = getCurrentQuarterRange()
const mesInicial = ref(defaultStart)
const mesFinal = ref(defaultEnd)

const { data, loading, error, fetchData } = useDashboardData('raio-x-financeiro')

const MES_LABELS = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' }

const mesesDisponiveis = computed(() => {
  const source = getParsedSource()
  if (!source) return MESES_FALLBACK
  const set = new Set()
  for (const view of Object.values(source)) {
    for (const ym of Object.keys(view)) set.add(ym)
  }
  if (!set.size) return MESES_FALLBACK
  return [...set].sort().reverse().map(ym => {
    const [y, m] = ym.split('-')
    return { value: ym, label: `${MES_LABELS[m] || m} ${y}` }
  })
})

const quartersDisponiveisFromData = computed(() => {
  const months = mesesDisponiveis.value.map(m => m.value)
  if (!months.length) return [...QUARTERS_FALLBACK].reverse()
  const qSet = new Set()
  for (const ym of months) {
    const [y, m] = ym.split('-').map(Number)
    const q = Math.ceil(m / 3)
    qSet.add(`${y}-Q${q}`)
  }
  return [...qSet].sort().reverse().map(q => ({ value: q, label: q.replace('-', ' ').replace('Q', 'Q') }))
})

const mesesFinalDisponiveis = computed(() =>
  mesesDisponiveis.value.filter((m) => m.value >= mesInicial.value)
)

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
})

watch(mesesDisponiveis, (available) => {
  if (!available.length) return
  const vals = available.map(m => m.value)
  if (!vals.includes(mesInicial.value)) mesInicial.value = vals[vals.length - 1]
  if (!vals.includes(mesFinal.value)) mesFinal.value = vals[0]
})

// ── Quarter selection ───────────────────────────────────────────────────────
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

function quarterToMonthRange(q) {
  const [year, qNum] = [parseInt(q.split('-Q')[0]), parseInt(q.split('-Q')[1])]
  const qStart = (qNum - 1) * 3 + 1
  const qEnd = qStart + 2
  return { start: `${year}-${pad(qStart)}`, end: `${year}-${pad(qEnd)}` }
}

const selectedQuarter = ref(getCurrentQuarterValue())

const quartersDisponiveis = computed(() => quartersDisponiveisFromData.value)

watch(selectedQuarter, () => {
  // Sync month range when quarter changes
  const { start, end } = quarterToMonthRange(selectedQuarter.value)
  mesInicial.value = start
  mesFinal.value = end
})

// ── Period mode sync ────────────────────────────────────────────────────────
watch(periodMode, (mode) => {
  if (mode === 'quarter') {
    const [y, m] = mesInicial.value.split('-').map(Number)
    const q = Math.ceil(m / 3)
    selectedQuarter.value = `${y}-Q${q}`
  } else {
    const { start, end } = quarterToMonthRange(selectedQuarter.value)
    mesInicial.value = start
    mesFinal.value = end
  }
})

// ── Comparison period (for MoM deltas) ──────────────────────────────────────
function shiftMonth(ym, months) {
  const [y, m] = ym.split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  const newY = Math.floor(total / 12)
  const newM = (total % 12) + 1
  return `${newY}-${pad(newM)}`
}

const compPeriod = computed(() => {
  if (periodMode.value === 'quarter') {
    const prev = getPreviousQuarter(selectedQuarter.value)
    return quarterToMonthRange(prev)
  }
  // Month mode: shift back by the same range size
  const [y1, m1] = mesInicial.value.split('-').map(Number)
  const [y2, m2] = mesFinal.value.split('-').map(Number)
  const rangeSize = (y2 * 12 + m2) - (y1 * 12 + m1) + 1
  return {
    start: shiftMonth(mesInicial.value, rangeSize),
    end: shiftMonth(mesFinal.value, rangeSize),
  }
})

const currentViewLabel = computed(
  () => VISUALIZACOES.find((v) => v.value === currentView.value)?.label ?? ''
)

const periodoLabel = computed(() => {
  if (periodMode.value === 'quarter') {
    return QUARTERS_FALLBACK.find((q) => q.value === selectedQuarter.value)?.label ?? selectedQuarter.value
  }
  if (mesInicial.value === mesFinal.value) {
    return MESES_FALLBACK.find((m) => m.value === mesInicial.value)?.label ?? ''
  }
  const ini = MESES_FALLBACK.find((m) => m.value === mesInicial.value)?.label ?? mesInicial.value
  const fim = MESES_FALLBACK.find((m) => m.value === mesFinal.value)?.label ?? mesFinal.value
  return `${ini} – ${fim}`
})

const chartKey = computed(() =>
  periodMode.value === 'quarter'
    ? `${effectiveView.value}-${selectedQuarter.value}`
    : `${effectiveView.value}-${mesInicial.value}-${mesFinal.value}`
)

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function parseApiResponse(apiData) {
  const rows = apiData?.data ?? apiData?.[0]?.data ?? []
  const parsed = {}
  for (const row of rows) {
    const { ano, mes, visualizacao, row_number, quarter, ...fields } = row
    const yearMonth = `${ano}-${String(mes).padStart(2, '0')}`
    if (!parsed[visualizacao]) parsed[visualizacao] = {}
    const normalized = {}
    for (const [key, value] of Object.entries(fields)) {
      normalized[snakeToCamel(key)] = Number(value) || 0
    }
    parsed[visualizacao][yearMonth] = normalized
  }
  return parsed
}

function agregaMeses(source, viewKey, de, ate) {
  const mesesNoRange = mesesDisponiveis.value.filter((m) => m.value >= de && m.value <= ate)
  const viewData = source[viewKey] ?? {}
  return mesesNoRange.reduce((acc, m) => {
    const d = viewData[m.value]
    if (!d) return acc
    for (const key of Object.keys(d)) {
      acc[key] = (acc[key] ?? 0) + d[key]
    }
    return acc
  }, {})
}

function getParsedSource() {
  return data.value ? parseApiResponse(data.value) : null
}

const resolvedData = computed(() => {
  const source = getParsedSource()
  if (!source) return null
  if (periodMode.value === 'quarter') {
    const { start, end } = quarterToMonthRange(selectedQuarter.value)
    return agregaMeses(source, effectiveView.value, start, end)
  }
  return agregaMeses(source, effectiveView.value, mesInicial.value, mesFinal.value)
})

const comparisonData = computed(() => {
  const source = getParsedSource()
  if (!source) return null
  return agregaMeses(source, effectiveView.value, compPeriod.value.start, compPeriod.value.end)
})

// ── Δ Vs Planejado ───────────────────────────────────────────────────────────
const planejadoData = computed(() => {
  const source = getParsedSource()
  if (!source) return null
  if (periodMode.value === 'quarter') {
    const { start, end } = quarterToMonthRange(selectedQuarter.value)
    return agregaMeses(source, 'planejado', start, end)
  }
  return agregaMeses(source, 'planejado', mesInicial.value, mesFinal.value)
})

// ── MoM Deltas ──────────────────────────────────────────────────────────────
const KPI_FIELDS = [
  'receitaLiquida', 'lucroBruto', 'ebitda', 'lucroLiquido',
  'custosOperacionais', 'despesasComerciais', 'despesasAdministrativas',
  'despesasGerais', 'despesaFinanceira',
]

const previousDeltas = computed(() => {
  const cur = resolvedData.value
  const prev = comparisonData.value
  if (!cur || !prev) return {}

  const hasAnyPrev = KPI_FIELDS.some((k) => prev[k])
  if (!hasAnyPrev) return {}

  const result = {}
  for (const key of KPI_FIELDS) {
    const curVal = cur[key] ?? 0
    const prevVal = prev[key] ?? 0
    if (prevVal !== 0) {
      const pct = ((curVal - prevVal) / Math.abs(prevVal)) * 100
      result[key] = Math.abs(pct) > 1500 ? null : pct
    } else {
      result[key] = null
    }
  }
  return result
})

const planejadoDeltas = computed(() => {
  const cur = resolvedData.value
  const plan = planejadoData.value
  if (!cur || !plan || caixaMode.value !== 'realizado') return {}

  const result = {}
  for (const key of KPI_FIELDS) {
    const curVal = cur[key] ?? 0
    const planVal = plan[key] ?? 0
    if (planVal !== 0) {
      const pct = ((curVal - planVal) / Math.abs(planVal)) * 100
      result[key] = Math.abs(pct) > 1500 ? null : pct
    } else {
      result[key] = null
    }
  }
  return result
})

function formatDelta(pct) {
  if (pct == null) return null
  const sign = pct > 0 ? '+' : ''
  return sign + pct.toFixed(1).replace('.', ',') + '%'
}

function deltaClass(pct) {
  if (pct == null) return 'delta-neutral'
  if (pct > 0) return 'delta-green'
  if (pct < 0) return 'delta-red'
  return 'delta-neutral'
}

// --- Semaphore helpers ---
function pctBadgeClass(pct, thresholds) {
  if (pct < thresholds.red) return 'badge-red'
  if (pct < thresholds.yellow) return 'badge-yellow'
  return 'badge-green'
}

function formatPct(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

function safePct(numerator, denominator) {
  if (!denominator) return null
  return (numerator / denominator) * 100
}

// --- Main KPI cards ---
const mainKpis = computed(() => {
  const d = resolvedData.value
  const deltas = previousDeltas.value
  const pdeltas = planejadoDeltas.value

  if (!d) return [
    { label: 'Receita Líquida', tooltip: 'Receita total após deduções (impostos, devoluções)', value: 0, pctLabel: '—', badgeClass: 'badge-neutral', delta: null, deltaLabel: null, deltaClass: '', planDelta: null, planDeltaLabel: null, planDeltaClass: '' },
    { label: 'Lucro Bruto',     tooltip: 'Receita Líquida menos CSP', value: 0, pctLabel: '—', badgeClass: 'badge-neutral', delta: null, deltaLabel: null, deltaClass: '', planDelta: null, planDeltaLabel: null, planDeltaClass: '' },
    { label: 'EBITDA',          tooltip: 'Lucro antes de juros, impostos, depreciação e amortização', value: 0, pctLabel: '—', badgeClass: 'badge-neutral', delta: null, deltaLabel: null, deltaClass: '', planDelta: null, planDeltaLabel: null, planDeltaClass: '' },
    { label: 'Lucro Líquido',   tooltip: 'Resultado final após todas as deduções e despesas', value: 0, pctLabel: '—', badgeClass: 'badge-neutral', delta: null, deltaLabel: null, deltaClass: '', planDelta: null, planDeltaLabel: null, planDeltaClass: '' },
  ]

  const lbPct = safePct(d.lucroBruto, d.receitaLiquida)
  const ebitdaPct = safePct(d.ebitda, d.receitaLiquida)
  const llPct = safePct(d.lucroLiquido, d.receitaLiquida)

  return [
    {
      label: 'Receita Líquida',
      tooltip: 'Receita total após deduções (impostos, devoluções)',
      value: d.receitaLiquida,
      pctLabel: null,
      badgeClass: null,
      delta: deltas.receitaLiquida ?? null,
      deltaLabel: formatDelta(deltas.receitaLiquida),
      deltaClass: deltaClass(deltas.receitaLiquida),
      planDelta: pdeltas.receitaLiquida ?? null,
      planDeltaLabel: formatDelta(pdeltas.receitaLiquida),
      planDeltaClass: deltaClass(pdeltas.receitaLiquida),
    },
    {
      label: 'Lucro Bruto',
      tooltip: 'Receita Líquida menos CSP',
      value: d.lucroBruto,
      pctLabel: `${formatPct(lbPct)} da Rec. Líquida`,
      badgeClass: d.lucroBruto < 0 ? 'badge-red' : pctBadgeClass(lbPct, { red: 50, yellow: 60 }),
      delta: deltas.lucroBruto ?? null,
      deltaLabel: formatDelta(deltas.lucroBruto),
      deltaClass: deltaClass(deltas.lucroBruto),
      planDelta: pdeltas.lucroBruto ?? null,
      planDeltaLabel: formatDelta(pdeltas.lucroBruto),
      planDeltaClass: deltaClass(pdeltas.lucroBruto),
    },
    {
      label: 'EBITDA',
      tooltip: 'Lucro antes de juros, impostos, depreciação e amortização',
      value: d.ebitda,
      pctLabel: `${formatPct(ebitdaPct)} da Rec. Líquida`,
      badgeClass: d.ebitda < 0 ? 'badge-red' : pctBadgeClass(ebitdaPct, { red: 20, yellow: 25 }),
      delta: deltas.ebitda ?? null,
      deltaLabel: formatDelta(deltas.ebitda),
      deltaClass: deltaClass(deltas.ebitda),
      planDelta: pdeltas.ebitda ?? null,
      planDeltaLabel: formatDelta(pdeltas.ebitda),
      planDeltaClass: deltaClass(pdeltas.ebitda),
    },
    {
      label: 'Lucro Líquido',
      tooltip: 'Resultado final após todas as deduções e despesas',
      value: d.lucroLiquido,
      pctLabel: `${formatPct(llPct)} da Rec. Líquida`,
      badgeClass: d.lucroLiquido < 0 ? 'badge-red' : pctBadgeClass(llPct, { red: 10, yellow: 15 }),
      delta: deltas.lucroLiquido ?? null,
      deltaLabel: formatDelta(deltas.lucroLiquido),
      deltaClass: deltaClass(deltas.lucroLiquido),
      planDelta: pdeltas.lucroLiquido ?? null,
      planDeltaLabel: formatDelta(pdeltas.lucroLiquido),
      planDeltaClass: deltaClass(pdeltas.lucroLiquido),
    },
  ]
})

// Baselines H4 (% da Receita Líquida)
const EXPENSE_BASELINES = {
  custosOperacionais:      29.36,
  despesasComerciais:      24.39,
  despesasAdministrativas: 18.90,
  despesasGerais:           6.03,
  despesaFinanceira:         3.00,
}

// --- Expense breakdown pills ---
const expenseItems = computed(() => {
  const d = resolvedData.value
  const rl = d?.receitaLiquida || 0

  const items = [
    { label: '% CSP',       key: 'custosOperacionais',      value: d?.custosOperacionais ?? 0, tooltip: 'Percentual de CSP sobre a Receita Líquida' },
    { label: '% Desp. Comerciais',        key: 'despesasComerciais',       value: d?.despesasComerciais ?? 0, tooltip: 'Percentual de despesas comerciais sobre a Receita Líquida' },
    { label: '% Desp. Administrativas',   key: 'despesasAdministrativas',  value: d?.despesasAdministrativas ?? 0, tooltip: 'Percentual de despesas administrativas sobre a Receita Líquida' },
    { label: '% Desp. Gerais',            key: 'despesasGerais',           value: d?.despesasGerais ?? 0, tooltip: 'Percentual de despesas gerais sobre a Receita Líquida' },
    { label: '% Despesa Financeira',      key: 'despesaFinanceira',        value: d?.despesaFinanceira ?? 0, tooltip: 'Percentual de despesas financeiras sobre a Receita Líquida' },
  ]

  const deltas = previousDeltas.value
  const pdeltas = planejadoDeltas.value

  return items.map((item) => ({
    label: item.label,
    tooltip: item.tooltip,
    pct: rl ? formatPct(safePct(item.value, rl)) : '—',
    abs: kpiCurrencyFormatter.value(item.value),
    delta: deltas[item.key] ?? null,
    deltaLabel: formatDelta(deltas[item.key]),
    deltaClass: deltaClass(deltas[item.key]),
    planDelta: pdeltas[item.key] ?? null,
    planDeltaLabel: formatDelta(pdeltas[item.key]),
    planDeltaClass: deltaClass(pdeltas[item.key]),
  }))
})

// ── Margin Indicators ────────────────────────────────────────────────────────
const marginIndicators = computed(() => {
  const d = resolvedData.value
  if (!d) return []
  const mb = safePct(d.lucroBruto, d.receitaLiquida)
  const mo = safePct(d.ebitda, d.receitaLiquida)
  const ml = safePct(d.lucroLiquido, d.receitaLiquida)
  return [
    { label: 'Margem Bruta',       value: mb, formattedValue: formatPct(mb), formula: 'Lucro Bruto / Rec. Líquida' },
    { label: 'Margem Operacional', value: mo, formattedValue: formatPct(mo), formula: 'EBITDA / Rec. Líquida' },
    { label: 'Margem Líquida',     value: ml, formattedValue: formatPct(ml), formula: 'Lucro Líquido / Rec. Líquida' },
  ]
})

// ── Update confirmation modal state ──────────────────────────────────────────
const refreshing = ref(false)
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

async function handleRefresh() {
  // Check if another update is already in progress
  try {
    const statusRes = await fetch('/api/update-status/raio-x-financeiro')
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
    const res = await fetch('/api/raio-x-financeiro/trigger-update')
    if (!res.ok) {
      if (res.status === 409) {
        refreshing.value = false
        showUpdatingModal.value = true
        return
      }
      console.warn('[Raio-X Financeiro] Webhook de atualização retornou', res.status)
    }
  } catch (err) {
    console.warn('[Raio-X Financeiro] Falha ao chamar webhook de atualização:', err.message)
  }

  // Step 2: GET dados atualizados (bypassa cache)
  refreshing.value = false
  await fetchData(true)
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #0d0d0d;
  margin-left: calc(-1 * var(--spacing-lg));
  margin-right: calc(-1 * var(--spacing-lg));
  padding-left: var(--spacing-lg);
  padding-right: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.main-subtitle {
  font-size: 13px;
  color: #666;
}

.main-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

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
  font-family: 'Ubuntu', sans-serif;
  font-size: 13px;
}

/* ── Filters Bar ── */
.filters-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #111;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-left: calc(-1 * var(--spacing-lg));
  margin-right: calc(-1 * var(--spacing-lg));
  padding: 8px var(--spacing-lg);
  margin-bottom: 16px;
}

.filters-bar-left,
.filters-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Previsto checkbox ── */
.previsto-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #888;
  padding: 4px 10px;
  background: #1a1a1a;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.15s;
}

.previsto-switch:hover {
  border-color: rgba(255,255,255,0.12);
  color: #bbb;
}

.previsto-switch input[type="checkbox"] {
  accent-color: #ff0000;
  width: 13px;
  height: 13px;
  cursor: pointer;
}

.previsto-label {
  font-weight: 500;
  letter-spacing: 0.3px;
}

/* ── Margin Strip (inline, below Sankey) ── */
.margin-strip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin: 16px 0 4px;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.margin-strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 28px;
}

.margin-strip-sep {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.07);
  flex-shrink: 0;
}

.margin-strip-label {
  font-size: 11px;
  font-weight: 500;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.margin-strip-value {
  font-size: 16px;
  font-weight: 700;
  color: #10b981;
  letter-spacing: 0.3px;
}

.margin-strip-value.value-negative {
  color: #ef4444;
}

.margin-strip-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  border: 1px solid #2a2a2a;
  cursor: help;
  flex-shrink: 0;
}

.margin-strip-hint:hover {
  color: #aaa;
  border-color: #555;
}

.margin-strip-hint:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  font-size: 11px;
  font-weight: 400;
  padding: 5px 9px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 60;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

/* ── Δ Vs Planejado (styled slightly different) ── */
.kpi-delta-plan {
  font-style: italic;
  opacity: 0.9;
}

/* ── KPI Value Toggle ── */
.kpi-value-toggle {
  display: inline-flex;
  gap: 0;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 3px;
}

.kpi-layout-toggle {
  display: inline-flex;
  gap: 0;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 3px;
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

.toggle-hint {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-hint:hover::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  font-size: 11px;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 50;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* ── Unified KPI Grid — expanded (2 rows: 4 + 5) ── */
.kpi-all-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

/* First 4 items (exec KPIs) span first row as 4 cols */
.kpi-all-grid > .kpi-card:nth-child(-n+4) {
  grid-column: span 1;
}

/* Force first 4 into a 4-col row, last 5 into a 5-col row */
.kpi-all-grid:not(.kpi-all-grid--compact) {
  grid-template-columns: repeat(20, 1fr);
}

.kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(-n+4) {
  grid-column: span 5;
}

.kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(n+5) {
  grid-column: span 4;
}

/* ── KPI Grid — compact (all 9 in 1 row) ── */
.kpi-all-grid--compact {
  grid-template-columns: repeat(9, 1fr);
  gap: 6px;
}

.kpi-all-grid--compact > .kpi-card:nth-child(-n+4),
.kpi-all-grid--compact > .kpi-card:nth-child(n+5) {
  grid-column: span 1;
}

.kpi-all-grid--compact .kpi-card {
  padding: 10px 10px;
}

.kpi-all-grid--compact .kpi-value {
  font-size: 16px;
}

.kpi-all-grid--compact .kpi-label {
  font-size: 10px;
}

.kpi-all-grid--compact .kpi-badge {
  font-size: 10px;
  padding: 2px 6px;
}

.kpi-all-grid--compact .kpi-sub-value {
  font-size: 10px;
}

/* ── Unified KPI Card ── */
.kpi-card {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: visible;
  min-width: 0;
}

.kpi-label-text {
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  min-height: 22px;
}

.kpi-value.value-negative {
  color: #ef4444;
}

.kpi-sub-value {
  font-size: 11px;
  font-weight: 500;
  color: #888;
  margin-top: -2px;
}

.kpi-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  align-self: flex-start;
  margin-top: 2px;
}

.badge-green  { color: #10b981; background: rgba(16, 185, 129, 0.12); }
.badge-yellow { color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
.badge-red    { color: #ef4444; background: rgba(239, 68, 68, 0.12); }
.badge-neutral { color: #888; background: rgba(255, 255, 255, 0.06); }

/* ── MoM Delta ── */
.kpi-delta {
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
}

.delta-green { color: #22c55e; }
.delta-red { color: #ef4444; }
.delta-neutral { color: #888; }

/* ── Info hint tooltip (?) ── */
.info-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  color: #555;
  border: 1px solid #333;
  cursor: help;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.info-hint:hover {
  color: #ccc;
  border-color: #555;
  background: #1a1a1a;
}

.info-hint:hover::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: #1a1a1a;
  border: 1px solid #333;
  color: #ccc;
  font-size: 11px;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: normal;
  width: max-content;
  max-width: 220px;
  line-height: 1.4;
  z-index: 50;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.info-hint:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: #333;
  z-index: 51;
}

/* ── Responsive ── */
@media (max-width: 1400px) {
  .kpi-all-grid--compact {
    grid-template-columns: repeat(5, 1fr);
  }
  .kpi-all-grid--compact > .kpi-card:nth-child(-n+4),
  .kpi-all-grid--compact > .kpi-card:nth-child(n+5) {
    grid-column: span 1;
  }
}

@media (max-width: 1024px) {
  .kpi-all-grid:not(.kpi-all-grid--compact) {
    grid-template-columns: repeat(2, 1fr);
  }
  .kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(-n+4),
  .kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(n+5) {
    grid-column: span 1;
  }
  .kpi-all-grid--compact {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-all-grid:not(.kpi-all-grid--compact),
  .kpi-all-grid--compact {
    grid-template-columns: repeat(2, 1fr);
  }
  .kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(-n+4),
  .kpi-all-grid:not(.kpi-all-grid--compact) > .kpi-card:nth-child(n+5) {
    grid-column: span 1;
  }
}

/* ── Chart legend ── */
.chart-legend {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #888;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-green {
  background: #10b981;
}

.legend-orange-red {
  background: linear-gradient(to right, #fb923c, #ef4444);
}
</style>
