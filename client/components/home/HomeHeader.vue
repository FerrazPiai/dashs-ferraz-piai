<template>
  <header class="home-header">
    <h1 class="home-header-title">Central de Dashboards</h1>
    <p class="home-header-subtitle">
      {{ count }} {{ count === 1 ? 'dashboard ativo' : 'dashboards ativos' }}
      <span class="home-header-sep">·</span>
      {{ formattedDate }}
    </p>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: {
    type: Number,
    required: true
  }
})

const formattedDate = computed(() => {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(now)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(now).replace('.', '')
  const shortWeekday = weekday.replace(/-feira$/, '')
  return `${shortWeekday}, ${day} ${month}`
})
</script>

<style scoped>
.home-header {
  margin-bottom: 48px;
}

.home-header-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-high, #fff);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.home-header-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted, #888);
  font-weight: 400;
}

.home-header-sep {
  margin: 0 8px;
  color: var(--text-lowest, #666);
}
</style>
