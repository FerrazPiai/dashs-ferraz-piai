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
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State (only show when no fallback data is available) -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import MvSectionTable from './components/MvSectionTable.vue'
import { MOCK_DATA } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('marketing-vendas')

const resolvedData = computed(() => {
  if (data.value) return data.value
  if (import.meta.env.DEV) return MOCK_DATA
  return null
})

const tierData = computed(() => resolvedData.value?.tiers ?? [])
const analistaData = computed(() => resolvedData.value?.analistas ?? [])
const canalData = computed(() => resolvedData.value?.canais ?? [])

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

.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
