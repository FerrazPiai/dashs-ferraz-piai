<template>
  <div class="dashboard-container">
    <!-- Header (sticky) -->
    <div class="sticky-header-wrap">
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
        <div class="legend-wrapper" @click="legendOpen = !legendOpen">
          <i data-lucide="info" class="legend-icon"></i>
          <div v-if="!legendOpen" class="legend-tooltip">
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
          <div v-if="legendOpen" class="legend-popup" @click.stop>
            <button class="legend-popup-close" @click="legendOpen = false" aria-label="Fechar">&times;</button>
            <div class="legend-section">
              <div class="legend-section-title">Cores nos KPIs (cards)</div>
              <div class="legend-section-desc">As cores nos cards indicam o quanto o valor realizado está próximo da meta:</div>
              <div class="legend-item">
                <span class="legend-dot legend-dot--green"></span>
                <span><strong>Verde</strong> — {{ legendGreenText }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot legend-dot--yellow"></span>
                <span><strong>Amarelo</strong> — {{ legendYellowText }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot legend-dot--red"></span>
                <span><strong>Vermelho</strong> — {{ legendRedText }}</span>
              </div>
            </div>
            <div class="legend-divider"></div>
            <div class="legend-section">
              <div class="legend-section-title">Cores nas Taxas de Conversão (tabela)</div>
              <div class="legend-section-desc">Cada coluna de % na tabela tem faixas próprias. A cor indica se a conversão está boa, razoável ou baixa:</div>
              <table class="legend-cr-table">
                <thead>
                  <tr>
                    <th>Coluna</th>
                    <th>O que mede</th>
                    <th><span class="legend-dot legend-dot--green"></span>Verde</th>
                    <th><span class="legend-dot legend-dot--yellow"></span>Amarelo</th>
                    <th><span class="legend-dot legend-dot--red"></span>Vermelho</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CR1%</td>
                    <td>Prospect → MQL</td>
                    <td>≥ 70%</td>
                    <td>≥ 50%</td>
                    <td>&lt; 50%</td>
                  </tr>
                  <tr>
                    <td>CR2%</td>
                    <td>MQL → SQL</td>
                    <td>≥ 25%</td>
                    <td>≥ 15%</td>
                    <td>&lt; 15%</td>
                  </tr>
                  <tr>
                    <td>CR3%</td>
                    <td>SQL → SAL</td>
                    <td>≥ 80%</td>
                    <td>≥ 65%</td>
                    <td>&lt; 65%</td>
                  </tr>
                  <tr>
                    <td>CR4%</td>
                    <td>SAL → Commit</td>
                    <td>≥ 20%</td>
                    <td>≥ 12%</td>
                    <td>&lt; 12%</td>
                  </tr>
                  <tr>
                    <td>Hit Rate</td>
                    <td>MQL → Commit (direto)</td>
                    <td>≥ 5%</td>
                    <td>≥ 3%</td>
                    <td>&lt; 3%</td>
                  </tr>
                  <tr>
                    <td>CR5%</td>
                    <td>AQL → SQL Mon.</td>
                    <td>≥ 25%</td>
                    <td>≥ 15%</td>
                    <td>&lt; 15%</td>
                  </tr>
                  <tr>
                    <td>CR6%</td>
                    <td>SQL → SAL Mon.</td>
                    <td>≥ 80%</td>
                    <td>≥ 65%</td>
                    <td>&lt; 65%</td>
                  </tr>
                  <tr>
                    <td>CR7%</td>
                    <td>SAL → Commit Mon.</td>
                    <td>≥ 20%</td>
                    <td>≥ 12%</td>
                    <td>&lt; 12%</td>
                  </tr>
                  <tr>
                    <td>Hit Rate Mon.</td>
                    <td>AQL → Commit Mon. (direto)</td>
                    <td>≥ 5%</td>
                    <td>≥ 3%</td>
                    <td>&lt; 3%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>
    </div><!-- /sticky-header-wrap -->

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
      <div class="kpi-value-toggle">
        <button
          class="layout-btn"
          :class="{ active: kpiValueMode === 'abbrev' }"
          @click="kpiValueMode = 'abbrev'"
          aria-label="Valores abreviados"
        >
          <span class="toggle-hint" data-tip="Valores abreviados (ex: R$ 25k)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">K</text>
            </svg>
          </span>
        </button>
        <button
          class="layout-btn"
          :class="{ active: kpiValueMode === 'full' }"
          @click="kpiValueMode = 'full'"
          aria-label="Valores completos"
        >
          <span class="toggle-hint" data-tip="Valores completos (ex: R$ 25.000,00)">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <text x="1" y="12" font-size="13" font-weight="700" fill="currentColor">0,0</text>
            </svg>
          </span>
        </button>
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

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid" :class="{ 'kpi-grid--compact': kpiLayout === 'compact' }">
      <GtmScorecard
        label="Investimento"
        tooltip="Investimento total no período"
        :value="kpis.investimento?.value ?? null"
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
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
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
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
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
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
      <GtmScorecard
        label="LT Médio"
        tooltip="Lead Time médio em dias (da criação ao fechamento)"
        :value="kpis.lt_medio?.value ?? null"
        :formatter="formatLt"
        :previousDelta="previousDeltas.lt_medio"
        :loading="loading"
        hideMeta
      />
      <GtmScorecard
        label="LTV"
        tooltip="Lifetime Value estimado (Fee médio × LT médio em meses)"
        :value="kpiLtv"
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
        :previousDelta="previousDeltas.ltv"
        :loading="loading"
        hideMeta
      />
      <GtmScorecard
        label="Avg Ticket Monetização"
        tooltip="Ticket médio de monetização (Booking Monet. / CR Monet.)"
        :value="kpis.avgTicketMonetizacao?.value ?? null"
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
        :valueTooltip="avgTicketMonetTooltip"
        :previousDelta="previousDeltas.avgTicketMonetizacao"
        :loading="loading"
        hideMeta
      />
      <GtmScorecard
        label="Booking Monetização"
        tooltip="Receita total de monetização no período"
        :value="kpis.booking_monetizacao?.value ?? null"
        :formatter="kpiCurrencyFormatter"
        :fullFormatter="formatCurrency"
        :previousDelta="previousDeltas.booking_monetizacao"
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
      <GtmFunnelTable :tiers="currentTiers" :loading="loading" :drilldown="tableDrilldown" />
    </div>

    <!-- Lista: Listagem de Prospects -->
    <MvListagemTable
      :rows="mvListagemData"
      :loading="loading"
    />
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    :message="confirmMessage"
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
import { formatNumber, formatCurrency, formatCurrencyAbbrev, formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import GtmScorecard from './components/GtmScorecard.vue'
import GtmFunnelTable from './components/GtmFunnelTable.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import MvListagemTable from '../MarketingVendas/components/MvListagemTable.vue'
import { MOCK_DATA, CANAIS, MESES, QUARTERS } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('gtm-motion')

// ── Refreshing state (button only, keeps data visible) ─────────────────────
const refreshing = ref(false)

// ── Legend popup state ──────────────────────────────────────────────────────
const legendOpen = ref(false)

// ── KPI Layout Toggle ───────────────────────────────────────────────────────
const kpiLayout = ref('expanded')

// ── KPI Value Mode (abbreviated / full) ────────────────────────────────────
const kpiValueMode = ref('abbrev')
const kpiCurrencyFormatter = computed(() =>
  kpiValueMode.value === 'full' ? formatCurrency : formatCurrencyAbbrev
)


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
  { value: 'canal', label: 'Canal' },
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

const formatLt = (v) => {
  if (v == null || isNaN(v) || v === 0) return '-'
  return Math.round(v) + ' dias'
}

const STEP_ORDER = ['Saber', 'Ter', 'Executar', 'Sem Mapeamento']
const TIER_ORDER = ['Tiny', 'Small', 'Medium', 'Large', 'Enterprise', 'Non-ICP', 'Sem mapeamento', 'Total']
const toNum = (v) => (v === '' || v == null) ? null : Number(v)

function transformApiData(rawData, mesIni, mesFim, closer, sdr, quarter = null, step = null, drilldownBy = 'step', channel = 'consolidado') {
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
        LT_sum: 0, LT_count: 0,
        CR_monetizacao: 0, booking_monetizacao: 0,
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
    // fee_sum = sum of fee_value (fee recorrente) for ROAS Fee and LTV
    acc.fee_sum += toNum(row.fee_value) ?? 0
    // LT_medio, CR_monetizacao, booking_monetizacao
    const rowLt = toNum(row.LT_medio) ?? 0
    const rowLeads = toNum(row.leads_value) ?? 0
    if (rowLt > 0) {
      acc.LT_sum += rowLt
      acc.LT_count++
    }
    acc.CR_monetizacao += toNum(row.CR_monetizacao) ?? 0
    acc.booking_monetizacao += toNum(row.booking_monetizacao) ?? 0
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
        LT_sum: 0, LT_count: 0,
        CR_monetizacao: 0, booking_monetizacao: 0,
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
          investimento_value: 0, fee_value: 0,
          LT_sum: 0, LT_count: 0, CR_monetizacao: 0, booking_monetizacao: 0,
          aql_monetizacao: 0, sql_monetizacao: 0, sal_monetizacao: 0, commit_monetizacao: 0,
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
      const fFee     = toNum(row.fee_value) ?? 0
      const fLt      = toNum(row.LT_medio) ?? 0
      const fCrMon   = toNum(row.CR_monetizacao) ?? 0
      const fBkMon   = toNum(row.booking_monetizacao) ?? 0
      const fAqlMon  = toNum(row.aql_monetizacao) ?? 0
      const fSqlMon  = toNum(row.sql_monetizacao) ?? 0
      const fSalMon  = toNum(row.sal_monetizacao) ?? 0
      const fCommitMon = toNum(row.commit_monetizacao) ?? 0

      if (isNewFormat) {
        // New format: each row is unique (no duplication), always accumulate to tier totals
        acc.leads_value   += fLeads
        acc.mql_value     += fMql
        acc.sql_value     += fSql
        acc.sal_value     += fSal
        acc.commit_value  += fCommit
        acc.booking_value += fBooking
        acc.investimento_value += fInvest
        acc.fee_value          += fFee
        // LT_medio (simple avg), CR/booking monetizacao (sum)
        if (fLt > 0) { acc.LT_sum += fLt; acc.LT_count++ }
        acc.CR_monetizacao += fCrMon
        acc.booking_monetizacao += fBkMon
        acc.aql_monetizacao += fAqlMon
        acc.sql_monetizacao += fSqlMon
        acc.sal_monetizacao += fSalMon
        acc.commit_monetizacao += fCommitMon

        // Step drilldown: distribute row metrics to each subcategoria in the array
        if (drilldownBy === 'step') {
          const subs = row.subcategorias ?? []
          for (const subKey of subs) {
            if (!subKey) continue
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, fee_value: 0, LT_sum: 0, LT_count: 0, CR_monetizacao: 0, booking_monetizacao: 0, aql_monetizacao: 0, sql_monetizacao: 0, sal_monetizacao: 0, commit_monetizacao: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.fee_value     += fFee
            if (fLt > 0) { sa.LT_sum += fLt; sa.LT_count++ }
            sa.CR_monetizacao += fCrMon
            sa.booking_monetizacao += fBkMon
            sa.aql_monetizacao += fAqlMon
            sa.sql_monetizacao += fSqlMon
            sa.sal_monetizacao += fSalMon
            sa.commit_monetizacao += fCommitMon
          }
        } else {
          // Closer/SDR/Canal drilldown
          const subKey = drilldownBy === 'closer' ? row.closer
            : drilldownBy === 'sdr' ? row.sdr
            : drilldownBy === 'canal' ? row.canal : null
          if (subKey) {
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, fee_value: 0, LT_sum: 0, LT_count: 0, CR_monetizacao: 0, booking_monetizacao: 0, aql_monetizacao: 0, sql_monetizacao: 0, sal_monetizacao: 0, commit_monetizacao: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.fee_value     += fFee
            if (fLt > 0) { sa.LT_sum += fLt; sa.LT_count++ }
            sa.CR_monetizacao += fCrMon
            sa.booking_monetizacao += fBkMon
            sa.aql_monetizacao += fAqlMon
            sa.sql_monetizacao += fSqlMon
            sa.sal_monetizacao += fSalMon
            sa.commit_monetizacao += fCommitMon
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
          acc.fee_value          += fFee
          if (fLt > 0) { acc.LT_sum += fLt; acc.LT_count++ }
          acc.CR_monetizacao += fCrMon
          acc.booking_monetizacao += fBkMon
          acc.aql_monetizacao += fAqlMon
          acc.sql_monetizacao += fSqlMon
          acc.sal_monetizacao += fSalMon
          acc.commit_monetizacao += fCommitMon
        }

        if (drilldownBy === 'step' && !isSummaryRow) {
          if (!acc.steps[subVal]) {
            acc.steps[subVal] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, fee_value: 0, LT_sum: 0, LT_count: 0, CR_monetizacao: 0, booking_monetizacao: 0, aql_monetizacao: 0, sql_monetizacao: 0, sal_monetizacao: 0, commit_monetizacao: 0 }
          }
          const sa = acc.steps[subVal]
          sa.leads   += fLeads
          sa.mql     += fMql
          sa.sql     += fSql
          sa.sal     += fSal
          sa.commit  += fCommit
          sa.booking += fBooking
          sa.investimento  += fInvest
          sa.fee_value     += fFee
          if (fLt > 0) { sa.LT_sum += fLt; sa.LT_count++ }
          sa.CR_monetizacao += fCrMon
          sa.booking_monetizacao += fBkMon
          sa.aql_monetizacao += fAqlMon
          sa.sql_monetizacao += fSqlMon
          sa.sal_monetizacao += fSalMon
          sa.commit_monetizacao += fCommitMon
        } else if (drilldownBy !== 'step' && isSummaryRow) {
          const subKey = drilldownBy === 'closer' ? row.closer
            : drilldownBy === 'sdr' ? row.sdr
            : drilldownBy === 'canal' ? row.canal : null
          if (subKey) {
            if (!acc.steps[subKey]) {
              acc.steps[subKey] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0, investimento: 0, fee_value: 0, LT_sum: 0, LT_count: 0, CR_monetizacao: 0, booking_monetizacao: 0, aql_monetizacao: 0, sql_monetizacao: 0, sal_monetizacao: 0, commit_monetizacao: 0 }
            }
            const sa = acc.steps[subKey]
            sa.leads   += fLeads
            sa.mql     += fMql
            sa.sql     += fSql
            sa.sal     += fSal
            sa.commit  += fCommit
            sa.booking += fBooking
            sa.investimento  += fInvest
            sa.fee_value     += fFee
            if (fLt > 0) { sa.LT_sum += fLt; sa.LT_count++ }
            sa.CR_monetizacao += fCrMon
            sa.booking_monetizacao += fBkMon
            sa.aql_monetizacao += fAqlMon
            sa.sql_monetizacao += fSqlMon
            sa.sal_monetizacao += fSalMon
            sa.commit_monetizacao += fCommitMon
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
      lt_medio:     { value: (k.LT_count ?? 0) > 0 ? k.LT_sum / k.LT_count : 0 },
      CR_monetizacao: { value: k.CR_monetizacao ?? 0 },
      booking_monetizacao: { value: k.booking_monetizacao ?? 0 },
      avgTicketMonetizacao: { value: (k.CR_monetizacao ?? 0) > 0 ? Math.round((k.booking_monetizacao ?? 0) / k.CR_monetizacao) : null },
      fee_total: { value: k.fee_sum ?? 0 },
    }

    let tiers
    const canalFunil = funilByCanal[canal] ?? {}

    if (hasTierData) {
      // Build tier rows — include ALL tiers from data (not just hardcoded)
      tiers = []
      let totLeads = 0, totMql = 0, totSql = 0, totSal = 0, totCommit = 0, totBooking = 0, totInvest = 0, totFeeProd = 0, totLtSum = 0, totLtCount = 0, totCrMon = 0, totBkMon = 0, totLtv = 0, totAqlMon = 0, totSqlMon = 0, totSalMon = 0, totCommitMon = 0

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
          const eFee = t.fee_value
          tiers.push({
            tier: tierName, leads: t.leads_value, mql: t.mql_value, investimento: eInv,
            fee_total: eFee,
            roas_booking: eInv > 0 ? t.booking_value / eInv : 0,
            roas_fee: eInv > 0 ? eFee / eInv : 0,
            LT_medio: t.LT_count > 0 ? t.LT_sum / t.LT_count : 0,
            CR_monetizacao: t.CR_monetizacao, booking_monetizacao: t.booking_monetizacao,
            aql_monetizacao: t.aql_monetizacao, sql_monetizacao: t.sql_monetizacao,
            sal_monetizacao: t.sal_monetizacao, commit_monetizacao: t.commit_monetizacao,
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
          totLtSum   += t.LT_sum; totLtCount += t.LT_count
          totCrMon   += t.CR_monetizacao; totBkMon += t.booking_monetizacao
          totAqlMon += t.aql_monetizacao; totSqlMon += t.sql_monetizacao; totSalMon += t.sal_monetizacao; totCommitMon += t.commit_monetizacao
          const eLt = t.LT_count > 0 ? t.LT_sum / t.LT_count : 0
          if (eFee > 0 && eLt > 0) totLtv += eFee * (eLt / 30)
          continue
        }

        const fl  = t.leads_value
        const fm  = t.mql_value
        const fs  = t.sql_value
        const fsal = t.sal_value
        const fc  = t.commit_value
        const fb  = t.booking_value
        const fi  = t.investimento_value
        const tierFee = t.fee_value

        const cr1v = fl   > 0 ? (fm  / fl)   * 100 : 0
        const cr2v = fm   > 0 ? (fs  / fm)   * 100 : 0
        const cr3v = fs   > 0 ? (fsal / fs)  * 100 : 0
        const cr4v = fsal > 0 ? (fc  / fsal) * 100 : 0
        const mwv  = fm   > 0 ? (fc  / fm)   * 100 : 0
        const cr5v = t.aql_monetizacao > 0 ? (t.sql_monetizacao / t.aql_monetizacao) * 100 : 0
        const cr6v = t.sql_monetizacao > 0 ? (t.sal_monetizacao / t.sql_monetizacao) * 100 : 0
        const cr7v = t.sal_monetizacao > 0 ? (t.commit_monetizacao / t.sal_monetizacao) * 100 : 0
        const mwvMon = t.aql_monetizacao > 0 ? (t.commit_monetizacao / t.aql_monetizacao) * 100 : 0

        // Distribute investimento proportionally based on drilldown type:
        // step→SAL, closer→SQL, canal→leads, sdr→leads
        const baseMetricKey = drilldownBy === 'step' ? 'sal'
          : drilldownBy === 'closer' ? 'sql' : 'leads'
        const stepEntries = Object.entries(t.steps)
        const totalBase = stepEntries.reduce((sum, [, s]) => sum + (s[baseMetricKey] ?? 0), 0)

        const steps = stepEntries.map(([name, s]) => {
          const proportion = totalBase > 0 ? (s[baseMetricKey] ?? 0) / totalBase : 0
          const sInv = fi * proportion
          const sFee = s.fee_value ?? 0
          return {
            name, leads: s.leads, mql: s.mql, sql: s.sql,
            sal: s.sal, commit: s.commit, booking: s.booking,
            investimento: sInv,
            fee_total: sFee,
            roas_booking: sInv > 0 ? (s.booking ?? 0) / sInv : 0,
            roas_fee: sInv > 0 ? sFee / sInv : 0,
            LT_medio: (s.LT_count ?? 0) > 0 ? s.LT_sum / s.LT_count : 0,
            CR_monetizacao: s.CR_monetizacao ?? 0,
            booking_monetizacao: s.booking_monetizacao ?? 0,
            aql_monetizacao: s.aql_monetizacao ?? 0,
            sql_monetizacao: s.sql_monetizacao ?? 0,
            sal_monetizacao: s.sal_monetizacao ?? 0,
            commit_monetizacao: s.commit_monetizacao ?? 0,
          }
        })
        if (drilldownBy === 'step') {
          steps.sort((a, b) => {
            const ia = STEP_ORDER.indexOf(a.name)
            const ib = STEP_ORDER.indexOf(b.name)
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
          })
        } else {
          steps.sort((a, b) => {
            const aLast = /^sem\s/i.test(a.name) ? 1 : 0
            const bLast = /^sem\s/i.test(b.name) ? 1 : 0
            return aLast - bLast || a.name.localeCompare(b.name)
          })
        }

        tiers.push({
          tier: tierName,
          leads: fl, mql: fm, sql: fs, sal: fsal, commit: fc, booking: fb,
          investimento: fi,
          fee_total: tierFee,
          roas_booking: fi > 0 ? fb / fi : 0,
          roas_fee: fi > 0 ? tierFee / fi : 0,
          avgTicket: fc > 0 ? Math.round(fb / fc) : 0,
          cr1:    { val: cr1v, color: crColor(cr1v, 70, 50) },
          cr2:    { val: cr2v, color: crColor(cr2v, 25, 15) },
          cr3:    { val: cr3v, color: crColor(cr3v, 80, 65) },
          cr4:    { val: cr4v, color: crColor(cr4v, 20, 12) },
          mqlWon: { val: mwv,  color: crColor(mwv,  5,  3)  },
          cr5:    { val: cr5v, color: crColor(cr5v, 25, 15) },
          cr6:    { val: cr6v, color: crColor(cr6v, 80, 65) },
          cr7:    { val: cr7v, color: crColor(cr7v, 20, 12) },
          mqlWonMon: { val: mwvMon, color: crColor(mwvMon, 5, 3) },
          LT_medio: t.LT_count > 0 ? t.LT_sum / t.LT_count : 0,
          CR_monetizacao: t.CR_monetizacao, booking_monetizacao: t.booking_monetizacao,
          aql_monetizacao: t.aql_monetizacao, sql_monetizacao: t.sql_monetizacao,
          sal_monetizacao: t.sal_monetizacao, commit_monetizacao: t.commit_monetizacao,
          steps,
        })

        totLeads   += fl;   totMql    += fm;   totSql  += fs
        totSal     += fsal; totCommit += fc;   totBooking += fb
        totInvest  += fi;   totFeeProd += tierFee
        totLtSum   += t.LT_sum; totLtCount += t.LT_count
        const tierLt = t.LT_count > 0 ? t.LT_sum / t.LT_count : 0
        if (tierFee > 0 && tierLt > 0) totLtv += tierFee * (tierLt / 30)
        totCrMon   += t.CR_monetizacao; totBkMon += t.booking_monetizacao
        totAqlMon += t.aql_monetizacao; totSqlMon += t.sql_monetizacao; totSalMon += t.sal_monetizacao; totCommitMon += t.commit_monetizacao
      }

      // Aggregate steps for Total row
      const totalStepsMap = {}
      for (const tierRow of tiers) {
        if (!tierRow.steps) continue
        for (const step of tierRow.steps) {
          if (!totalStepsMap[step.name]) {
            totalStepsMap[step.name] = { ...step }
          } else {
            const ts = totalStepsMap[step.name]
            ts.leads = (ts.leads ?? 0) + (step.leads ?? 0)
            ts.mql = (ts.mql ?? 0) + (step.mql ?? 0)
            ts.sql = (ts.sql ?? 0) + (step.sql ?? 0)
            ts.sal = (ts.sal ?? 0) + (step.sal ?? 0)
            ts.commit = (ts.commit ?? 0) + (step.commit ?? 0)
            ts.booking = (ts.booking ?? 0) + (step.booking ?? 0)
            ts.investimento = (ts.investimento ?? 0) + (step.investimento ?? 0)
            ts.fee_total = (ts.fee_total ?? 0) + (step.fee_total ?? 0)
            ts.CR_monetizacao = (ts.CR_monetizacao ?? 0) + (step.CR_monetizacao ?? 0)
            ts.booking_monetizacao = (ts.booking_monetizacao ?? 0) + (step.booking_monetizacao ?? 0)
            ts.aql_monetizacao = (ts.aql_monetizacao ?? 0) + (step.aql_monetizacao ?? 0)
            ts.sql_monetizacao = (ts.sql_monetizacao ?? 0) + (step.sql_monetizacao ?? 0)
            ts.sal_monetizacao = (ts.sal_monetizacao ?? 0) + (step.sal_monetizacao ?? 0)
            ts.commit_monetizacao = (ts.commit_monetizacao ?? 0) + (step.commit_monetizacao ?? 0)
          }
        }
      }
      const totalSteps = Object.values(totalStepsMap)
      for (const ts of totalSteps) {
        const inv = ts.investimento ?? 0
        ts.roas_booking = inv > 0 ? (ts.booking ?? 0) / inv : 0
        ts.roas_fee = inv > 0 ? (ts.fee_total ?? 0) / inv : 0
      }
      if (drilldownBy === 'step') {
        totalSteps.sort((a, b) => {
          const ia = STEP_ORDER.indexOf(a.name)
          const ib = STEP_ORDER.indexOf(b.name)
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
        })
      } else {
        totalSteps.sort((a, b) => {
          const aLast = /^sem\s/i.test(a.name) ? 1 : 0
          const bLast = /^sem\s/i.test(b.name) ? 1 : 0
          return aLast - bLast || a.name.localeCompare(b.name)
        })
      }

      // Add Total row
      const tcr1 = totLeads   > 0 ? (totMql    / totLeads)   * 100 : 0
      const tcr2 = totMql     > 0 ? (totSql    / totMql)     * 100 : 0
      const tcr3 = totSql     > 0 ? (totSal    / totSql)     * 100 : 0
      const tcr4 = totSal     > 0 ? (totCommit / totSal)     * 100 : 0
      const tmw  = totMql     > 0 ? (totCommit / totMql)     * 100 : 0
      const tcr5 = totAqlMon  > 0 ? (totSqlMon    / totAqlMon)  * 100 : 0
      const tcr6 = totSqlMon  > 0 ? (totSalMon    / totSqlMon)  * 100 : 0
      const tcr7 = totSalMon  > 0 ? (totCommitMon / totSalMon)  * 100 : 0
      const tmwMon = totAqlMon > 0 ? (totCommitMon / totAqlMon) * 100 : 0
      tiers.push({
        tier: 'Total',
        leads: totLeads, mql: totMql, sql: totSql, sal: totSal,
        commit: totCommit, booking: totBooking,
        investimento: totInvest,
        fee_total: totFeeProd,
        roas_booking: totInvest > 0 ? totBooking / totInvest : 0,
        roas_fee: totInvest > 0 ? totFeeProd / totInvest : 0,
        avgTicket: totCommit > 0 ? Math.round(totBooking / totCommit) : 0,
        cr1:    { val: tcr1, color: crColor(tcr1, 70, 50) },
        cr2:    { val: tcr2, color: crColor(tcr2, 25, 15) },
        cr3:    { val: tcr3, color: crColor(tcr3, 80, 65) },
        cr4:    { val: tcr4, color: crColor(tcr4, 20, 12) },
        mqlWon: { val: tmw,  color: crColor(tmw,  5,  3)  },
        cr5:    { val: tcr5, color: crColor(tcr5, 25, 15) },
        cr6:    { val: tcr6, color: crColor(tcr6, 80, 65) },
        cr7:    { val: tcr7, color: crColor(tcr7, 20, 12) },
        mqlWonMon: { val: tmwMon, color: crColor(tmwMon, 5, 3) },
        LT_medio: totLtCount > 0 ? totLtSum / totLtCount : 0,
        ltv: totLtv > 0 ? Math.round(totLtv) : null,
        CR_monetizacao: totCrMon, booking_monetizacao: totBkMon,
        aql_monetizacao: totAqlMon, sql_monetizacao: totSqlMon,
        sal_monetizacao: totSalMon, commit_monetizacao: totCommitMon,
        isTotal: true,
        steps: totalSteps,
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
        mqlWonMon: { val: 0, color: crColor(0, 5, 3) },
        isTotal: true,
        investimento: 0, roas_booking: 0, roas_fee: 0,
        LT_medio: 0, CR_monetizacao: 0, booking_monetizacao: 0,
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

  // Filter agrupadas by channel
  if (channel && channel !== 'consolidado') {
    agrupadas = agrupadas.filter((r) => {
      const c = r.canal ?? ''
      return normalizeCanal(c) === channel || c.toLowerCase() === channel.toLowerCase()
    })
  }

  // Filter listagem by active filters
  let filteredListagem = rawListagem
  if (channel && channel !== 'consolidado') {
    filteredListagem = filteredListagem.filter(r => {
      const c = r.canal_origem ?? r.canal ?? ''
      return normalizeCanal(c) === channel || c.toLowerCase() === channel.toLowerCase()
    })
  }
  if (closer && closer !== 'todos') {
    const cl = closer.toLowerCase()
    filteredListagem = filteredListagem.filter(r => !r.closer || r.closer.toLowerCase() === cl)
  }
  if (sdr && sdr !== 'todos') {
    const sd = sdr.toLowerCase()
    filteredListagem = filteredListagem.filter(r => !r.sdr || r.sdr.toLowerCase() === sd)
  }
  if (step && step !== 'todos') {
    const st = step.toLowerCase()
    filteredListagem = filteredListagem.filter(r => {
      const s = r.categoria_step ?? ''
      return !s || s.toLowerCase() === st
    })
  }

  // Extract taxa (color thresholds per canal/month)
  const rawTaxa = source.taxa ?? []

  return { channels, listagem: filteredListagem, rawKpis, rawFunil: rawFunil.filter(r => !r.is_empty_row && !r.is_total), agrupadas, taxa: rawTaxa }
}

const useMockData = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.has('mock-data')
})

const resolvedData = computed(() => {
  if (useMockData.value) return MOCK_DATA
  if (data.value) {
    if (periodMode.value === 'quarter') {
      return transformApiData(data.value, null, null, selectedCloser.value, selectedSdr.value, selectedQuarter.value, selectedStep.value, tableDrilldown.value, selectedChannel.value)
    }
    return transformApiData(data.value, mesInicial.value, mesFinal.value, selectedCloser.value, selectedSdr.value, null, selectedStep.value, tableDrilldown.value, selectedChannel.value)
  }
  return null
})

// Comparison period data
const comparisonData = computed(() => {
  if (useMockData.value || !data.value) return null
  if (periodMode.value === 'quarter') {
    return transformApiData(data.value, null, null, selectedCloser.value, selectedSdr.value, compQuarter.value, selectedStep.value, tableDrilldown.value, selectedChannel.value)
  }
  return transformApiData(data.value, compMesInicial.value, compMesFinal.value, selectedCloser.value, selectedSdr.value, null, selectedStep.value, tableDrilldown.value, selectedChannel.value)
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
const DERIVED_KEYS = new Set(['roas_booking', 'roas_fee', 'lt_medio', 'avgTicketMonetizacao', 'fee_total', 'ltv'])

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
  // LT Médio: weighted average across channels (by leads with non-zero LT)
  let ltSum = 0, ltCount = 0
  for (const channelId of activeChannelIds.value) {
    const chLt = source.channels?.[channelId]?.kpis?.lt_medio?.value ?? 0
    if (chLt > 0) { ltSum += chLt; ltCount++ }
  }
  sum.lt_medio = { value: ltCount > 0 ? ltSum / ltCount : 0 }
  // CR Monetização & Booking Monetização (already summed above), derive Avg Ticket Monetização
  const totalCrMon = sum.CR_monetizacao?.value ?? 0
  const totalBkMon = sum.booking_monetizacao?.value ?? 0
  sum.avgTicketMonetizacao = { value: totalCrMon > 0 ? Math.round(totalBkMon / totalCrMon) : null }
  // Fee total (summed from channels — not derived, but tracked for LTV)
  let totalFeeVal = 0
  for (const channelId of activeChannelIds.value) {
    totalFeeVal += source.channels?.[channelId]?.kpis?.fee_total?.value ?? 0
  }
  sum.fee_total = { value: totalFeeVal }
  // LTV = soma dos LTVs por tier (para consistência com a tabela)
  // Calculado depois em kpiLtv computed (depende de currentTiers)
  sum.ltv = { value: null }
  return sum
})

// Tooltip for Avg Ticket Monetização hover
const avgTicketMonetTooltip = computed(() => {
  const crMon = kpis.value?.CR_monetizacao?.value ?? 0
  const bkMon = kpis.value?.booking_monetizacao?.value ?? 0
  if (!crMon && !bkMon) return null
  const fmtCr = formatNumber(crMon)
  const fmtBk = formatCurrencyAbbrev(bkMon)
  return `Commits: ${fmtCr}\nTCV: ${fmtBk}`
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
  // LT Médio (weighted avg)
  let compLtSum = 0, compLtCount = 0
  for (const channelId of activeChannelIds.value) {
    const chLt = compData.channels?.[channelId]?.kpis?.lt_medio?.value ?? 0
    if (chLt > 0) { compLtSum += chLt; compLtCount++ }
  }
  compSum.lt_medio = { value: compLtCount > 0 ? compLtSum / compLtCount : 0 }
  const compCrMon = compSum.CR_monetizacao?.value ?? 0
  const compBkMon = compSum.booking_monetizacao?.value ?? 0
  compSum.avgTicketMonetizacao = { value: compCrMon > 0 ? Math.round(compBkMon / compCrMon) : null }
  // Fee total & LTV for comparison (sum of per-tier LTVs)
  let compFeeTotal = 0
  let compLtvSum = 0
  for (const channelId of activeChannelIds.value) {
    compFeeTotal += compData.channels?.[channelId]?.kpis?.fee_total?.value ?? 0
    const tiers = compData.channels?.[channelId]?.tiers ?? []
    for (const t of tiers) {
      if (t.isTotal) continue
      const tFee = t.fee_total ?? 0
      const tLt = t.LT_medio ?? 0
      if (tFee > 0 && tLt > 0) compLtvSum += tFee * (tLt / 30)
    }
  }
  compSum.fee_total = { value: compFeeTotal }
  compSum.ltv = { value: compLtvSum > 0 ? Math.round(compLtvSum) : null }

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
  // Track LT weighted components per tier for re-averaging
  const tierLtSums = {} // { tierName: { sum: number, count: number, steps: { name: { sum, count } } } }
  for (const channelId of activeChannelIds.value) {
    const tiers = source.channels?.[channelId]?.tiers ?? []
    for (const row of tiers) {
      if (!tierFeeSums[row.tier]) tierFeeSums[row.tier] = { fee: 0, steps: {} }
      const fs = tierFeeSums[row.tier]
      fs.fee += (row.roas_fee ?? 0) * (row.investimento ?? 0)
      // LT weighted tracking
      if (!tierLtSums[row.tier]) tierLtSums[row.tier] = { sum: 0, count: 0, steps: {} }
      const ls = tierLtSums[row.tier]
      const rowLtVal = row.LT_medio ?? 0
      if (rowLtVal > 0) { ls.sum += rowLtVal; ls.count++ }
      // Track step LT
      if (row.steps?.length) {
        for (const st of row.steps) {
          if (!ls.steps[st.name]) ls.steps[st.name] = { sum: 0, count: 0 }
          const sLt = st.LT_medio ?? 0
          if (sLt > 0) { ls.steps[st.name].sum += sLt; ls.steps[st.name].count++ }
        }
      }

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
          ex.CR_monetizacao = (ex.CR_monetizacao ?? 0) + (row.CR_monetizacao ?? 0)
          ex.booking_monetizacao = (ex.booking_monetizacao ?? 0) + (row.booking_monetizacao ?? 0)
          ex.aql_monetizacao = (ex.aql_monetizacao ?? 0) + (row.aql_monetizacao ?? 0)
          ex.sql_monetizacao = (ex.sql_monetizacao ?? 0) + (row.sql_monetizacao ?? 0)
          ex.sal_monetizacao = (ex.sal_monetizacao ?? 0) + (row.sal_monetizacao ?? 0)
          ex.commit_monetizacao = (ex.commit_monetizacao ?? 0) + (row.commit_monetizacao ?? 0)
          continue
        }
        ex.leads   = (ex.leads   ?? 0) + (row.leads   ?? 0)
        ex.mql     = (ex.mql     ?? 0) + (row.mql     ?? 0)
        ex.sql     = (ex.sql     ?? 0) + (row.sql     ?? 0)
        ex.sal     = (ex.sal     ?? 0) + (row.sal     ?? 0)
        ex.commit  = (ex.commit  ?? 0) + (row.commit  ?? 0)
        ex.booking = (ex.booking ?? 0) + (row.booking ?? 0)
        ex.investimento = (ex.investimento ?? 0) + (row.investimento ?? 0)
        ex.CR_monetizacao = (ex.CR_monetizacao ?? 0) + (row.CR_monetizacao ?? 0)
        ex.booking_monetizacao = (ex.booking_monetizacao ?? 0) + (row.booking_monetizacao ?? 0)
        ex.aql_monetizacao = (ex.aql_monetizacao ?? 0) + (row.aql_monetizacao ?? 0)
        ex.sql_monetizacao = (ex.sql_monetizacao ?? 0) + (row.sql_monetizacao ?? 0)
        ex.sal_monetizacao = (ex.sal_monetizacao ?? 0) + (row.sal_monetizacao ?? 0)
        ex.commit_monetizacao = (ex.commit_monetizacao ?? 0) + (row.commit_monetizacao ?? 0)
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
        const cr5v2 = (ex.aql_monetizacao ?? 0) > 0 ? ((ex.sql_monetizacao ?? 0) / ex.aql_monetizacao) * 100 : 0
        const cr6v2 = (ex.sql_monetizacao ?? 0) > 0 ? ((ex.sal_monetizacao ?? 0) / ex.sql_monetizacao) * 100 : 0
        const cr7v2 = (ex.sal_monetizacao ?? 0) > 0 ? ((ex.commit_monetizacao ?? 0) / ex.sal_monetizacao) * 100 : 0
        const mwvMon = (ex.aql_monetizacao ?? 0) > 0 ? ((ex.commit_monetizacao ?? 0) / ex.aql_monetizacao) * 100 : 0
        ex.cr5 = { val: cr5v2, color: crColor(cr5v2, 25, 15) }
        ex.cr6 = { val: cr6v2, color: crColor(cr6v2, 80, 65) }
        ex.cr7 = { val: cr7v2, color: crColor(cr7v2, 20, 12) }
        ex.mqlWonMon = { val: mwvMon, color: crColor(mwvMon, 5, 3) }
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
                exStep.CR_monetizacao = (exStep.CR_monetizacao ?? 0) + (step.CR_monetizacao ?? 0)
                exStep.booking_monetizacao = (exStep.booking_monetizacao ?? 0) + (step.booking_monetizacao ?? 0)
                exStep.aql_monetizacao = (exStep.aql_monetizacao ?? 0) + (step.aql_monetizacao ?? 0)
                exStep.sql_monetizacao = (exStep.sql_monetizacao ?? 0) + (step.sql_monetizacao ?? 0)
                exStep.sal_monetizacao = (exStep.sal_monetizacao ?? 0) + (step.sal_monetizacao ?? 0)
                exStep.commit_monetizacao = (exStep.commit_monetizacao ?? 0) + (step.commit_monetizacao ?? 0)
              } else {
                ex.steps.push({ ...step, roas_booking: 0, roas_fee: 0 })
              }
            }
          }
        }
      }
    }
  }
  // Compute ROAS, fee_total and LT from aggregated totals
  for (const [name, ex] of Object.entries(tierMap)) {
    const inv = ex.investimento ?? 0
    ex.roas_booking = inv > 0 ? (ex.booking ?? 0) / inv : 0
    const fs = tierFeeSums[name]
    ex.fee_total = fs ? fs.fee : 0
    ex.roas_fee = inv > 0 && fs ? fs.fee / inv : 0
    // Recompute LT_medio as simple average of non-zero values
    const ls = tierLtSums[name]
    ex.LT_medio = ls && ls.count > 0 ? ls.sum / ls.count : 0
    if (ex.steps?.length) {
      for (const s of ex.steps) {
        const sInv = s.investimento ?? 0
        s.roas_booking = sInv > 0 ? (s.booking ?? 0) / sInv : 0
        s.fee_total = fs?.steps[s.name] ?? 0
        s.roas_fee = sInv > 0 && fs?.steps[s.name] ? fs.steps[s.name] / sInv : 0
        const sls = ls?.steps?.[s.name]
        s.LT_medio = sls && sls.count > 0 ? sls.sum / sls.count : 0
      }
    }
  }
  // Compute LTV per tier and sum for Total
  let consolidatedLtvSum = 0
  for (const [name, ex] of Object.entries(tierMap)) {
    if (ex.isTotal) continue
    const tFee = ex.fee_total ?? 0
    const tLt = ex.LT_medio ?? 0
    if (tFee > 0 && tLt > 0) {
      ex.ltv = null // let fmtLtv compute per-tier
      consolidatedLtvSum += tFee * (tLt / 30)
    }
  }
  if (tierMap['Total']) {
    tierMap['Total'].ltv = consolidatedLtvSum > 0 ? Math.round(consolidatedLtvSum) : null
  }
  // Sort steps within each tier by STEP_ORDER, "Sem closer"/"Sem SDR" always last
  for (const tier of Object.values(tierMap)) {
    if (tier.steps?.length > 1) {
      tier.steps.sort((a, b) => {
        const aLast = /^sem\s/i.test(a.name) ? 1 : 0
        const bLast = /^sem\s/i.test(b.name) ? 1 : 0
        if (aLast !== bLast) return aLast - bLast
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

// LTV do KPI = LTV do Total da tabela (mesma fonte, mesmo cálculo)
const kpiLtv = computed(() => {
  const totalRow = currentTiers.value.find(r => r.isTotal)
  return totalRow?.ltv ?? null
})

const tableTitle = computed(() => {
  if (isConsolidado.value) return 'Consolidado — Todos os Canais'
  return CANAIS.find((c) => c.id === selectedChannel.value)?.label ?? selectedChannel.value
})

const mvListagemData = computed(() => resolvedData.value?.listagem ?? [])

const lastUpdateTime = ref(null)

const confirmMessage = computed(() => {
  const base = 'Os dados são atualizados automaticamente a cada 1 hora.'
  const lastUpdate = lastUpdateTime.value
    ? `\nÚltima atualização: ${lastUpdateTime.value}.`
    : ''
  return `${base}${lastUpdate}\n\nA atualização manual pode levar até 10 minutos. Durante esse período, outros usuários não poderão solicitar uma nova atualização. Deseja continuar?`
})

// ── Update confirmation modal state ──────────────────────────────────────────
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

async function handleRefresh() {
  // Check if another update is already in progress
  try {
    const statusRes = await fetch('/api/update-status/gtm-motion')
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
    const res = await fetch('/api/gtm-motion/trigger-update')
    if (!res.ok) {
      if (res.status === 409) {
        refreshing.value = false
        showUpdatingModal.value = true
        return
      }
      console.warn('[GTM Motion] Webhook de atualização retornou', res.status)
    }
  } catch (err) {
    console.warn('[GTM Motion] Falha ao chamar webhook de atualização:', err.message)
  }

  // Step 2: GET dados atualizados (bypassa cache)
  refreshing.value = false
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

/* Sticky header */
.sticky-header-wrap {
  position: sticky;
  top: -1px;
  z-index: 20;
  background: #0d0d0d;
  padding: 14px 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sticky-header-wrap .main-header {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.last-update {
  font-size: 12px;
  color: #555;
  white-space: nowrap;
}

/* Legend tooltip + popup */
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
}

.legend-item strong {
  color: #fff;
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

/* Legend popup (click to open) */
.legend-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #141414;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 20px 22px 18px;
  min-width: 520px;
  max-width: 600px;
  z-index: 200;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  cursor: default;
}

.legend-popup-close {
  position: absolute;
  top: 8px;
  left: 10px;
  background: none;
  border: none;
  color: #666;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.legend-popup-close:hover {
  color: #fff;
  background: #222;
}

.legend-section {
  margin-bottom: 4px;
}

.legend-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-section-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
  line-height: 1.5;
}

.legend-divider {
  height: 1px;
  background: #222;
  margin: 14px 0;
}

.legend-cr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.legend-cr-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: 600;
  color: #888;
  border-bottom: 1px solid #222;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.legend-cr-table td {
  padding: 5px 8px;
  color: #ccc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.legend-cr-table tr:last-child td {
  border-bottom: none;
}

.legend-cr-table td:first-child {
  font-weight: 600;
  color: #fff;
}

.legend-cr-table td:nth-child(3) { color: #22c55e; }
.legend-cr-table td:nth-child(4) { color: #fbbf24; }
.legend-cr-table td:nth-child(5) { color: #ef4444; }

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
  gap: 8px;
  margin-bottom: 14px;
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
.kpi-value-toggle {
  display: inline-flex;
  gap: 0;
  background: #1a1a1a;
  border-radius: 4px;
  padding: 3px;
  margin-left: auto;
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

/* KPI Grid — expanded (2 rows of 7) */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

/* KPI Grid — compact (1 row of 14) */
.kpi-grid--compact {
  grid-template-columns: repeat(14, 1fr);
  gap: 4px;
}

.kpi-grid--compact :deep(.gtm-scorecard) {
  padding: 8px 8px;
  gap: 3px;
}

.kpi-grid--compact :deep(.scorecard-value) {
  font-size: 15px;
  min-height: 20px;
}

.kpi-grid--compact :deep(.scorecard-label) {
  font-size: 9px;
}

.kpi-grid--compact :deep(.scorecard-sub) {
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.kpi-grid--compact :deep(.sub-row) {
  gap: 2px;
}

.kpi-grid--compact :deep(.sub-key) {
  font-size: 8px;
  color: #666;
}

.kpi-grid--compact :deep(.sub-val) {
  font-size: 9px;
  font-weight: 600;
}

@media (max-width: 1600px) {
  .kpi-grid--compact { grid-template-columns: repeat(7, 1fr); }
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(5, 1fr); }
  .kpi-grid--compact { grid-template-columns: repeat(5, 1fr); }
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(4, 1fr); }
  .kpi-grid--compact { grid-template-columns: repeat(4, 1fr); }
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
  overflow: hidden;
  max-width: 100%;
  margin-bottom: 24px;
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


</style>
