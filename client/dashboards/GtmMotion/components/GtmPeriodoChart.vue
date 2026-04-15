<template>
  <div class="periodo-section">
    <div class="periodo-header">
      <h3 class="periodo-title">Visão por Período</h3>
      <div class="periodo-controls">
        <!-- Seletor de métricas (multi-select dropdown estilo filtro) -->
        <div class="periodo-filter" ref="metricDropdownRef">
          <label class="periodo-filter-label">Métricas</label>
          <button class="periodo-filter-btn" @click="metricDropdownOpen = !metricDropdownOpen">
            <span class="periodo-filter-value">{{ metricsSummary }}</span>
            <svg class="periodo-filter-arrow" :class="{ open: metricDropdownOpen }" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#666" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
          </button>
          <div v-if="metricDropdownOpen" class="periodo-dropdown">
            <!-- Grupo: Funil -->
            <div class="periodo-dropdown-group">Funil</div>
            <button
              v-for="m in FUNIL_METRICS"
              :key="m.key"
              class="periodo-dropdown-item"
              :class="{ active: activeMetrics.has(m.key) }"
              @click="toggleMetric(m.key)"
            >
              <span class="periodo-dropdown-dot" :style="{ backgroundColor: activeMetrics.has(m.key) ? m.color : 'transparent', borderColor: m.color }"></span>
              {{ m.label }}
            </button>
            <!-- Grupo: Monetização -->
            <div class="periodo-dropdown-group">Monetização</div>
            <button
              v-for="m in MONET_METRICS"
              :key="m.key"
              class="periodo-dropdown-item"
              :class="{ active: activeMetrics.has(m.key) }"
              @click="toggleMetric(m.key)"
            >
              <span class="periodo-dropdown-dot" :style="{ backgroundColor: activeMetrics.has(m.key) ? m.color : 'transparent', borderColor: m.color }"></span>
              {{ m.label }}
            </button>
          </div>
        </div>

        <!-- Toggle tipo de gráfico -->
        <div class="periodo-toggle-group">
          <button class="periodo-toggle-btn" :class="{ active: chartType === 'bar' }" @click="chartType = 'bar'" aria-label="Barras">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="6" width="3" height="7" rx="1" fill="currentColor"/><rect x="5.5" y="3" width="3" height="10" rx="1" fill="currentColor"/><rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg>
          </button>
          <button class="periodo-toggle-btn" :class="{ active: chartType === 'line' }" @click="chartType = 'line'" aria-label="Linhas">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="1,12 4,7 7,9 10,3 13,5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="7" r="1.5" fill="currentColor"/><circle cx="7" cy="9" r="1.5" fill="currentColor"/><circle cx="10" cy="3" r="1.5" fill="currentColor"/></svg>
          </button>
        </div>

        <!-- Botão comparar período anterior -->
        <button class="periodo-compare-btn" :class="{ active: showComparison }" @click="showComparison = !showComparison">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h12M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Δ Período Anterior
        </button>

        <!-- Toggle granularidade -->
        <VToggleGroup v-model="granularity" :options="granularityOptions" />
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="chart-loading">
        <span class="spinner spinner-lg"></span>
      </div>
      <div v-else class="chart-wrapper">
        <canvas v-if="chartLabels.length" ref="canvasRef"></canvas>
        <div v-else class="periodo-empty">
          Sem dados de período disponíveis
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import VToggleGroup from '../../../components/ui/VToggleGroup.vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  comparisonData: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

// ── Métricas ────────────────────────────────────────────────────────────────
const FUNIL_METRICS = [
  { key: 'leads',  label: 'Leads',  color: '#22c55e', isCurrency: false },
  { key: 'mql',    label: 'MQL',    color: '#f97316', isCurrency: false },
  { key: 'sql',    label: 'SQL',    color: '#fbbf24', isCurrency: false },
  { key: 'sal',    label: 'SAL',    color: '#a855f7', isCurrency: false },
  { key: 'commit', label: 'Commit', color: '#ff0000', isCurrency: false },
]

