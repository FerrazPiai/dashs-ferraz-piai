<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <h1 class="main-title">Taxa de Conversão Saber → Ter/Executar</h1>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">
          Última atualização: {{ lastUpdateTime }}
        </span>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Loading Message -->
    <div v-if="loading" class="loading-message">
      <span class="spinner spinner-lg"></span>
      <p>Carregando dados... Isso pode levar até 2 minutos.</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Scorecards -->
    <div class="scorecards">
      <VScorecard
        label="Total de Clientes Saber"
        :value="totalLeads"
        :formatter="formatNumber"
        :loading="loading"
        icon="users"
      />
      <VScorecard
        label="Clientes Monetizados"
        :value="totalMonetizados"
        :formatter="formatNumber"
        :loading="loading"
        icon="dollar-sign"
      />
      <VScorecard
        label="Taxa de Conversão Média"
        :value="avgConversion"
        :formatter="formatPercentage"
        :loading="loading"
        icon="trending-up"
      />
    </div>

    <!-- Safra Chart -->
    <VChartCard title="Evolução da Conversão Saber → Ter/Executar" :loading="loading">
      <SafraChart v-if="!loading && safraData.length > 0" :data="safraData" />
    </VChartCard>

    <!-- Tier Chart -->
    <VChartCard title="Conversão por Tier" :loading="loading">
      <template #actions>
        <VToggleGroup
          v-model="tierView"
          :options="tierViewOptions"
        />
      </template>
      <TierChart
        v-if="!loading && tierChartData"
        :data="tierChartData"
        :view="tierView"
      />
    </VChartCard>

    <!-- Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Detalhamento</h3>
        <VToggleGroup
          v-model="tableView"
          :options="tableViewOptions"
        />
      </div>
      <div class="card-body">
        <!-- Tabela Consolidada -->
        <div v-if="tableView === 'consolidated'" class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Safra</th>
                <th class="text-right">Total de Clientes Saber</th>
                <th class="text-right">Clientes Monetizados</th>
                <th class="text-right">Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody v-if="!loading && consolidadoData.length > 0">
              <tr v-for="row in consolidadoData" :key="row.safra">
                <td>{{ row.safra }}</td>
                <td class="text-right">{{ formatNumber(row.count_leads) }}</td>
                <td class="text-right">{{ formatNumber(row.count_leads_monetizados) }}</td>
                <td class="text-right">{{ formatPercentage(row.convertion_rate) }}</td>
              </tr>
            </tbody>
            <tbody v-else-if="loading">
              <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                  <span class="spinner spinner-lg"></span>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                  Nenhum dado disponível
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabela Por Tier -->
        <div v-else-if="tableView === 'by-tier'" class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Safra</th>
                <th>Tier</th>
                <th class="text-right">Total de Clientes Saber</th>
                <th class="text-right">Clientes Monetizados</th>
                <th class="text-right">Taxa de Conversão</th>
              </tr>
            </thead>
            <tbody v-if="!loading && tierTableData.length > 0">
              <tr v-for="row in tierTableData" :key="row.safra + '|' + row.tier">
                <td>{{ row.safra }}</td>
                <td>{{ row.tier }}</td>
                <td class="text-right">{{ row.total }}</td>
                <td class="text-right">{{ row.monet }}</td>
                <td class="text-right">{{ formatPercentage(row.rate) }}</td>
              </tr>
            </tbody>
            <tbody v-else-if="loading">
              <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                  <span class="spinner spinner-lg"></span>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                  Nenhum dado disponível
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabela Por Cliente -->
        <div v-else-if="tableView === 'by-client'" class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Company ID</th>
                <th>Lead</th>
                <th>Safra</th>
                <th>Tier</th>
                <th class="text-center">Monetizado</th>
              </tr>
            </thead>
            <tbody v-if="!loading && clientTableData.length > 0">
              <tr v-for="row in clientTableData" :key="row.lead_id">
                <td>{{ row.company_id }}</td>
                <td>{{ row.lead_name }}</td>
                <td>{{ row.safra }}</td>
                <td>{{ row.tier }}</td>
                <td class="text-center">
                  <span v-if="row.monetizado" style="color: #22c55e;">✓</span>
                  <span v-else style="color: #666;">-</span>
                </td>
              </tr>
            </tbody>
            <tbody v-else-if="loading">
              <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                  <span class="spinner spinner-lg"></span>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                  Nenhum dado disponível
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    message="A atualização dos dados pode levar até 10 minutos. Durante esse período, outros usuários não poderão solicitar uma nova atualização. Deseja continuar?"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useDashboardData } from '@/composables/useDashboardData'
import { formatNumber, formatPercentage } from '@/composables/useFormatters'
import VScorecard from '@/components/ui/VScorecard.vue'
import VRefreshButton from '@/components/ui/VRefreshButton.vue'
import VConfirmModal from '@/components/ui/VConfirmModal.vue'
import VToggleGroup from '@/components/ui/VToggleGroup.vue'
import VDataTable from '@/components/ui/VDataTable.vue'
import VChartCard from '@/components/charts/VChartCard.vue'
import SafraChart from './components/SafraChart.vue'
import TierChart from './components/TierChart.vue'
import config from './config'

