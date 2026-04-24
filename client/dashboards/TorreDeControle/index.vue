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
          <!-- Painel Geral: rota separada /torre-de-controle/painel,
               gated por feature flag 'tc_painel_geral' (admin tem acesso implicito).
               Usuarios sem acesso nao veem o botao e seguem vendo so a matriz. -->
          <RouterLink
            v-if="podeVerPainelGeral"
            to="/torre-de-controle/painel"
            class="btn btn-painel-geral"
          >
            <i data-lucide="layout-dashboard" class="btn-icon"></i>
            <span>Painel Geral</span>
          </RouterLink>
          <span v-if="syncInfoLabel" class="last-update">{{ syncInfoLabel }}</span>
          <button
            class="btn btn-atualizar"
            :disabled="syncAtivo"
            @click="abrirConfirmAtualizar"
            :title="syncAtivo ? 'Sincronizacao em andamento' : 'Buscar dados atualizados do Kommo'"
          >
            <i data-lucide="refresh-cw" class="btn-icon" :class="{ spin: syncAtivo }"></i>
            <span>{{ syncAtivo ? 'Atualizando...' : 'Atualizar Dados' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmacao de atualizacao de dados -->
    <div v-if="confirmAtualizarAberto" class="confirm-overlay" @click.self="confirmAtualizarAberto = false">
      <div class="confirm-box" role="dialog" aria-modal="true">
        <div class="confirm-icon">
          <i data-lucide="refresh-cw"></i>
        </div>
        <h3>Atualizar dados do Kommo?</h3>
        <p>
          Isso dispara uma sincronizacao completa com o Kommo — leads, empresas, usuarios e custom fields.
          O processo roda em segundo plano e costuma levar de <strong>30 segundos a 2 minutos</strong>.
        </p>
        <p class="confirm-hint">Novas analises nao sao disparadas nessa atualizacao — apenas os dados base.</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" @click="confirmAtualizarAberto = false">Cancelar</button>
          <button class="btn btn-primary" @click="confirmarAtualizar" :disabled="syncAtivo">
            <i data-lucide="refresh-cw" class="btn-icon"></i>
            Atualizar agora
          </button>
        </div>
      </div>
    </div>

    <!-- Matriz -->
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
        <VMultiSelect
          label="Account"
          :options="accountsDisponiveis"
          v-model="accountsSelecionados"
        />
        <VMultiSelect
          label="Tier"
          :options="tiersDisponiveis"
          v-model="tiersSelecionados"
        />
        <VMultiSelect
          label="Fase"
          :options="faseOptions"
          v-model="fasesSelecionadas"
          :searchable="false"
        />

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
            <div class="legenda-row"><span class="dot dot--verde"></span><span>Bom — score 9 ou 10</span></div>
            <div class="legenda-row"><span class="dot dot--amarelo"></span><span>Mediano — score 7 ou 8</span></div>
            <div class="legenda-row"><span class="dot dot--vermelho"></span><span>Ruim — score 6 ou abaixo</span></div>
            <div class="legenda-row"><span class="dot dot--cinza"></span><span>Auditavel, sem analise ainda</span></div>
            <div class="legenda-row"><span class="dot dot--incompleta-mini">?</span><span>Materiais insuficientes — coletar dados</span></div>
            <div class="legenda-row"><span class="dot dot--bloqueado-mini"></span><span>Bloqueada — fase atual ou futura</span></div>
            <div class="legenda-row"><span class="dot dot--atual-mini"></span><span>Anel branco = fase atual do lead</span></div>
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
        <!-- KPIs: indicadores das notas das analises (nota media, bom/mediano/ruim, cobertura) -->
        <TcMatrizKpis
          :clientes="clientesFiltrados"
          :fases="fasesMatriz"
        />
        <TcMatrizTable
          :fases="fasesMatriz"
          :clientes="clientesFiltrados"
          @click-dot="abrirDetalhe"
        />
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import TcMatrizTable from './components/TcMatrizTable.vue'
import TcMatrizKpis from './components/TcMatrizKpis.vue'
import TcSuperPainel from './components/TcSuperPainel.vue'
import VMultiSelect from '../../components/ui/VMultiSelect.vue'
import { useTorreControle } from './composables/useTorreControle.js'

const auth = useAuthStore()
const tc = useTorreControle()

// Painel Geral — feature flag no perfil do usuario. Admin sempre tem acesso implicito
// (enforce tambem no backend via /api/auth/check que injeta 'tc_painel_geral' em admin).
const podeVerPainelGeral = computed(() => {
  const features = auth.user?.features || []
  return auth.user?.role === 'admin' || features.includes('tc_painel_geral')
})

const legendaAberta = ref(false)
const loading = computed(() => tc.loading.value)
const error = computed(() => tc.error.value)

// Fases derivadas da resposta da matriz
const fasesMatriz = computed(() => {
  // Shape esperado do componente TcMatrizTable: [{ id, nome, ordem, slug }]
  return (tc.matriz.value.fases || []).map(f => ({
    id: f.id,
    nome: f.nome,
    ordem: f.ordem,
    slug: f.slug
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

// Clique na celula de fase da matriz (faseId vem direto do evento agora).
// `??` preserva faseId === 0 (valido no Kommo); `||` convertia em null silenciosamente.
function abrirDetalhe({ cliente, fase, faseId }) {
  if (cliente?.id == null) return
  const resolvedFaseId = faseId != null
    ? faseId
    : (tc.matriz.value.fases || []).find(f => f.nome === fase)?.id ?? null
  abrirSuperPainel(cliente, resolvedFaseId)
}

// Filtros (multi-select — arrays vazios = "mostrar todos")
const busca = ref('')
const accountsSelecionados = ref([])
const tiersSelecionados = ref([])
const fasesSelecionadas = ref([])
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

const faseOptions = computed(() =>
  fasesMatriz.value.map(f => ({ value: f.id, label: f.nome }))
)

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
  if (accountsSelecionados.value.length) {
    const sel = new Set(accountsSelecionados.value)
    lista = lista.filter(c => sel.has(c.account))
  }
  if (tiersSelecionados.value.length) {
    const sel = new Set(tiersSelecionados.value)
    lista = lista.filter(c => sel.has(c.tier))
  }
  if (fasesSelecionadas.value.length) {
    const sel = new Set(fasesSelecionadas.value.map(Number))
    lista = lista.filter(c => sel.has(Number(c.fase_atual_stage_id)))
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

const confirmAtualizarAberto = ref(false)

function abrirConfirmAtualizar() {
  if (syncAtivo.value) return
  confirmAtualizarAberto.value = true
  nextTick(() => window.lucide && window.lucide.createIcons())
}

async function confirmarAtualizar() {
  confirmAtualizarAberto.value = false
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
</script>

<style scoped>
.sticky-header-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: var(--bg-body); padding: 14px 0 12px;
  border-bottom: 1px solid var(--border-row);
}
.sticky-header-wrap .main-header {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  gap: 8px;
}
.header-title { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.title-sep { font-size: 20px; color: var(--border-input); font-weight: 300; }
.main-subtitle { font-size: 18px; font-weight: var(--font-weight-normal); color: var(--text-muted); margin: 0; }
.last-update { font-size: var(--font-size-md); color: var(--text-lowest); white-space: nowrap; }

.btn-atualizar {
  display: flex; align-items: center; gap: 6px;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--text-high);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-family: inherit; font-size: var(--font-size-md);
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
  background: var(--bg-inner); border: 1px solid var(--border-card);
  color: var(--text-medium); padding: 8px 14px;
  border-radius: var(--radius-md); font-family: inherit; font-size: var(--font-size-md);
  cursor: pointer; transition: all var(--transition-fast);
}
.btn-painel-geral:hover { background: var(--bg-toggle-active); color: var(--text-high); }
.btn-painel-geral.active {
  background: var(--color-primary); border-color: var(--color-primary); color: var(--text-high);
}
.btn-icon { width: 14px; height: 14px; }

.filters-bar {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 8px; margin-bottom: 14px; margin-top: 16px;
}
.filter-group {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-inner); border: 1px solid var(--border-row);
  border-radius: var(--radius-md); padding: 8px 14px;
}
.filter-group--search { min-width: 220px; }
.filter-icon { width: 14px; height: 14px; color: var(--text-lowest); flex-shrink: 0; }
.filter-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text-medium); font-size: var(--font-size-md); font-family: inherit;
}
.filter-input::placeholder { color: var(--text-lowest); }
.filter-label {
  font-size: var(--font-size-base); color: var(--text-lowest); font-weight: var(--font-weight-medium);
  text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
}
.filter-select {
  background: transparent; border: none; color: var(--text-medium); font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium); font-family: inherit; cursor: pointer; outline: none;
  padding: 0 18px 0 4px; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0 center;
}
.filter-select option { background: var(--bg-inner); color: var(--text-medium); }
.filter-count {
  font-size: var(--font-size-base); color: var(--text-lowest); margin-left: auto; white-space: nowrap;
}

.legenda {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 12px; padding: 0 2px; margin-top: 16px;
}
.legenda-item {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--font-size-base); color: var(--text-lowest);
}
.dot {
  display: inline-block; width: 10px; height: 10px; border-radius: 50%;
}
.dot--verde    { background-color: var(--color-safe); }
.dot--amarelo  { background-color: var(--color-care); }
.dot--vermelho { background-color: var(--color-danger); }
.dot--cinza    { background-color: var(--border-input); }
.dot--atual-mini {
  background-color: var(--border-input);
  outline: 2px solid var(--text-high);
  outline-offset: 2px;
}
.dot--bloqueado-mini {
  background-color: var(--border-card);
  opacity: 0.4;
}
.dot--incompleta-mini {
  background-color: var(--bg-inner);
  border: 1px solid var(--chart-color-neutral);
  color: var(--text-low);
  font-size: 8px;
  font-weight: var(--font-weight-bold);
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
  font-size: var(--font-size-base);
  color: var(--text-muted);
  white-space: nowrap;
}
.legenda-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-inner); border: 1px solid var(--border-card);
  color: var(--text-low); padding: 7px 12px;
  border-radius: var(--radius-md); font-family: inherit; font-size: var(--font-size-base);
  cursor: pointer; transition: all var(--transition-fast);
}
.legenda-btn:hover {
  background: var(--bg-toggle-active); color: var(--text-high);
  border-color: var(--border-input);
}
.legenda-btn .btn-icon { width: 14px; height: 14px; }
.legenda-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 280px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 30;
}
.legenda-popover::before {
  content: '';
  position: absolute;
  top: -6px; right: 24px;
  width: 10px; height: 10px;
  background: var(--bg-card);
  border-left: 1px solid var(--border-card);
  border-top: 1px solid var(--border-card);
  transform: rotate(45deg);
}
.legenda-title {
  font-size: var(--font-size-sm); color: var(--text-lowest);
  text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: var(--font-weight-bold); margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border-row);
}
.legenda-row {
  display: flex; align-items: center; gap: 10px;
  padding: 4px 0; font-size: var(--font-size-md); color: var(--text-medium);
}
.legenda-row .dot { flex-shrink: 0; }

