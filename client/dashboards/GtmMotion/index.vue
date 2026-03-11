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
        <div class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in MESES" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinalDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Channel Tabs -->
    <div class="channel-tabs">
      <button
        class="channel-tab"
        :class="{ active: isConsolidado }"
        @click="handleChannelClick('consolidado')"
      >
        Consolidado
      </button>
      <button
        v-for="canal in CANAIS"
        :key="canal.id"
        class="channel-tab"
        :class="{ active: isChannelActive(canal.id) }"
        @click="handleChannelClick(canal.id)"
      >
        {{ canal.label }}
      </button>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <GtmScorecard
        label="Leads"
        :value="kpis.leads?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.leads?.provisionado ?? null"
        :meta="kpis.leads?.meta ?? null"
        :delta="kpis.leads?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="MQL"
        :value="kpis.mql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.mql?.provisionado ?? null"
        :meta="kpis.mql?.meta ?? null"
        :delta="kpis.mql?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="SQL"
        :value="kpis.sql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sql?.provisionado ?? null"
        :meta="kpis.sql?.meta ?? null"
        :delta="kpis.sql?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="SAL"
        :value="kpis.sal?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sal?.provisionado ?? null"
        :meta="kpis.sal?.meta ?? null"
        :delta="kpis.sal?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Commit"
        :value="kpis.commit?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.commit?.provisionado ?? null"
        :meta="kpis.commit?.meta ?? null"
        :delta="kpis.commit?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Avg Ticket"
        :value="kpis.avgTicket?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.avgTicket?.provisionado ?? null"
        :meta="kpis.avgTicket?.meta ?? null"
        :delta="kpis.avgTicket?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Booking"
        :value="kpis.booking?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.booking?.provisionado ?? null"
        :meta="kpis.booking?.meta ?? null"
        :delta="kpis.booking?.delta ?? null"
        :loading="loading"
      />
    </div>

    <!-- Funnel Table -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">{{ tableTitle }}</h3>
      </div>
      <GtmFunnelTable :tiers="currentTiers" :loading="loading" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatNumber, formatCurrencyAbbrev, formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import GtmScorecard from './components/GtmScorecard.vue'
import GtmFunnelTable from './components/GtmFunnelTable.vue'
import { MOCK_DATA, CANAIS, MESES } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('gtm-motion')

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

const { start: defaultStart, end: defaultEnd } = getCurrentQuarterRange()
const mesInicial = ref(defaultStart)
const mesFinal   = ref(defaultEnd)

const mesesFinalDisponiveis = computed(() =>
  MESES.filter((m) => m.value >= mesInicial.value)
)

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
})

// ── Channel selection ─────────────────────────────────────────────────────────
const selectedChannels = ref(['consolidado'])
const ALL_CHANNEL_IDS  = CANAIS.map((c) => c.id)

const isConsolidado = computed(() => selectedChannels.value.includes('consolidado'))

function isChannelActive(id) {
  return !isConsolidado.value && selectedChannels.value.includes(id)
}