// Dashboard data
const { data, loading, error, fetchData } = useDashboardData(config.id)

// Last update timestamp
const lastUpdateTime = ref('')

// Toggle states
const tierView = ref('consolidated')
const tableView = ref('consolidated')

const tierViewOptions = [
  { value: 'consolidated', label: 'Consolidado' },
  { value: 'by-safra', label: 'Por Safra' }
]

const tableViewOptions = [
  { value: 'consolidated', label: 'Consolidado' },
  { value: 'by-tier', label: 'Por Tier' },
  { value: 'by-client', label: 'Por Cliente' }
]

// Scorecards computed
const totalLeads = computed(() => {
  if (!data.value?.data?.leads_saber) return 0
  return data.value.data.leads_saber.length
})

const totalMonetizados = computed(() => {
  if (!data.value?.data?.leads_monetizacao) return 0
  // Contar company_id únicos (ignorar null/undefined)
  const uniqueCompanies = new Set(
    data.value.data.leads_monetizacao
      .map(lead => lead.company_id)
      .filter(id => id != null && id !== '')
  )
  return uniqueCompanies.size
})

const avgConversion = computed(() => {
  if (totalLeads.value === 0) return 0
  return totalMonetizados.value / totalLeads.value
})

// Consolidado data recalculado com company_id único
const consolidadoData = computed(() => {
  if (!data.value?.data) return []

  const leadsSaber = data.value.data.leads_saber || []
  const leadsMonetizacao = data.value.data.leads_monetizacao || []

  // Mapear lead_id para safra
  const leadToSafra = {}
  leadsSaber.forEach(lead => {
    leadToSafra[lead.lead_id] = lead.lead_created_at_safra
  })

  // Agrupar por safra
  const grouped = {}

  // Contar total de leads por safra
  leadsSaber.forEach(lead => {
    const safra = lead.lead_created_at_safra
    if (!grouped[safra]) {
      grouped[safra] = {
        safra,
        count_leads: 0,
        monetizedCompanies: new Set()
      }
    }
    grouped[safra].count_leads++
  })

  // Contar company_id únicos monetizados por safra
  leadsMonetizacao.forEach(lead => {
    const safra = leadToSafra[lead.lead_id]
    const companyId = lead.company_id

    // Adicionar apenas se company_id for válido
    if (safra && grouped[safra] && companyId != null && companyId !== '') {
      grouped[safra].monetizedCompanies.add(companyId)
    }
  })

  // Converter para array com taxa de conversão
  return Object.values(grouped)
    .map(item => ({
      safra: item.safra,
      count_leads: item.count_leads,
      count_leads_monetizados: item.monetizedCompanies.size,
      convertion_rate: item.count_leads > 0
        ? item.monetizedCompanies.size / item.count_leads
        : 0
    }))
    .sort((a, b) => {
      // Ordenação DECRESCENTE por safra (mais recente primeiro)
      const [monthA, yearA] = a.safra.split('/').map(Number)
      const [monthB, yearB] = b.safra.split('/').map(Number)
      if (yearA !== yearB) return yearB - yearA  // DESC
      return monthB - monthA  // DESC
    })
})

// Safra chart data (ordem CRESCENTE para gráfico de evolução)
const safraData = computed(() => {
  // Inverter a ordem do consolidadoData (que é DESC) para ficar ASC no gráfico
  return [...consolidadoData.value].sort((a, b) => {
    const [monthA, yearA] = a.safra.split('/').map(Number)
    const [monthB, yearB] = b.safra.split('/').map(Number)
    if (yearA !== yearB) return yearA - yearB  // ASC
    return monthA - monthB  // ASC
  })
})