const MONET_METRICS = [
  { key: 'booking',              label: 'TCV',                color: '#06b6d4', isCurrency: true },
  { key: 'CR_monetizacao',       label: 'CR Monetização',     color: '#ec4899', isCurrency: false },
  { key: 'booking_monetizacao',  label: 'TCV Monetização',    color: '#8b5cf6', isCurrency: true },
]

const ALL_METRICS = [...FUNIL_METRICS, ...MONET_METRICS]
const METRIC_MAP = Object.fromEntries(ALL_METRICS.map(m => [m.key, m]))

// ── Estado ──────────────────────────────────────────────────────────────────
const activeMetrics = reactive(new Set(['leads', 'mql', 'sql', 'sal', 'commit']))
const chartType = ref('bar')
const showComparison = ref(false)
const granularity = ref('mes')
const metricDropdownOpen = ref(false)
const metricDropdownRef = ref(null)
const canvasRef = ref(null)
let chartInstance = null

// Detectar se alguma métrica currency está ativa (para formatar eixo Y)
const hasCurrencyActive = computed(() => ALL_METRICS.some(m => m.isCurrency && activeMetrics.has(m.key)))
const hasVolumeActive = computed(() => ALL_METRICS.some(m => !m.isCurrency && activeMetrics.has(m.key)))
const needsDualAxis = computed(() => hasCurrencyActive.value && hasVolumeActive.value)

const granularityOptions = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'quarter', label: 'Quarter' },
]

function toggleMetric(key) {
  if (activeMetrics.has(key)) {
    if (activeMetrics.size > 1) activeMetrics.delete(key)
  } else {
    activeMetrics.add(key)
  }
}

const metricsSummary = computed(() => {
  const active = ALL_METRICS.filter(m => activeMetrics.has(m.key))
  if (active.length === ALL_METRICS.length) return 'Todas'
  if (active.length === 0) return 'Nenhuma'
  if (active.length <= 3) return active.map(m => m.label).join(', ')
  return `${active.length} selecionadas`
})

