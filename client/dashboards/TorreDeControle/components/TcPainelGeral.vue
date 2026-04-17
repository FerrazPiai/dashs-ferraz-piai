<script setup>
import { ref, onMounted, computed } from 'vue'
import TcTabVisaoGeral from './TcTabVisaoGeral.vue'
import TcTabDistribuicao from './TcTabDistribuicao.vue'
import TcTabChurn from './TcTabChurn.vue'
import TcTabOportunidades from './TcTabOportunidades.vue'
import TcTabColaboradores from './TcTabColaboradores.vue'
import VScorecard from '../../../components/ui/VScorecard.vue'
import VLoadingState from '../../../components/ui/VLoadingState.vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const emit = defineEmits(['abrir-cliente'])

const tc = useTorreControle()
const tabAtiva = ref('visao-geral')
const colaboradores = ref([])

const TABS = [
  { key: 'visao-geral',    label: 'Visao Geral' },
  { key: 'distribuicao',   label: 'Distribuicao' },
  { key: 'churn',          label: 'Churn' },
  { key: 'oportunidades',  label: 'Oportunidades' },
  { key: 'colaboradores',  label: 'Accounts' }
]

const sc = computed(() => tc.painelGeral.value?.scorecards || {})

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
  await tc.carregarPainelGeral()
  carregarColaboradores()
})
</script>

<template>
  <div class="painel-geral">
    <div class="section-block">
      <div class="section-head">
        <span class="section-label">Operacional</span>
        <span class="section-hint">Metricas de auditoria e risco</span>
      </div>
      <div class="scorecards">
        <VScorecard label="Clientes Ativos" :value="sc.clientes_ativos ?? 0" />
        <VScorecard label="Score Medio" :value="sc.score_medio ?? '-'" />
        <VScorecard label="Em Risco" :value="sc.em_risco ?? 0" />
        <VScorecard label="Taxa de Analise" :value="`${sc.taxa_analise ?? 0}%`" />
      </div>
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

    <section v-if="tc.loading.value" class="loading">
      <VLoadingState size="lg" />
    </section>

    <section v-else-if="tc.painelGeral.value" class="tab-content">
      <TcTabVisaoGeral
        v-if="tabAtiva === 'visao-geral'"
        :heatmap="tc.painelGeral.value.heatmap"
      />
      <TcTabDistribuicao
        v-else-if="tabAtiva === 'distribuicao'"
        :distribuicao="tc.painelGeral.value.distribuicao || {}"
      />
      <TcTabChurn
        v-else-if="tabAtiva === 'churn'"
        :churn="tc.painelGeral.value.churn"
        @abrir-cliente="emit('abrir-cliente', $event)"
      />
      <TcTabOportunidades
        v-else-if="tabAtiva === 'oportunidades'"
        :oportunidades="tc.painelGeral.value.oportunidades"
      />
      <TcTabColaboradores
        v-else-if="tabAtiva === 'colaboradores'"
        :colaboradores="colaboradores"
      />
    </section>
  </div>
</template>

<style scoped>
.painel-geral { display: flex; flex-direction: column; gap: var(--spacing-lg); }

.section-block { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.section-head {
  display: flex; align-items: baseline; gap: var(--spacing-sm);
}
.section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.section-hint {
  font-size: var(--font-size-xs);
  color: var(--text-lowest);
}

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
</style>