// Tier chart data
const tierChartData = computed(() => {
  if (!data.value?.data) return null
  return buildTierData(data.value)
})

// Tier table data
const tierTableData = computed(() => {
  if (!data.value?.data) return []

  const leadsSaber = data.value.data.leads_saber || []
  const leadsMonetizacao = data.value.data.leads_monetizacao || []

  // Mapa de ordem hierárquica dos tiers
  const tierOrder = {
    'Enterprise - 480 Mi (Ano)': 1,
    'Large - 50 a 480 Mi (Ano)': 2,
    'Medium - 2.4 a 50 Mi (Ano)': 3,
    'Small - 1.2 a 2.4 Mi': 4,
    'Tiny - Ate 1.2 Mi': 5,
    'Sem Tier': 6
  }

  // Map lead_id to tier info from saber
  const tierMap = {}
  leadsSaber.forEach(lead => {
    tierMap[lead.lead_id] = {
      tier: lead.lead_tier || 'Sem Tier',
      safra: lead.lead_created_at_safra
    }
  })

  // Group by safra + tier
  const grouped = {}

  // Count all leads from saber
  leadsSaber.forEach(lead => {
    const safra = lead.lead_created_at_safra
    const tier = lead.lead_tier || 'Sem Tier'
    const key = `${safra}|${tier}`

    if (!grouped[key]) {
      grouped[key] = { safra, tier, total: 0, monet: 0 }
    }
    grouped[key].total++
  })

  // Count monetized leads (unique by company_id)
  const monetizedCompanies = {}
  leadsMonetizacao.forEach(lead => {
    const info = tierMap[lead.lead_id]
    const companyId = lead.company_id

    // Adicionar apenas se company_id for válido
    if (info && companyId != null && companyId !== '') {
      const key = `${info.safra}|${info.tier}`

      if (!monetizedCompanies[key]) {
        monetizedCompanies[key] = new Set()
      }
      monetizedCompanies[key].add(companyId)
    }
  })

  // Set monet count based on unique companies
  Object.keys(monetizedCompanies).forEach(key => {
    if (grouped[key]) {
      grouped[key].monet = monetizedCompanies[key].size
    }
  })

  // Convert to array and calculate rates
  return Object.values(grouped)
    .map(item => ({
      safra: item.safra,
      tier: item.tier,
      total: item.total,
      monet: item.monet,
      rate: item.total > 0 ? item.monet / item.total : 0,
      tier_order: tierOrder[item.tier] || 6
    }))
    .sort((a, b) => {
      // Primeiro: Safra DECRESCENTE (mais recente primeiro)
      const [monthA, yearA] = a.safra.split('/').map(Number)
      const [monthB, yearB] = b.safra.split('/').map(Number)
      if (yearA !== yearB) return yearB - yearA  // DESC
      if (monthA !== monthB) return monthB - monthA  // DESC

      // Segundo: Tier hierárquico (Enterprise → Sem Tier)
      return a.tier_order - b.tier_order
    })
})

// Client table data
const clientTableData = computed(() => {
  if (!data.value?.data) return []

  const leadsSaber = data.value.data.leads_saber || []
  const leadsMonetizacao = data.value.data.leads_monetizacao || []

  // Mapa de ordem hierárquica dos tiers
  const tierOrder = {
    'Enterprise - 480 Mi (Ano)': 1,
    'Large - 50 a 480 Mi (Ano)': 2,
    'Medium - 2.4 a 50 Mi (Ano)': 3,
    'Small - 1.2 a 2.4 Mi': 4,
    'Tiny - Ate 1.2 Mi': 5,
    'Sem Tier': 6
  }

  // Criar map de lead_id para company_id e data de monetização
  const monetizadosMap = {}
  leadsMonetizacao.forEach(lead => {
    monetizadosMap[lead.lead_id] = {
      company_id: lead.company_id,
      data_monetizacao: lead.created_at || lead.data_criacao || '-'
    }
  })

  // Criar array de clientes (um por lead do Saber)
  const clients = leadsSaber.map(lead => {
    const leadId = lead.lead_id
    const monetInfo = monetizadosMap[leadId]
    const dataSaber = lead.lead_created_at || lead.created_at || '-'

    return {
      lead_id: leadId,
      lead_name: lead.lead_name || lead.name || '-',
      company_id: lead.company_id || '-',  // Company ID vem do Saber, não da monetização
      safra: lead.lead_created_at_safra,
      tier: lead.lead_tier || 'Sem Tier',
      data_lead_saber_sort: (() => { const d = dataSaber !== '-' ? new Date(dataSaber) : null; return d && !isNaN(d) ? d : new Date(0) })(),
      monetizado: !!monetInfo,
      tier_order: tierOrder[lead.lead_tier] || 6
    }
  })

  // Ordenar: 1º Data DESC, 2º Tier ASC
  return clients.sort((a, b) => {
    // Primeiro: Data DECRESCENTE (mais recente primeiro)
    const dateCompare = b.data_lead_saber_sort - a.data_lead_saber_sort
    if (dateCompare !== 0) return dateCompare

    // Segundo: Tier hierárquico (Enterprise → Sem Tier)
    return a.tier_order - b.tier_order
  })
})

