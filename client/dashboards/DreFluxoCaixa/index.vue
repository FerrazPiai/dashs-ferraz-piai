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
        <div class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in MESES" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinalDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Executive KPI Cards -->
    <div class="exec-kpi-grid">
      <div v-for="kpi in mainKpis" :key="kpi.label" class="exec-kpi-card">
        <div class="exec-kpi-label">{{ kpi.label }}</div>
        <div v-if="loading" class="exec-kpi-value"><span class="spinner"></span></div>
        <div v-else class="exec-kpi-value" :class="{ 'value-negative': kpi.value < 0 }">
          {{ formatCurrency(kpi.value) }}
        </div>
        <div v-if="!loading && kpi.pctLabel" class="exec-kpi-badge" :class="kpi.badgeClass">
          {{ kpi.pctLabel }}
        </div>
      </div>
    </div>

    <!-- Expense Breakdown Pills -->
    <div class="expense-row">
      <div v-for="item in expenseItems" :key="item.label" class="expense-pill">
        <div class="expense-label">{{ item.label }}</div>
        <div v-if="loading" class="expense-pct">—</div>
        <template v-else>
          <div class="expense-pct">{{ item.pct }}</div>
          <div class="expense-abs">{{ item.abs }}</div>
        </template>
      </div>
    </div>

    <!-- Sankey Chart -->
    <VChartCard title="Diagrama de Sankey" :loading="loading && !resolvedData">
      <template v-if="resolvedData">
        <DreSankeyChart :financeData="resolvedData" :key="chartKey" />
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
import { formatCurrency } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VChartCard from '../../components/charts/VChartCard.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import DreSankeyChart from './components/DreSankeyChart.vue'
import { MOCK_DATA, VISUALIZACOES, MESES } from './mock-data.js'

const currentView = ref('caixa-realizado')

function getCurrentQuarterRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const qStart = Math.floor((month - 1) / 3) * 3 + 1
  const qEnd = qStart + 2
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${year}-${pad(qStart)}`
  const end = `${year}-${pad(qEnd)}`
  const valores = MESES.map((m) => m.value)
  return {
    start: valores.includes(start) ? start : (valores.find((v) => v >= start) ?? valores[0]),
    end: valores.includes(end) ? end : ([...valores].reverse().find((v) => v <= end) ?? valores[valores.length - 1]),
  }
}

const { start: defaultStart, end: defaultEnd } = getCurrentQuarterRange()
const mesInicial = ref(defaultStart)
const mesFinal = ref(defaultEnd)

const mesesFinalDisponiveis = computed(() =>
  MESES.filter((m) => m.value >= mesInicial.value)
)

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
})

const currentViewLabel = computed(
  () => VISUALIZACOES.find((v) => v.value === currentView.value)?.label ?? ''
)

const periodoLabel = computed(() => {
  if (mesInicial.value === mesFinal.value) {
    return MESES.find((m) => m.value === mesInicial.value)?.label ?? ''
  }
  const ini = MESES.find((m) => m.value === mesInicial.value)?.label ?? mesInicial.value
  const fim = MESES.find((m) => m.value === mesFinal.value)?.label ?? mesFinal.value
  return `${ini} – ${fim}`
})

const chartKey = computed(() => `${currentView.value}-${mesInicial.value}-${mesFinal.value}`)

const { data, loading, error, fetchData } = useDashboardData('raio-x-financeiro')

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function parseApiResponse(apiData) {
  const rows = apiData?.data ?? apiData?.[0]?.data ?? []
  const parsed = {}
  for (const row of rows) {
    const { ano, mes, visualizacao, row_number, ...fields } = row
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
  const mesesNoRange = MESES.filter((m) => m.value >= de && m.value <= ate)
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

const resolvedData = computed(() => {
  const source = data.value
    ? parseApiResponse(data.value)
    : (import.meta.env.DEV ? MOCK_DATA : null)
  if (!source) return null
  return agregaMeses(source, currentView.value, mesInicial.value, mesFinal.value)
})

// --- Semaphore helpers ---
function pctBadgeClass(pct, thresholds) {
  if (pct < thresholds.red) return 'badge-red'
  if (pct < thresholds.yellow) return 'badge-yellow'
  return 'badge-green'
}

function formatPct(value, decimals = 1) {
  return `${Number(value).toFixed(decimals)}%`
}

function safePct(numerator, denominator) {
  if (!denominator) return 0
  return (numerator / denominator) * 100
}

// --- Main KPI cards ---
const mainKpis = computed(() => {
  const d = resolvedData.value
  if (!d) return [
    { label: 'Receita Líquida', value: 0, pctLabel: '—', badgeClass: 'badge-neutral' },
    { label: 'Lucro Bruto',     value: 0, pctLabel: '—', badgeClass: 'badge-neutral' },
    { label: 'EBITDA',          value: 0, pctLabel: '—', badgeClass: 'badge-neutral' },
    { label: 'Lucro Líquido',   value: 0, pctLabel: '—', badgeClass: 'badge-neutral' },
  ]

  const lbPct = safePct(d.lucroBruto, d.receitaLiquida)
  const ebitdaPct = safePct(d.ebitda, d.receitaLiquida)
  const llPct = safePct(d.lucroLiquido, d.receitaLiquida)

  return [
    {
      label: 'Receita Líquida',
      value: d.receitaLiquida,
      pctLabel: null,
      badgeClass: null,
    },
    {
      label: 'Lucro Bruto',
      value: d.lucroBruto,
      pctLabel: `${formatPct(lbPct)} da Rec. Líquida`,
      badgeClass: d.lucroBruto < 0 ? 'badge-red' : pctBadgeClass(lbPct, { red: 50, yellow: 60 }),
    },
    {
      label: 'EBITDA',
      value: d.ebitda,
      pctLabel: `${formatPct(ebitdaPct)} da Rec. Líquida`,
      badgeClass: d.ebitda < 0 ? 'badge-red' : pctBadgeClass(ebitdaPct, { red: 20, yellow: 25 }),
    },
    {
      label: 'Lucro Líquido',
      value: d.lucroLiquido,
      pctLabel: `${formatPct(llPct)} da Rec. Líquida`,
      badgeClass: d.lucroLiquido < 0 ? 'badge-red' : pctBadgeClass(llPct, { red: 10, yellow: 15 }),
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
    { label: '% Custo Operacional',       key: 'custosOperacionais',      value: d?.custosOperacionais ?? 0 },
    { label: '% Desp. Comerciais',        key: 'despesasComerciais',       value: d?.despesasComerciais ?? 0 },
    { label: '% Desp. Administrativas',   key: 'despesasAdministrativas',  value: d?.despesasAdministrativas ?? 0 },
    { label: '% Desp. Gerais',            key: 'despesasGerais',           value: d?.despesasGerais ?? 0 },
    { label: '% Despesa Financeira',      key: 'despesaFinanceira',        value: d?.despesaFinanceira ?? 0 },
  ]

  return items.map((item) => ({
    label: item.label,
    pct: rl ? formatPct(safePct(item.value, rl)) : '—',
    abs: formatCurrency(item.value),
  }))
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
  border-radius: 6px;
  padding: 4px 10px;
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
  padding: 4px 0;
  appearance: none;
  -webkit-appearance: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.month-select option {
  background: #1a1a1a;
  color: #ccc;
}

/* ── Executive KPI cards ── */
.exec-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 10px;
}

.exec-kpi-card {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 18px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exec-kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.exec-kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}

.exec-kpi-value.value-negative {
  color: #ef4444;
}

.exec-kpi-badge {
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

/* ── Expense breakdown row ── */
.expense-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.expense-pill {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.expense-pct {
  font-size: 16px;
  font-weight: 700;
  color: #ccc;
}

.expense-abs {
  font-size: 11px;
  font-weight: 500;
  color: #666;
}

.expense-label {
  font-size: 10px;
  color: #555;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .exec-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .expense-row   { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 640px) {
  .exec-kpi-grid { grid-template-columns: 1fr; }
  .expense-row   { grid-template-columns: repeat(2, 1fr); }
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
