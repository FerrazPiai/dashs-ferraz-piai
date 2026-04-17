<template>
  <div class="dashboard-container">
    <div class="sticky-header-wrap">
      <div class="main-header">
        <div class="header-title">
          <h1 class="main-title">Torre de Controle</h1>
          <span class="title-sep">|</span>
          <h2 class="main-subtitle">Pipeline Saber — Kommo</h2>
        </div>
        <div class="main-actions">
          <button
            v-if="isAdmin"
            class="btn btn-painel-geral"
            :class="{ active: modo === 'painel-geral' }"
            @click="modo = modo === 'painel-geral' ? 'matriz' : 'painel-geral'"
          >
            <i data-lucide="layout-dashboard" class="btn-icon"></i>
            <span>{{ modo === 'painel-geral' ? 'Voltar a Matriz' : 'Painel Geral' }}</span>
          </button>
          <span v-if="syncInfoLabel" class="last-update">{{ syncInfoLabel }}</span>
          <button
            class="btn btn-atualizar"
            :disabled="syncAtivo"
            @click="atualizarKommo"
            :title="syncAtivo ? 'Sincronizacao em andamento' : 'Buscar dados atualizados do Kommo'"
          >
            <i data-lucide="refresh-cw" class="btn-icon" :class="{ spin: syncAtivo }"></i>
            <span>{{ syncAtivo ? 'Atualizando...' : 'Atualizar Kommo' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Painel Geral (admin) -->
    <TcPainelGeral
      v-if="modo === 'painel-geral' && isAdmin"
      @abrir-cliente="abrirPorId"
    />

    <!-- Matriz (default) -->
    <template v-else>
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
          <label class="filter-label">Account</label>
          <select class="filter-select" v-model="accountSelecionado">
            <option value="todos">Todos</option>
            <option v-for="a in accountsDisponiveis" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Tier</label>
          <select class="filter-select" v-model="tierSelecionado">
            <option value="todos">Todos</option>
            <option v-for="t in tiersDisponiveis" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Fase</label>
          <select class="filter-select" v-model="faseSelecionada">
            <option value="todas">Todas</option>
            <option v-for="f in fasesMatriz" :key="f.id" :value="f.id">{{ f.nome }}</option>
          </select>
        </div>

        <div class="filter-spacer"></div>

        <span class="count-inline">{{ clientesFiltrados.length }} clientes</span>

        <button
          class="legenda-btn"
          @click="toggleOrdenacao"
          :title="ordenacaoLabel"
        >
          <i :data-lucide="ordenacao === 'fase-desc' ? 'arrow-down-narrow-wide' : ordenacao === 'fase-asc' ? 'arrow-up-narrow-wide' : 'arrow-down-up'" class="btn-icon"></i>
          <span>{{ ordenacaoLabel }}</span>
        </button>

        <div class="legenda-tooltip-wrap">
          <button class="legenda-btn" @mouseenter="legendaAberta = true" @mouseleave="legendaAberta = false" @click="legendaAberta = !legendaAberta">
            <i data-lucide="info" class="btn-icon"></i>
            <span>Legenda das cores</span>
          </button>
          <div v-if="legendaAberta" class="legenda-popover" @mouseenter="legendaAberta = true" @mouseleave="legendaAberta = false">
            <div class="legenda-title">Legenda da matriz</div>
            <div class="legenda-row"><span class="dot dot--verde"></span><span>Bom — score ≥ 7</span></div>
            <div class="legenda-row"><span class="dot dot--amarelo"></span><span>Mediano — score 5 a 7</span></div>
            <div class="legenda-row"><span class="dot dot--vermelho"></span><span>Ruim — score &lt; 5</span></div>
            <div class="legenda-row"><span class="dot dot--cinza"></span><span>Auditavel, sem analise ainda</span></div>
            <div class="legenda-row"><span class="dot dot--incompleta-mini">?</span><span>Materiais insuficientes — coletar dados</span></div>
            <div class="legenda-row"><span class="dot dot--bloqueado-mini"></span><span>Bloqueada — fase atual ou futura</span></div>
            <div class="legenda-row"><span class="dot dot--atual-mini"></span><span>Anel vermelho = fase atual do lead</span></div>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-message">
        <i data-lucide="alert-circle"></i>
        <span>{{ error }}</span>
      </div>

      <div v-else-if="loading && !clientes.length" class="loading-state">
        <i data-lucide="loader-2" class="spin"></i>
        <span>Carregando dados do Kommo...</span>
      </div>

      <div v-else-if="!clientes.length" class="empty">
        <i data-lucide="inbox"></i>
        <p>Nenhum cliente no pipeline Saber.</p>
        <small>Verifique a configuracao do Kommo (.env) ou cadastre leads no pipeline.</small>
      </div>

      <template v-else>
        <TcMatrizTable
          :fases="fasesMatriz"
          :clientes="clientesFiltrados"
          @click-dot="abrirDetalhe"
        />
      </template>
    </template>
  </div>

  <TcSuperPainel
    v-if="superPainelAberto && superPainelCliente"
    :cliente="superPainelCliente"
    :fases="superPainelFases"
    :fase-inicial="superPainelFaseInicial"
    :lead-id="superPainelLeadId"
    @close="fecharSuperPainel"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import TcMatrizTable from './components/TcMatrizTable.vue'
import TcSuperPainel from './components/TcSuperPainel.vue'
import TcPainelGeral from './components/TcPainelGeral.vue'
import { useTorreControle } from './composables/useTorreControle.js'

const auth = useAuthStore()
const tc = useTorreControle()

const isAdmin = computed(() => ['admin', 'board'].includes(auth.user?.role || ''))

const modo = ref('matriz') // default: matriz
const legendaAberta = ref(false)
const loading = computed(() => tc.loading.value)
const error = computed(() => tc.error.value)

// Fases derivadas da resposta da matriz
const fasesMatriz = computed(() => {
  // Shape esperado do componente TcMatrizTable: [{ nome, ordem }]
  return (tc.matriz.value.fases || []).map(f => ({
    id: f.id,
    nome: f.nome,
    ordem: f.ordem
  }))
})

const clientes = computed(() => tc.matriz.value.clientes || [])

// Super Painel state
const superPainelAberto = ref(false)
const superPainelCliente = ref(null)
const superPainelFases = ref([])
const superPainelFaseInicial = ref(null)
const superPainelLeadId = ref('')

function abrirSuperPainel(cliente, faseId = null) {
  if (!cliente) return
  superPainelCliente.value = cliente
  superPainelFases.value = tc.matriz.value.fases || []
  superPainelFaseInicial.value = faseId
  superPainelLeadId.value = String(cliente.lead_id || cliente.id_externo || cliente.id || '')
  superPainelAberto.value = true
}

function fecharSuperPainel() {
  superPainelAberto.value = false
  superPainelCliente.value = null
}

// Clique na celula de fase da matriz (faseId vem direto do evento agora)
function abrirDetalhe({ cliente, fase, faseId }) {
  if (!cliente?.id) return
  const resolvedFaseId = faseId != null
    ? faseId
    : (tc.matriz.value.fases || []).find(f => f.nome === fase)?.id || null
  abrirSuperPainel(cliente, resolvedFaseId)
}

// Abrir por id (do Painel Geral)
function abrirPorId(clienteId) {
  const cliente = clientes.value.find(c => c.id === clienteId)
  if (cliente) abrirSuperPainel(cliente)
}

// Filtros
const busca = ref('')
const accountSelecionado = ref('todos')
const tierSelecionado = ref('todos')
const faseSelecionada = ref('todas')
const ordenacao = ref('default') // default | fase-desc | fase-asc

const accountsDisponiveis = computed(() => {
  const set = new Set()
  for (const c of clientes.value) if (c.account) set.add(c.account)
  return [...set].sort()
})

const tiersDisponiveis = computed(() => {
  const set = new Set()
  for (const c of clientes.value) if (c.tier) set.add(c.tier)
  return [...set].sort()
})

const ordenacaoLabel = computed(() => {
  if (ordenacao.value === 'fase-desc') return 'Fase: maior → menor'
  if (ordenacao.value === 'fase-asc')  return 'Fase: menor → maior'
  return 'Ordenar'
})

function toggleOrdenacao() {
  ordenacao.value =
    ordenacao.value === 'default' ? 'fase-desc' :
    ordenacao.value === 'fase-desc' ? 'fase-asc' :
    'default'
  nextTick(() => window.lucide && window.lucide.createIcons())
}

const clientesFiltrados = computed(() => {
  let lista = clientes.value
  if (busca.value.trim()) {
    const q = busca.value.trim().toLowerCase()
    lista = lista.filter(c => c.nome?.toLowerCase().includes(q))
  }
  if (accountSelecionado.value !== 'todos') {
    lista = lista.filter(c => c.account === accountSelecionado.value)
  }
  if (tierSelecionado.value !== 'todos') {
    lista = lista.filter(c => c.tier === tierSelecionado.value)
  }
  if (faseSelecionada.value !== 'todas') {
    const fid = Number(faseSelecionada.value)
    lista = lista.filter(c => c.fase_atual_stage_id === fid)
  }
  if (ordenacao.value === 'fase-desc') {
    lista = [...lista].sort((a, b) => (b.fase_atual_ordem || 0) - (a.fase_atual_ordem || 0))
  } else if (ordenacao.value === 'fase-asc') {
    lista = [...lista].sort((a, b) => (a.fase_atual_ordem || 0) - (b.fase_atual_ordem || 0))
  }
  return lista
})

// Sync Kommo
const syncAtivo = computed(() => !!tc.syncStatus.value?.ativo)
const syncInfoLabel = computed(() => {
  const s = tc.syncStatus.value
  if (s?.ativo) return 'Sincronizando…'
  if (s?.ultima_sync_concluida) {
    const d = new Date(s.ultima_sync_concluida)
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `Atualizado ${dia}/${mes} às ${h}:${m}`
  }
  return ''
})

async function atualizarKommo() {
  try {
    await tc.dispararAtualizacao()
  } catch (err) {
    alert('Erro ao iniciar atualizacao: ' + err.message)
  }
}

onMounted(async () => {
  await tc.carregarMatriz()
  await tc.carregarStatusSync()
  // Se sync ja estava ativa quando o usuario entrou, comeca polling automatico
  if (tc.syncStatus.value?.ativo) {
    tc.iniciarPollingSync()
  }
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

onBeforeUnmount(() => {
  tc.pararPollingSync()
})

watch(modo, async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
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

.btn-atualizar {
  display: flex; align-items: center; gap: 6px;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: #fff;
  padding: 8px 14px;
  border-radius: 6px;
  font-family: inherit; font-size: 13px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.btn-atualizar:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}
.btn-atualizar:disabled {
  background-color: var(--bg-inner);
  border-color: var(--border-card);
  color: var(--text-low);
  cursor: not-allowed;
}
.btn-atualizar .btn-icon { width: 14px; height: 14px; }
.btn-atualizar .spin { animation: btn-spin 1s linear infinite; }
@keyframes btn-spin { to { transform: rotate(360deg); } }

.btn-painel-geral {
  display: flex; align-items: center; gap: 6px;
  background: #1a1a1a; border: 1px solid #2a2a2a;
  color: #ccc; padding: 8px 14px;
  border-radius: 6px; font-family: inherit; font-size: 13px;
  cursor: pointer; transition: all 150ms;
}
.btn-painel-geral:hover { background: #222; color: #fff; }
.btn-painel-geral.active {
  background: #ff0000; border-color: #ff0000; color: #fff;
}
.btn-icon { width: 14px; height: 14px; }

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

.legenda {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 12px; padding: 0 2px; margin-top: 16px;
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
.dot--atual-mini {
  background-color: #444;
  outline: 2px solid #ff0000;
  outline-offset: 2px;
}
.dot--bloqueado-mini {
  background-color: #2a2a2a;
  opacity: 0.4;
}
.dot--incompleta-mini {
  background-color: #1f2937;
  border: 1px solid #6b7280;
  color: #9ca3af;
  font-size: 8px;
  font-weight: 700;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
}

.filter-spacer { flex: 1; }
.legenda-tooltip-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.count-inline {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}
.legenda-btn {
  display: flex; align-items: center; gap: 6px;
  background: #1a1a1a; border: 1px solid #2a2a2a;
  color: #aaa; padding: 7px 12px;
  border-radius: 6px; font-family: inherit; font-size: 12px;
  cursor: pointer; transition: all 150ms;
}
.legenda-btn:hover {
  background: #222; color: #fff;
  border-color: #3a3a3a;
}
.legenda-btn .btn-icon { width: 14px; height: 14px; }
.legenda-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 280px;
  background: #141414;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 12px 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 30;
}
.legenda-popover::before {
  content: '';
  position: absolute;
  top: -6px; right: 24px;
  width: 10px; height: 10px;
  background: #141414;
  border-left: 1px solid rgba(255,255,255,0.1);
  border-top: 1px solid rgba(255,255,255,0.1);
  transform: rotate(45deg);
}
.legenda-title {
  font-size: 11px; color: #666;
  text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: 700; margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.legenda-row {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 0; font-size: 12.5px; color: #ccc;
}
.legenda-row .dot { flex-shrink: 0; }

.loading-state {
  display: flex; align-items: center; gap: 10px;
  color: #666; font-size: 14px; padding: 48px 0;
  justify-content: center;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error-message {
  display: flex; align-items: center; gap: 10px;
  color: var(--color-danger); padding: var(--spacing-md);
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm); margin: var(--spacing-md) 0;
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 48px 0; color: #666;
}
.empty i { width: 32px; height: 32px; color: #444; }
.empty p { margin: 0; }
.empty small { color: #555; }
</style>
