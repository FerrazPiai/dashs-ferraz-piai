<script setup>
import { computed } from 'vue'

const props = defineProps({
  fases: { type: Array, required: true },
  clienteFases: { type: Object, default: () => ({}) },
  active: { type: Number, default: null },
  faseAtualOrdem: { type: Number, default: 0 }
})
const emit = defineEmits(['select'])

const items = computed(() =>
  props.fases.map(f => {
    // Auditavel = ordem < fase_atual. Excecao: projeto-concluido e auditavel quando lead JA chegou (ordem >= 6)
    const auditavel = f.ordem < props.faseAtualOrdem
      || (f.slug === 'projeto-concluido' && props.faseAtualOrdem >= 6)
    const atual = f.ordem === props.faseAtualOrdem && f.slug !== 'projeto-concluido'
    return {
      ...f,
      dados: props.clienteFases?.[f.id] || null,
      auditavel,
      atual
    }
  })
)

function corClasse(status) {
  return {
    verde: 'dot--safe',
    amarelo: 'dot--care',
    vermelho: 'dot--danger',
    incompleta: 'dot--incompleta'
  }[status] || 'dot--empty'
}

function titulo(item) {
  if (item.atual) return 'Fase atual do lead — aguardando avanco para auditar'
  if (!item.auditavel) return 'Fase futura — ainda nao ocorreu'
  if (item.dados?.status_cor === 'incompleta') return 'Analise marcada como incompleta — materiais insuficientes'
  if (item.slug === 'projeto-concluido') return 'Projeto concluido — abrir Analise Consolidada'
  return 'Fase auditavel — clique para ver'
}

function onSelect(item) {
  if (!item.auditavel) return
  emit('select', item.id)
}
</script>

<template>
  <div class="tc-timeline">
    <div v-for="item in items" :key="item.id"
         class="step"
         :class="{
           'is-active': active === item.id,
           'is-blocked': !item.auditavel,
           'is-atual': item.atual
         }"
         :title="item.dados?.score_composicao ? '' : titulo(item)"
         @click="onSelect(item)">
      <div class="dot" :class="corClasse(item.dados?.status_cor)">
        <span v-if="item.dados?.status_cor !== 'incompleta' && item.dados?.score">{{ item.dados.score }}</span>
      </div>
      <div class="label">{{ item.nome }}</div>

      <!-- Popover explicando como a nota foi calculada (formula 75/20/5).
           Aparece apenas em fases ja analisadas que tem score_composicao persistida. -->
      <div v-if="item.dados?.score_composicao && item.dados?.score != null" class="score-pop">
        <div class="score-pop-head">
          <span class="score-pop-title">Como a nota foi calculada</span>
          <span class="score-pop-final">{{ Number(item.dados.score).toFixed(1) }}<span class="score-pop-sfx">/10</span></span>
        </div>
        <ul class="score-pop-list">
          <li>
            <span class="score-pop-row-label">Percepção do Cliente</span>
            <span class="score-pop-row-weight">75%</span>
            <span class="score-pop-row-value">
              {{ item.dados.score_composicao.percepcao != null ? Number(item.dados.score_composicao.percepcao).toFixed(1) : '—' }}
            </span>
          </li>
          <li>
            <span class="score-pop-row-label">Checklist de entregas</span>
            <span class="score-pop-row-weight">20%</span>
            <span class="score-pop-row-value">
              {{ item.dados.score_composicao.checklist != null ? Number(item.dados.score_composicao.checklist).toFixed(1) : '—' }}
            </span>
          </li>
          <li>
            <span class="score-pop-row-label">Oportunidades</span>
            <span class="score-pop-row-weight">5%</span>
            <span class="score-pop-row-value">
              {{ item.dados.score_composicao.oportunidades != null ? Number(item.dados.score_composicao.oportunidades).toFixed(1) : '—' }}
            </span>
          </li>
        </ul>
        <p class="score-pop-formula">
          0,75 × percepção + 0,20 × checklist + 0,05 × oportunidades
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tc-timeline {
  display: flex; gap: var(--spacing-md);
  padding: var(--spacing-md);
  /* overflow-x clip permite que o popover .score-pop escape verticalmente sem criar
     scrollbar-Y extra no hover. 'clip' (em vez de 'auto') nao forca overflow-y. */
  overflow-x: clip;
  overflow-y: visible;
  flex-shrink: 0;                /* nao colapsar no flex column do super-painel */
  align-items: center;           /* steps alinhados verticalmente no centro da faixa */
}
.step {
  position: relative;            /* ancora o popover da composicao do score */
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--spacing-xs); cursor: pointer;
  min-width: 80px; padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: background 150ms;
  flex-shrink: 0;                /* labels nao encolhem a ponto de sumir */
  text-align: center;            /* label e dot centrados com perfeicao */
}

/* Popover explicativo da nota — aparece no hover do step.
   Usa display:none para nao interceptar eventos / nao colapsar altura. */
.score-pop {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  display: none;
  z-index: 50;
  min-width: 280px;
  background: var(--bg-card);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
  padding: 10px 12px;
  text-align: left;
  pointer-events: none;
  animation: pop-fade 140ms ease-out;
}
.step:hover .score-pop { display: block; }
@keyframes pop-fade {
  from { opacity: 0; transform: translateX(-50%) translateY(2px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(6px); }
}
.score-pop-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 8px; padding-bottom: 6px;
  border-bottom: 1px solid var(--border-row);
  margin-bottom: 6px;
}
.score-pop-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--text-low);
  font-weight: var(--font-weight-semibold);
}
.score-pop-final {
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
.score-pop-sfx {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: var(--font-weight-normal);
  margin-left: 2px;
}
.score-pop-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.score-pop-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  font-size: var(--font-size-xs);
  color: var(--text-medium);
}
.score-pop-row-weight {
  color: var(--text-lowest);
  font-variant-numeric: tabular-nums;
}
.score-pop-row-value {
  color: var(--text-high);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  min-width: 28px;
  text-align: right;
}
.score-pop-formula {
  margin: 6px 0 0;
  padding-top: 6px;
  border-top: 1px dashed var(--border-row);
  font-size: 10px;
  color: var(--text-lowest);
  font-style: italic;
  line-height: 1.4;
}
.step:hover, .step.is-active {
  background: rgba(255, 255, 255, 0.05);
}
.step.is-blocked {
  cursor: not-allowed;
  opacity: 0.6;                  /* era 0.35 — labels ficavam invisiveis */
}
.step.is-blocked:hover {
  background: transparent;
}
.step.is-atual .dot {
  outline: 2px solid var(--text-high);
  outline-offset: 2px;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
}
.dot {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: var(--font-weight-bold); color: var(--text-high);
}
.dot--safe   { background: var(--color-safe); }
.dot--care   { background: var(--color-care); color: #000; }
.dot--danger { background: var(--color-danger); }
.dot--empty  { background: var(--bg-inner); border: 1px dashed var(--border-card); color: var(--text-lowest); }
/* Incompleta: materiais insuficientes — mesmo visual do dot na matriz */
.dot--incompleta {
  background: var(--bg-inner);
  border: 1px solid var(--chart-color-neutral, #555);
  position: relative;
}
.dot--incompleta::after {
  content: '?';
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-low);
  font-size: 18px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}
.label {
  font-size: var(--font-size-sm); color: var(--text-low);
  text-align: center;
}
.step.is-active .label { color: var(--text-high); }
</style>
