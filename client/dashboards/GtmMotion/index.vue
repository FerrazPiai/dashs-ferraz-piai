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
        <VToggleGroup
          v-model="currentChannel"
          :options="channelOptions"
        />
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State (only show when no fallback data is available) -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Motion Tabs -->
    <div class="motion-tabs">
      <button
        v-for="motion in motions"
        :key="motion.id"
        class="motion-tab"
        :class="{ active: currentMotionId === motion.id }"
        @click="currentMotionId = motion.id"
      >
        <span class="motion-dot" :class="`dot-${motion.color}`"></span>
        {{ motion.label }}
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
        :formatter="formatCurrency"
        :provisionado="kpis.avgTicket?.provisionado ?? null"
        :meta="kpis.avgTicket?.meta ?? null"
        :delta="kpis.avgTicket?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Booking"
        :value="kpis.booking?.value ?? null"
        :formatter="formatCurrency"
        :provisionado="kpis.booking?.provisionado ?? null"
        :meta="kpis.booking?.meta ?? null"
        :delta="kpis.booking?.delta ?? null"
        :loading="loading"
      />
    </div>

    <!-- Funnel Table -->
    <div class="table-section">
      <div class="table-header">
        <span class="table-motion-dot" :class="`dot-${currentMotion?.color}`"></span>
        <h3 class="table-title">
          {{ currentMotion?.label }} {{ currentChannelLabel }}
        </h3>
      </div>
      <GtmFunnelTable :tiers="currentTiers" :loading="loading" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatNumber, formatCurrency, formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import GtmScorecard from './components/GtmScorecard.vue'
import GtmFunnelTable from './components/GtmFunnelTable.vue'
import { MOCK_DATA } from './mock-data.js'

const { data, loading, error, fetchData, fromCache } = useDashboardData('gtm-motion')

const currentChannel = ref('inbound')
const currentMotionId = ref(null)

const channelOptions = [
  { value: 'inbound',  label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' }
]

const currentChannelLabel = computed(() =>
  channelOptions.find(o => o.value === currentChannel.value)?.label ?? ''
)

// Use API data or fall back to mock in dev
const resolvedData = computed(() => {
  if (data.value) return data.value
  if (import.meta.env.DEV) return MOCK_DATA
  return null
})

const motions = computed(() => resolvedData.value?.motions ?? [])

// Auto-select first motion when data loads
const currentMotion = computed(() =>
  motions.value.find(m => m.id === currentMotionId.value) ?? motions.value[0] ?? null
)

const currentChannelData = computed(() =>
  currentMotion.value?.channels?.[currentChannel.value] ?? null
)

const kpis = computed(() => currentChannelData.value?.kpis ?? {})

const currentTiers = computed(() => currentChannelData.value?.tiers ?? [])

// Timestamp of last successful load
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

/* Motion Tabs */
.motion-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.motion-tab {
  display: flex;
  align-items: center;
  gap: 8px;
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

.motion-tab:hover {
  color: #ccc;
  border-color: #333;
}

.motion-tab.active {
  color: #fff;
  border-color: #444;
  background: #1a1a1a;
}

.motion-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green  { background: #22c55e; }
.dot-yellow { background: #eab308; }
.dot-orange { background: #f97316; }
.dot-red    { background: #ef4444; }

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
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

.table-motion-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
</style>
