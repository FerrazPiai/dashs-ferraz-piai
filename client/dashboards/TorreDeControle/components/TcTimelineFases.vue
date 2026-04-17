<script setup>
import { computed } from 'vue'

const props = defineProps({
  fases: { type: Array, required: true },
  clienteFases: { type: Object, default: () => ({}) },
  active: { type: Number, default: null }
})
const emit = defineEmits(['select'])

const items = computed(() =>
  props.fases.map(f => ({
    ...f,
    dados: props.clienteFases?.[f.id] || null
  }))
)

function corClasse(status) {
  return {
    verde: 'dot--safe',
    amarelo: 'dot--care',
    vermelho: 'dot--danger'
  }[status] || 'dot--empty'
}
</script>

<template>
  <div class="tc-timeline">
    <div v-for="item in items" :key="item.id"
         class="step"
         :class="{ 'is-active': active === item.id }"
         @click="emit('select', item.id)">
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