// Tier chart data transformation
function buildTierData(rawData) {
  const leadsSaber = rawData.data.leads_saber || []
  const leadsMonetizacao = rawData.data.leads_monetizacao || []

  const tierFromSaber = {}
  leadsSaber.forEach(lead => {
    tierFromSaber[lead.lead_id] = {
      tier: lead.lead_tier || 'Sem Tier',
      safra: lead.lead_created_at_safra
    }
  })

  const grouped = {}
  leadsSaber.forEach(lead => {
    const safra = lead.lead_created_at_safra
    const tier = lead.lead_tier || 'Sem Tier'
    const key = `${safra}|${tier}`
    if (!grouped[key]) grouped[key] = { safra, tier, total: 0, monet: 0 }
    grouped[key].total++
  })

  // Count monetized leads (unique by company_id)
  const monetizedCompanies = {}
  leadsMonetizacao.forEach(lead => {
    const saberInfo = tierFromSaber[lead.lead_id]
    const companyId = lead.company_id

    // Adicionar apenas se company_id for válido
    if (saberInfo && companyId != null && companyId !== '') {
      const key = `${saberInfo.safra}|${saberInfo.tier}`

      if (!monetizedCompanies[key]) {
        monetizedCompanies[key] = new Set()
      }
      monetizedCompanies[key].add(companyId)
    }
  })

  // Set monet count based on unique companies
  Object.keys(monetizedCompanies).forEach(key => {
    if (grouped[key]) {
      grouped[key].monet = monetizedCompanies[key].size
    }
  })

  return Object.values(grouped)
}

// Format timestamp
const formatTimestamp = () => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} às ${hours}:${minutes}`
}

// ── Update confirmation modal state ──────────────────────────────────────────
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

// Handlers
async function handleRefresh() {
  // Check if another update is already in progress
  try {
    const statusRes = await fetch('/api/update-status/tx-conv-saber-monetizacao')
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
  loading.value = true

  // Step 1: POST trigger webhook para N8N regenerar os dados
  try {
    const res = await fetch('/api/tx-conv-saber-monetizacao/trigger-update')
    if (!res.ok) {
      if (res.status === 409) {
        loading.value = false
        showUpdatingModal.value = true
        return
      }
      console.warn('[Tx Conv Saber] Webhook de atualização retornou', res.status)
    }
  } catch (err) {
    console.warn('[Tx Conv Saber] Falha ao chamar webhook de atualização:', err.message)
  }

  // Step 2: GET dados atualizados (bypassa cache)
  await fetchData(true)
  lastUpdateTime.value = formatTimestamp()
}

// Initialize
onMounted(() => {
  fetchData()
})

// Update timestamp when data loads successfully
watch(data, (newData) => {
  if (newData && !loading.value) {
    lastUpdateTime.value = formatTimestamp()
  }
})

// Re-initialize Lucide icons when error changes
watch(error, () => {
  setTimeout(() => {
    if (window.lucide) {
      window.lucide.createIcons()
    }
  }, 0)
})
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  color: var(--color-danger);
}

.error-message i {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.last-update {
  font-size: 13px;
  color: #999;
  margin-right: 16px;
  white-space: nowrap;
}

.loading-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 60px 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
}

.scorecards {
  margin-bottom: 0;
}

.loading-message p {
  color: #ccc;
  font-size: 14px;
  margin: 0;
}

.loading-message .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ff0000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
