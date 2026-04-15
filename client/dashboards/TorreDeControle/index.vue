<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="sticky-header-wrap">
      <div class="main-header">
        <div class="header-title">
          <h1 class="main-title">Torre de Controle</h1>
          <span class="title-sep">|</span>
          <h2 class="main-subtitle">Relacionamento com Clientes</h2>
        </div>
        <div class="main-actions">
          <VToggleGroup v-model="produto" :options="produtoOptions" />
          <span v-if="lastUpdateTime" class="last-update">{{ lastUpdateTime }}</span>
          <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <div class="filter-group filter-group--search">
        <i data-lucide="search" class="filter-icon"></i>
        <input
          v-model="busca"
          type="text"
          class="filter-input"
          placeholder="Buscar cliente..."
        />
      </div>
      <div class="filter-group">
        <label class="filter-label">Squad</label>
        <select class="filter-select" v-model="squadSelecionado">
          <option value="todos">Todos</option>
          <option v-for="s in squadsDisponiveis" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Coordenador</label>
        <select class="filter-select" v-model="coordSelecionado">
          <option value="todos">Todos</option>
          <option v-for="c in coordsDisponiveis" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="filter-count">
        {{ clientesFiltrados.length }} cliente{{ clientesFiltrados.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Error -->
    <div v-if="error && !fases.length" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && !fases.length" class="loading-state">
      <i data-lucide="loader-2" class="spin"></i>
      <span>Carregando dados...</span>
    </div>

    <!-- Legenda + Tabela -->
    <template v-else>
      <div class="legenda">
        <span class="legenda-item"><span class="dot dot--verde"></span> Bom</span>
        <span class="legenda-item"><span class="dot dot--amarelo"></span> Mediano</span>
        <span class="legenda-item"><span class="dot dot--vermelho"></span> Ruim</span>
        <span class="legenda-item"><span class="dot dot--cinza"></span> Não ocorreu</span>
      </div>

      <TcMatrizTable
        :fases="fases"
        :clientes="clientesFiltrados"
        @click-dot="abrirDetalhe"
      />
    </template>
  </div>

  <!-- Painel de detalhes -->
  <TcDetalhePanel
    :visible="painelVisivel"
    :cliente="painelCliente"
    :fase="painelFase"
    @close="fecharDetalhe"
    @criar-oportunidade="handleCriarOportunidade"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useDashboardData } from '../../composables/useDashboardData.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import TcMatrizTable from './components/TcMatrizTable.vue'
import TcDetalhePanel from './components/TcDetalhePanel.vue'
import { mockData } from './mock-data.js'

const route = useRoute()
const { data, loading, error, fetchData } = useDashboardData('torre-de-controle')

const refreshing = ref(false)
const lastUpdateTime = ref('')

// Seleção de produto
const produto = ref('saber')
const produtoOptions = [
  { value: 'saber', label: 'Saber' },
  { value: 'ter', label: 'Ter', disabled: true },
  { value: 'executar', label: 'Executar', disabled: true },
]

// Painel de detalhes
const painelVisivel = ref(false)
const painelCliente = ref(null)
const painelFase = ref('')

function abrirDetalhe({ cliente, fase }) {
  painelCliente.value = cliente
  painelFase.value = fase
  painelVisivel.value = true
}

function fecharDetalhe() {
  painelVisivel.value = false
}

function handleCriarOportunidade({ cliente, fase, oportunidade }) {
  // TODO: integrar com endpoint do CRM quando disponível
  console.log('[Torre de Controle] Criar oportunidade no CRM:', { cliente: cliente.nome, fase, oportunidade })
  alert(`Criar no CRM:\n${oportunidade.titulo}\n\n(Integração a ser configurada)`)
}

// Filtros
const busca = ref('')
const squadSelecionado = ref('todos')
const coordSelecionado = ref('todos')

// ── Usa mock-data por padrão (API ainda não configurada)
// Remover esta flag quando a API estiver pronta e trocar por: 'mock-data' in route.query
const useMock = computed(() => true || 'mock-data' in route.query)

// ── Transforma dados da API no formato interno ──────────────────────────────
function transformApiData(raw) {
  if (!raw) return { fases: [], clientes: [] }

  // Formato esperado: { fases: [...], clientes: [...] }
  if (raw.fases && raw.clientes) return raw

  // Encapsulado: [{ data: { fases, clientes } }]
  if (Array.isArray(raw) && raw[0]?.data?.fases) return raw[0].data

  // Encapsulado: { data: { fases, clientes } }
  if (raw.data?.fases) return raw.data

  return { fases: [], clientes: [] }
}

const parsed = computed(() => {
  if (useMock.value) return mockData
  return transformApiData(data.value)
})

const fases = computed(() => parsed.value.fases || [])
const clientes = computed(() => parsed.value.clientes || [])

// ── Opções de filtro ─────────────────────────────────────────────────────────
const squadsDisponiveis = computed(() => {
  const set = new Set()
  for (const c of clientes.value) if (c.squad) set.add(c.squad)
  return [...set].sort()
})

const coordsDisponiveis = computed(() => {
  const set = new Set()
  for (const c of clientes.value) if (c.coordenador) set.add(c.coordenador)
  return [...set].sort()
})

// ── Clientes filtrados ───────────────────────────────────────────────────────
const clientesFiltrados = computed(() => {
  let lista = clientes.value
  if (busca.value.trim()) {
    const q = busca.value.trim().toLowerCase()
    lista = lista.filter(c => c.nome?.toLowerCase().includes(q))
  }
  if (squadSelecionado.value !== 'todos') {
    lista = lista.filter(c => c.squad === squadSelecionado.value)
  }
  if (coordSelecionado.value !== 'todos') {
    lista = lista.filter(c => c.coordenador === coordSelecionado.value)
  }
  return lista
})

// ── Utils ────────────────────────────────────────────────────────────────────
function formatTimestamp() {
  const now = new Date()
  const d = String(now.getDate()).padStart(2, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const y = now.getFullYear()
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${d}/${m}/${y} às ${h}:${min}`
}

async function handleRefresh() {
  refreshing.value = true
  await fetchData(true)
  refreshing.value = false
  lastUpdateTime.value = formatTimestamp()
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

watch(data, (newData) => {
  if (newData && !loading.value) lastUpdateTime.value = formatTimestamp()
})

onMounted(async () => {
  if (!useMock.value) await fetchData()
  lastUpdateTime.value = formatTimestamp()
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────────────────── */
.sticky-header-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: #0d0d0d; padding: 14px 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sticky-header-wrap .main-header {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  gap: 8px;
}
.header-title { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.title-sep { font-size: 20px; color: #333; font-weight: 300; }
.main-subtitle { font-size: 18px; font-weight: 400; color: #888; margin: 0; }
.last-update { font-size: 13px; color: #666; white-space: nowrap; }

/* ── Filters ─────────────────────────────────────────────────────────────── */
.filters-bar {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 8px; margin-bottom: 14px; margin-top: 16px;
}
.filter-group {
  display: flex; align-items: center; gap: 8px;
  background: #1a1a1a; border: 1px solid #222;
  border-radius: 6px; padding: 8px 14px;
}
.filter-group--search { min-width: 220px; }
.filter-icon { width: 14px; height: 14px; color: #555; flex-shrink: 0; }
.filter-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: #ccc; font-size: 13px; font-family: inherit;
}
.filter-input::placeholder { color: #555; }
.filter-label {
  font-size: 12px; color: #666; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
}
.filter-select {
  background: transparent; border: none; color: #ccc; font-size: 13px;
  font-weight: 500; font-family: inherit; cursor: pointer; outline: none;
  padding: 0 18px 0 4px; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0 center;
}
.filter-select option { background: #1a1a1a; color: #ccc; }
.filter-count {
  font-size: 12px; color: #555; margin-left: auto; white-space: nowrap;
}

/* ── Legenda ──────────────────────────────────────────────────────────────── */
.legenda {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 12px; padding: 0 2px;
}
.legenda-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #666;
}
.dot {
  display: inline-block; width: 10px; height: 10px; border-radius: 50%;
}
.dot--verde    { background-color: #22c55e; }
.dot--amarelo  { background-color: #f59e0b; }
.dot--vermelho { background-color: #ef4444; }
.dot--cinza    { background-color: #444; }

/* ── Loading ─────────────────────────────────────────────────────────────── */
.loading-state {
  display: flex; align-items: center; gap: 10px;
  color: #666; font-size: 14px; padding: 48px 0;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