function handleChannelClick(channelId) {
  if (channelId === 'consolidado') {
    selectedChannels.value = ['consolidado']
    return
  }
  const current = selectedChannels.value
  if (current.includes('consolidado')) {
    // From consolidado → exclusive
    selectedChannels.value = [channelId]
    return
  }
  const idx = current.indexOf(channelId)
  if (idx >= 0) {
    // Deselect (unless it's the last)
    if (current.length > 1) selectedChannels.value = current.filter((id) => id !== channelId)
  } else {
    // Add to selection (multi-select)
    selectedChannels.value = [...current, channelId]
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────
const resolvedData = computed(() => {
  if (data.value) return data.value
  if (import.meta.env.DEV) return MOCK_DATA
  return null
})

const activeChannelIds = computed(() =>
  isConsolidado.value ? ALL_CHANNEL_IDS : selectedChannels.value
)

function crColor(val, green, yellow) {
  return val >= green ? 'green' : val >= yellow ? 'yellow' : 'red'
}

// Aggregate KPIs from active channels
const kpis = computed(() => {
  const source = resolvedData.value
  if (!source) return {}
  const sum = {}
  for (const channelId of activeChannelIds.value) {
    const chKpis = source.channels?.[channelId]?.kpis ?? {}
    for (const [key, kpi] of Object.entries(chKpis)) {
      if (key === 'avgTicket') continue // derived from booking/commit
      if (!sum[key]) sum[key] = { value: 0, provisionado: null, meta: null, delta: null }
      sum[key].value += kpi.value ?? 0
      if (kpi.provisionado != null) sum[key].provisionado = (sum[key].provisionado ?? 0) + kpi.provisionado
      if (kpi.meta       != null) sum[key].meta          = (sum[key].meta       ?? 0) + kpi.meta
    }
  }
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

// Aggregate tiers from active channels
const currentTiers = computed(() => {
  const source = resolvedData.value
  if (!source) return []
  const tierMap   = {}
  const tierOrder = []
  for (const channelId of activeChannelIds.value) {
    const tiers = source.channels?.[channelId]?.tiers ?? []
    for (const row of tiers) {
      if (!tierMap[row.tier]) {
        tierMap[row.tier] = { ...row }
        tierOrder.push(row.tier)
      } else {
        const ex = tierMap[row.tier]
        if (row.isEmptyRow) {
          ex.leads = (ex.leads ?? 0) + (row.leads ?? 0)
          continue
        }
        ex.leads   = (ex.leads   ?? 0) + (row.leads   ?? 0)
        ex.mql     = (ex.mql     ?? 0) + (row.mql     ?? 0)
        ex.sql     = (ex.sql     ?? 0) + (row.sql     ?? 0)
        ex.sal     = (ex.sal     ?? 0) + (row.sal     ?? 0)
        ex.commit  = (ex.commit  ?? 0) + (row.commit  ?? 0)
        ex.booking = (ex.booking ?? 0) + (row.booking ?? 0)
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
        // Merge subCategories by name
        if (row.subCategories?.length > 0) {
          if (!ex.subCategories?.length) {
            ex.subCategories = row.subCategories.map(s => ({ ...s }))
          } else {
            for (const sub of row.subCategories) {
              const exSub = ex.subCategories.find(s => s.name === sub.name)
              if (exSub) {
                exSub.leads   = (exSub.leads   ?? 0) + (sub.leads   ?? 0)
                exSub.mql     = (exSub.mql     ?? 0) + (sub.mql     ?? 0)
                exSub.sql     = (exSub.sql     ?? 0) + (sub.sql     ?? 0)
                exSub.sal     = (exSub.sal     ?? 0) + (sub.sal     ?? 0)
                exSub.commit  = (exSub.commit  ?? 0) + (sub.commit  ?? 0)
                exSub.booking = (exSub.booking ?? 0) + (sub.booking ?? 0)
              } else {
                ex.subCategories.push({ ...sub })
              }
            }
          }
        }
      }
    }
  }
  return tierOrder.map((name) => tierMap[name])
})

const tableTitle = computed(() => {
  if (isConsolidado.value) return 'Consolidado — Todos os Canais'
  return selectedChannels.value
    .map((id) => CANAIS.find((c) => c.id === id)?.label ?? id)
    .join(' + ')
})

const lastUpdateTime = ref(null)

async function handleRefresh() {
  await fetchData(true)
  lastUpdateTime.value = formatDateTime(new Date().toISOString())
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(async () => {
  await fetchData()
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

/* Period range (identical to DreFluxoCaixa) */
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

/* Channel Tabs */
.channel-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.channel-tab {
  padding: 6px 16px;
  background: #141414;
  border: 1px solid #222;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.channel-tab:hover {
  color: #ccc;
  border-color: #333;
}

.channel-tab.active {
  color: #fff;
  border-color: #444;
  background: #1a1a1a;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Table section */
.table-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
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
