<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Marketing & Vendas</h1>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">
          Última atualização: {{ lastUpdateTime }}
        </span>
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Trigger Error -->
    <div v-if="triggerError" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ triggerError }}</span>
    </div>

    <!-- Data Error (only when no fallback data) -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Tables -->
    <div class="sections">
      <MvSectionTable
        title="Visão por Tier"
        icon="layers"
        type="tier"
        :rows="tierData"
        :loading="loading"
      />
      <MvSectionTable
        title="Visão por Analista"
        icon="users"
        type="analyst"
        :rows="analistaData"
        :loading="loading"
      />
      <MvSectionTable
        title="Visão por Canal"
        icon="radio-tower"
        type="canal"
        :rows="canalData"
        :loading="loading"
      />
      <MvListagemTable
        :rows="listagemData"
        :loading="loading"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import MvSectionTable from './components/MvSectionTable.vue'
import MvListagemTable from './components/MvListagemTable.vue'
import { MOCK_DATA } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('marketing-vendas')

// ──────────────────────────────────────────────
// Data Transformation (webhook → UI format)
// Webhook returns: { kpis, funil, listagem }
// UI expects:      { tiers, analistas, canais, listagem }
// ──────────────────────────────────────────────

const CANAL_META = {
  'Lead Broker': { icon: 'users',          color: '#14b8a6' },
  'Black Box':   { icon: 'box',            color: '#888'    },
  'Eventos':     { icon: 'calendar',       color: '#a855f7' },
  'Outros':      { icon: 'more-horizontal',color: '#666'    },
}

function avgTicketColor(value) {
  if (value >= 30000) return 'green'
  if (value >= 15000) return 'yellow'
  if (value >= 5000)  return 'orange'
  return 'red'
}

function transformApiData(raw) {
  if (!raw || (!raw.kpis && !raw.funil)) return null

  const kpis    = raw.kpis    ?? []
  const funil   = raw.funil   ?? []
  const listagem = raw.listagem ?? []

  // ── Tiers — aggregate from funil, grouped by tier ──
  const tierMap = new Map()
  funil
    .filter(r => !r.is_empty_row && !r.is_total && r.tier)
    .forEach(r => {
      if (!tierMap.has(r.tier)) {
        tierMap.set(r.tier, { name: r.tier, investimento: 0, prospects: 0, leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
      }
      const t = tierMap.get(r.tier)
      t.leads      += Number(r.leads)   || 0
      t.agendadas  += Number(r.mql)     || 0
      t.realizadas += Number(r.sql)     || 0
      t.contratos  += Number(r.sal)     || 0
      t.booking    += Number(r.booking) || 0
    })

  const tiers = [...tierMap.values()].map(t => {
    const avg = t.contratos > 0 ? Math.round(t.booking / t.contratos) : 0
    return { ...t, avgTicket: avg, avgTicketColor: avgTicketColor(avg), trend: null, trendDir: null }
  })

  // ── Analistas — aggregate from funil, grouped by closer ──
  const analistaMap = new Map()
  funil
    .filter(r => !r.is_empty_row && !r.is_total && r.closer)
    .forEach(r => {
      const name = r.closer
      if (!analistaMap.has(name)) {
        analistaMap.set(name, { name, avatar: name.slice(0, 2).toUpperCase(), investimento: 0, trend: null, trendDir: null, prospects: 0, leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
      }
      const a = analistaMap.get(name)
      a.leads      += Number(r.leads)   || 0
      a.agendadas  += Number(r.mql)     || 0
      a.realizadas += Number(r.sql)     || 0
      a.contratos  += Number(r.sal)     || 0
      a.booking    += Number(r.booking) || 0
    })

  const analistas = [...analistaMap.values()].map(a => {
    const avg = a.contratos > 0 ? Math.round(a.booking / a.contratos) : 0
    return { ...a, avgTicket: avg, avgTicketColor: avgTicketColor(avg) }
  })

  // ── Canais — aggregate from kpis, grouped by canal ──
  const canalMap = new Map()
  kpis.forEach(r => {
    const canal = r.canal
    if (!canalMap.has(canal)) {
      const meta = CANAL_META[canal] ?? { icon: 'radio-tower', color: '#888' }
      canalMap.set(canal, { name: canal, icon: meta.icon, iconColor: meta.color, investimento: 0, trend: null, trendDir: null, prospects: 0, leads: 0, agendadas: 0, realizadas: 0, contratos: 0, booking: 0 })
    }
    const c = canalMap.get(canal)
    c.leads      += Number(r.leads_value)   || 0
    c.agendadas  += Number(r.mql_value)     || 0
    c.realizadas += Number(r.sql_value)     || 0
    c.contratos  += Number(r.commit_value)  || 0
    c.booking    += Number(r.booking_value) || 0
  })

  const canais = [...canalMap.values()].map(c => {
    const avg = c.contratos > 0 ? Math.round(c.booking / c.contratos) : 0
    return { ...c, avgTicket: avg, avgTicketColor: avgTicketColor(avg) }
  })

  return { tiers, analistas, canais, listagem }
}

// ──────────────────────────────────────────────
// Computed
// ──────────────────────────────────────────────

const resolvedData = computed(() => {
  if (data.value) return transformApiData(data.value)
  if (import.meta.env.DEV) return MOCK_DATA
  return null
})

const tierData     = computed(() => resolvedData.value?.tiers    ?? [])
const analistaData = computed(() => resolvedData.value?.analistas ?? [])
const canalData    = computed(() => resolvedData.value?.canais   ?? [])
const listagemData = computed(() => resolvedData.value?.listagem ?? [])

// ──────────────────────────────────────────────
// Refresh — two-step: POST trigger → GET data
// ──────────────────────────────────────────────

const lastUpdateTime = ref(null)
const refreshing     = ref(false)
const triggerError   = ref(null)

async function handleRefresh() {
  triggerError.value = null
  refreshing.value   = true

  try {
    // Step 1: Trigger N8N webhook to regenerate the data
    const res = await fetch('/api/marketing-vendas/trigger-update')
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message || `Webhook retornou HTTP ${res.status}`)
    }

    // Step 2: Fetch fresh data from the API (bypasses cache)
    await fetchData(true)
    lastUpdateTime.value = formatDateTime(new Date().toISOString())
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  } catch (err) {
    triggerError.value = err.message
  } finally {
    refreshing.value = false
  }
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

.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
