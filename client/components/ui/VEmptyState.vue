<script setup>
import { onMounted, nextTick } from 'vue'

defineProps({
  icon: { type: String, default: null },
  title: { type: String, default: 'Nenhum dado disponivel' },
  description: { type: String, default: null }
})

onMounted(async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<template>
  <div class="empty-state-container">
    <i v-if="icon" :data-lucide="icon" class="empty-state-icon"></i>
    <div class="empty-state-title">{{ title }}</div>
    <div v-if="description" class="empty-state-description">{{ description }}</div>
  </div>
</template>

<style scoped>
.empty-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}
.empty-state-icon {
  width: 32px;
  height: 32px;
  color: var(--text-lowest);
  margin-bottom: var(--spacing-md);
}
.empty-state-title {
  font-size: var(--font-size-lg);
  color: var(--text-low);
  text-align: center;
}
.empty-state-description {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  text-align: center;
  margin-top: var(--spacing-sm);
}
</style>