// Fechar dropdown ao clicar fora
function handleClickOutside(e) {
  if (metricDropdownRef.value && !metricDropdownRef.value.contains(e.target)) {
    metricDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// ── Helpers de agrupamento ──────────────────────────────────────────────────
function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const temp = new Date(d.getTime())
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7))
  const jan4 = new Date(temp.getFullYear(), 0, 4)
  const week = 1 + Math.round(((temp - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return `${temp.getFullYear()}-S${String(Math.max(1, week)).padStart(2, '0')}`
}

function getMonthKey(dateStr) { return dateStr.substring(0, 7) }

function getQuarterKey(dateStr) {
  const [y, m] = dateStr.split('-').map(Number)
  return `${y}-Q${Math.ceil(m / 3)}`
}

function formatLabel(key, mode) {
  if (mode === 'dia') { const [, m, d] = key.split('-'); return `${d}/${m}` }
  if (mode === 'mes') {
    const ML = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' }
    const [y, m] = key.split('-')
    return `${ML[m] ?? m} ${y.slice(2)}`
  }
  return key
}

const AGGREGATE_KEYS = ['leads', 'mql', 'sql', 'sal', 'commit', 'booking', 'CR_monetizacao', 'booking_monetizacao']

function aggregateRows(rows) {
  if (!rows?.length) return { labels: [], buckets: {} }
  const getKey = granularity.value === 'dia' ? (r) => r.data
    : granularity.value === 'semana' ? (r) => getWeekKey(r.data)
    : granularity.value === 'quarter' ? (r) => getQuarterKey(r.data)
    : (r) => getMonthKey(r.data)

  const buckets = {}
  for (const row of rows) {
    const key = getKey(row)
    if (!buckets[key]) {
      const empty = {}
      for (const k of AGGREGATE_KEYS) empty[k] = 0
      buckets[key] = empty
    }
    const b = buckets[key]
    for (const k of AGGREGATE_KEYS) {
      b[k] += row[k] ?? 0
    }
  }
  const sortedKeys = Object.keys(buckets).sort()
  return {
    labels: sortedKeys.map(k => formatLabel(k, granularity.value)),
    keys: sortedKeys,
    buckets,
  }
}

// ── Dados ───────────────────────────────────────────────────────────────────
const currentAgg = computed(() => aggregateRows(props.data))
const comparisonAgg = computed(() => aggregateRows(props.comparisonData))

const chartLabels = computed(() => {
  if (!showComparison.value || !comparisonAgg.value.labels.length) return currentAgg.value.labels
  const curLen = currentAgg.value.labels.length
  const compLen = comparisonAgg.value.labels.length
  const maxLen = Math.max(curLen, compLen)
  const labels = []
  for (let i = 0; i < maxLen; i++) {
    const cur = currentAgg.value.labels[i] ?? ''
    const comp = comparisonAgg.value.labels[i] ?? ''
    labels.push(cur || comp)
  }
  return labels
})

// ── Chart rendering ─────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`
  return `R$ ${val.toLocaleString('pt-BR')}`
}

function buildDatasets() {
  const datasets = []
  const cur = currentAgg.value
  const comp = comparisonAgg.value
  const isLine = chartType.value === 'line'
  const comparing = showComparison.value && comp.labels.length > 0
  const dual = needsDualAxis.value

  for (const m of ALL_METRICS) {
    if (!activeMetrics.has(m.key)) continue

    const curData = cur.keys?.map(k => cur.buckets[k]?.[m.key] ?? 0) ?? []
    const yAxisID = dual && m.isCurrency ? 'y1' : 'y'

    datasets.push({
      label: m.label,
      data: curData,
      backgroundColor: isLine ? 'transparent' : m.color,
      borderColor: m.color,
      borderWidth: isLine ? 2.5 : 0,
      borderRadius: isLine ? 0 : 4,
      tension: 0.35,
      pointRadius: isLine ? 4 : 0,
      pointHoverRadius: isLine ? 6 : 0,
      pointBackgroundColor: m.color,
      pointBorderColor: '#141414',
      pointBorderWidth: 2,
      fill: false,
      order: 1,
      yAxisID,
    })

    if (comparing) {
      const compData = comp.keys?.map(k => comp.buckets[k]?.[m.key] ?? 0) ?? []
      while (compData.length < curData.length) compData.push(0)
      datasets.push({
        label: `${m.label} (anterior)`,
        data: compData.slice(0, curData.length),
        backgroundColor: isLine ? 'transparent' : `${m.color}40`,
        borderColor: `${m.color}80`,
        borderWidth: isLine ? 1.5 : 0,
        borderDash: isLine ? [5, 4] : [],
        borderRadius: isLine ? 0 : 4,
        tension: 0.35,
        pointRadius: isLine ? 3 : 0,
        pointHoverRadius: isLine ? 5 : 0,
        pointBackgroundColor: `${m.color}80`,
        pointBorderColor: '#141414',
        pointBorderWidth: 1,
        fill: false,
        order: 2,
        yAxisID,
      })
    }
  }
  return datasets
}

function createChart() {
  if (!canvasRef.value || !window.Chart) return
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const ctx = canvasRef.value.getContext('2d')
  const isLine = chartType.value === 'line'
  const datasets = buildDatasets()
  const dual = needsDualAxis.value
  const onlyCurrency = hasCurrencyActive.value && !hasVolumeActive.value

  const plugins = []
  if (window.ChartDataLabels) plugins.push(window.ChartDataLabels)

  const scales = {
    x: {
      grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
      ticks: { color: '#666', font: { size: 11 }, maxRotation: granularity.value === 'dia' ? 45 : 0 },
    },
    y: {
      position: 'left',
      grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
      ticks: {
        color: '#666',
        font: { size: 11 },
        callback: (v) => onlyCurrency ? formatCurrency(v) : v.toLocaleString('pt-BR'),
      },
    },
  }

  if (dual) {
    scales.y1 = {
      position: 'right',
      grid: { drawOnChartArea: false, drawBorder: false },
      ticks: {
        color: '#666',
        font: { size: 11 },
        callback: (v) => formatCurrency(v),
      },
    }
  }

  chartInstance = new window.Chart(ctx, {
    type: isLine ? 'line' : 'bar',
    data: { labels: chartLabels.value, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#999',
            font: { size: 11, family: "'Ubuntu', 'Segoe UI', sans-serif" },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
            filter: (item) => !item.text.includes('(anterior)'),
          },
        },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: '#333',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed.y ?? 0
              const metricKey = ALL_METRICS.find(m => ctx.dataset.label.startsWith(m.label))
              const isCurr = metricKey?.isCurrency
              const formatted = isCurr
                ? `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                : val.toLocaleString('pt-BR')
              return ` ${ctx.dataset.label}: ${formatted}`
            },
          },
        },
        datalabels: false,
      },
      scales,
    },
    plugins,
  })
}

onMounted(() => createChart())
onBeforeUnmount(() => { if (chartInstance) { chartInstance.destroy(); chartInstance = null } })

watch(
  () => [chartLabels.value, chartType.value, showComparison.value, activeMetrics.size, granularity.value, props.data, props.comparisonData],
  () => createChart(),
  { deep: true }
)
</script>

<style scoped>
.periodo-section {
  margin-top: 24px;
  margin-bottom: 24px;
}

.periodo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.periodo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-high, #fff);
  margin: 0;
}

.periodo-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Dropdown de métricas (estilo filter-group) ──────────────────────────── */
.periodo-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-inner, #1a1a1a);
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
  position: relative;
}

.periodo-filter-label {
  font-size: 12px;
  color: var(--text-lowest, #666);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.periodo-filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--text-medium, #ccc);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}

.periodo-filter-value {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.periodo-filter-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.periodo-filter-arrow.open {
  transform: rotate(180deg);
}

.periodo-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 200px;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 6px;
  padding: 4px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.periodo-dropdown-group {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-lowest, #666);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 8px 12px 4px;
  user-select: none;
}

.periodo-dropdown-group:not(:first-child) {
  border-top: 1px solid #222;
  margin-top: 4px;
  padding-top: 10px;
}

.periodo-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted, #888);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.periodo-dropdown-item:hover {
  background: var(--bg-inner, #1a1a1a);
  color: var(--text-high, #fff);
}

.periodo-dropdown-item.active {
  color: var(--text-high, #fff);
  font-weight: 600;
}

.periodo-dropdown-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  flex-shrink: 0;
}

/* ── Toggle bar/line (estilo layout-btn) ─────────────────────────────────── */
.periodo-toggle-group {
  display: inline-flex;
  gap: 0;
  background: var(--bg-inner, #1a1a1a);
  border-radius: 4px;
  padding: 3px;
}

.periodo-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted, #888);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.periodo-toggle-btn:hover {
  color: var(--text-medium, #ccc);
}

.periodo-toggle-btn.active {
  background: var(--bg-toggle-active, #2a2a2a);
  color: var(--text-high, #fff);
}

/* ── Botão comparar ──────────────────────────────────────────────────────── */
.periodo-compare-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: var(--text-muted, #888);
  background: var(--bg-inner, #1a1a1a);
  border: 1px solid #222;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.periodo-compare-btn:hover {
  color: var(--text-medium, #ccc);
  border-color: #333;
}

.periodo-compare-btn.active {
  color: var(--color-primary, #ff0000);
  border-color: var(--color-primary, #ff0000);
  background: rgba(255, 0, 0, 0.08);
}

/* ── Chart container ─────────────────────────────────────────────────────── */
.chart-wrapper {
  position: relative;
  width: 100%;
  min-height: 300px;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.periodo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-lowest, #666);
  font-size: 14px;
}
</style>
