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
    vermelho: 'dot--danger'
  }[status] || 'dot--empty'
}

function titulo(item) {
  if (item.atual) return 'Fase atual do lead — aguardando avanco para auditar'
  if (!item.auditavel) return 'Fase futura — ainda nao ocorreu'
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
         :title="titulo(item)"
         @click="onSelect(item)">
      <div class="dot" :class="corClasse(item.dados?.status_cor)">
        <span v-if="item.dados?.score">{{ item.dados.score }}</span>
      </div>
      <div class="label">{{ item.nome }}</div>
    </div>
  </div>
</template>

<style scoped>
.tc-timeline {
  display: flex; gap: var(--spacing-md);
  padding: var(--spacing-md); overflow-x: auto;
}
.step {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--spacing-xs); cursor: pointer;
  min-width: 80px; padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: background 150ms;
}
.step:hover, .step.is-active {
  background: rgba(255, 255, 255, 0.05);
}
.step.is-blocked {
  cursor: not-allowed;
  opacity: 0.35;
}
.step.is-blocked:hover {
  background: transparent;
}
.step.is-atual .dot {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
}
.dot {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: 700; color: #fff;
}
.dot--safe   { background: var(--color-safe); }
.dot--care   { background: var(--color-care); color: #000; }
.dot--danger { background: var(--color-danger); }
.dot--empty  { background: var(--bg-inner); border: 1px dashed var(--border-card); color: var(--text-lowest); }
.label {
  font-size: var(--font-size-sm); color: var(--text-low);
  text-align: center;
}
.step.is-active .label { color: var(--text-high); }
</style>