.loading-state {
  display: flex; align-items: center; gap: 10px;
  color: var(--text-lowest); font-size: var(--font-size-lg); padding: 48px 0;
  justify-content: center;
}
.spin { animation: spin 1s linear infinite; }

.error-message {
  display: flex; align-items: center; gap: 10px;
  color: var(--color-danger); padding: var(--spacing-md);
  background: rgba(var(--color-danger-rgb), 0.1);
  border-radius: var(--radius-sm); margin: var(--spacing-md) 0;
}

.empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 48px 0; color: var(--text-lowest);
}
.empty i { width: 32px; height: 32px; color: var(--border-card); }
.empty p { margin: 0; }
.empty small { color: var(--text-lowest); }

/* ---- Modal de confirmacao (Atualizar Dados) ---- */
.confirm-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9500;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: cf-fade 150ms ease-out;
}
@keyframes cf-fade { from { opacity: 0; } to { opacity: 1; } }

.confirm-box {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  padding: 24px 24px 18px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
  animation: cf-in 180ms ease-out;
}
@keyframes cf-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.confirm-icon {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 12px;
}
.confirm-icon i { width: 22px; height: 22px; }

.confirm-box h3 {
  font-size: 16px; color: var(--text-high);
  font-weight: var(--font-weight-semibold); margin: 0 0 8px;
}
.confirm-box p {
  color: var(--text-medium); font-size: var(--font-size-md);
  line-height: 1.55; margin: 0 0 8px;
}
.confirm-hint {
  color: var(--text-muted) !important;
  font-size: var(--font-size-base) !important;
  font-style: italic;
}
.confirm-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 16px;
}
.confirm-actions .btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: var(--radius-md);
  font-family: inherit; font-size: var(--font-size-md); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast);
}
.confirm-actions .btn-ghost {
  background: transparent; border: 1px solid var(--border-card); color: var(--text-medium);
}
.confirm-actions .btn-ghost:hover { background: var(--bg-toggle-active); color: var(--text-high); }
.confirm-actions .btn-primary {
  background: var(--color-primary); border: 1px solid var(--color-primary); color: var(--text-high);
}
.confirm-actions .btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark); border-color: var(--color-primary-dark);
}
.confirm-actions .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed;
}
.confirm-actions .btn-icon { width: 14px; height: 14px; }
</style>
