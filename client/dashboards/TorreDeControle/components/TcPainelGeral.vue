<script setup>
import { ref, onMounted, computed } from 'vue'
import TcTabColaboradores from './TcTabColaboradores.vue'
import TcTabTimeline from './TcTabTimeline.vue'
import VScorecard from '../../../components/ui/VScorecard.vue'
import VLoadingState from '../../../components/ui/VLoadingState.vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const emit = defineEmits(['abrir-cliente'])

const tc = useTorreControle()
const tabAtiva = ref('colaboradores')
const colaboradores = ref([])

const TABS = [
  { key: 'colaboradores', label: 'Accounts' },
  { key: 'timeline',      label: 'Timeline' }
]

const sc = computed(() => tc.painelGeral.value?.scorecards || {})
const clientesMatriz = computed(() => tc.matriz.value?.clientes || [])

async function carregarColaboradores() {
  try {
    const res = await fetch('/api/tc/colaboradores', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      colaboradores.value = data.colaboradores || []
    }
  } catch { /* silencioso */ }
}

onMounted(async () => {
  // Carrega painel geral (scorecards) + matriz (clientes com inicio_projeto/fase_atual).
  // allSettled: se um falha, o outro nao e abortado e o loading de cada um se resolve
  // corretamente (erro fica em tc.error.value, renderizado no template).
  await Promise.allSettled([
    tc.carregarPainelGeral(),
    clientesMatriz.value.length ? Promise.resolve() : tc.carregarMatriz()
  ])
  carregarColaboradores()
})
</script>

<template>
  <div class="painel-geral">
    <div class="scorecards">
      <VScorecard
        label="Clientes Ativos"
        :value="sc.clientes_ativos ?? 0"
        icon="users"
      />
      <VScorecard
        label="Score Medio"
        :value="sc.score_medio ?? '-'"
        icon="gauge"
      />
      <VScorecard
        label="Em Risco"
        :value="sc.em_risco ?? 0"
        icon="alert-triangle"
      />
      <VScorecard
        label="Taxa de Analise"
        :value="`${sc.taxa_analise ?? 0}%`"
        icon="activity"
      />
    </div>

    <div v-if="tc.error.value" class="pg-error">
      <i data-lucide="alert-circle"></i>
      <span>Nao foi possivel carregar o Painel Geral: {{ tc.error.value }}</span>
    </div>

    <nav class="tabs" role="tablist">
      <button
        v-for="t in TABS" :key="t.key"
        role="tab" :aria-selected="tabAtiva === t.key"
        :class="['tab', { active: tabAtiva === t.key }]"
        @click="tabAtiva = t.key">
        {{ t.label }}
      </button>
    </nav>

    <section v-if="tc.loadingPainel.value" class="loading">
      <VLoadingState size="lg" />
    </section>

    <section v-else class="tab-content">
      <TcTabColaboradores
        v-if="tabAtiva === 'colaboradores'"
        :colaboradores="colaboradores"
      />
      <TcTabTimeline
        v-else-if="tabAtiva === 'timeline'"
        :clientes="clientesMatriz"
      />
    </section>
  </div>
</template>

<style scoped>
.painel-geral { display: flex; flex-direction: column; gap: var(--spacing-lg); }

.tabs {
  display: flex;
  gap: var(--spacing-xs);
  border-bottom: 1px solid var(--border-card);
}
.tab {
  background: none;
  border: none;
  color: var(--text-low);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: inherit;
  font-size: var(--font-size-base);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.tab:hover { color: var(--text-high); }
.tab.active {
  color: var(--text-high);
  border-bottom-color: var(--color-primary);
}
.tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.loading { display: flex; justify-content: center; padding: var(--spacing-2xl); }
.scorecards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}
.pg-error {
  display: flex; align-items: center; gap: 10px;
  color: var(--color-danger); padding: var(--spacing-md);
  background: rgba(var(--color-danger-rgb), 0.1);
  border-radius: var(--radius-sm);
}
.pg-error i { width: 18px; height: 18px; }
</style>
