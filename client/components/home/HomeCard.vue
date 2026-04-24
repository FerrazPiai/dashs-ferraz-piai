<template>
  <article class="home-card" :class="{ 'is-development': dashboard.status === 'development' }">
    <div class="home-card-content">
      <div class="home-card-top">
        <i :data-lucide="dashboard.icon || 'layout-dashboard'" class="home-card-icon"></i>
        <span
          v-if="dashboard.status"
          class="status-dot"
          :class="`status-dot--${dashboard.status}`"
          :title="statusLabel"
        ></span>
      </div>
      <div class="home-card-text">
        <h3 class="home-card-title">{{ dashboard.title }}</h3>
        <p v-if="dashboard.shortDescription" class="home-card-desc">
          {{ dashboard.shortDescription }}
        </p>
      </div>
    </div>

    <div class="home-card-overlay">
      <button class="home-card-btn home-card-btn--primary" @click="$emit('open', dashboard)">
        <span>Abrir</span>
        <i data-lucide="arrow-right" class="home-card-btn-icon"></i>
      </button>
      <button class="home-card-btn home-card-btn--secondary" @click="$emit('docs', dashboard)">
        <i data-lucide="book-open" class="home-card-btn-icon"></i>
        <span>Ver documentação</span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  dashboard: {
    type: Object,
    required: true
  }
})

defineEmits(['open', 'docs'])

const statusLabel = computed(() => {
  const labels = {
    available: 'Disponível',
    development: 'Em desenvolvimento',
    maintenance: 'Em manutenção'
  }
  return labels[props.dashboard.status] || ''
})

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(renderIcons)
watch(() => props.dashboard, renderIcons, { deep: true })
</script>

<style scoped>
.home-card {
  position: relative;
  width: 320px;
  height: 180px;
  flex-shrink: 0;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  padding: 20px;
  cursor: default;
  overflow: hidden;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
}

.home-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 0, 0, 0.25);
}

.home-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.home-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.home-card-icon {
  width: 32px;
  height: 32px;
  color: var(--text-medium, #ccc);
  stroke-width: 1.5;
}

.home-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high, #fff);
  margin: 0 0 6px 0;
  letter-spacing: -0.01em;
}

.home-card-desc {
  font-size: 12px;
  color: var(--text-low, #999);
  line-height: 1.45;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot--available {
  background-color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}
.status-dot--development {
  background-color: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}
.status-dot--maintenance {
  background-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

.home-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 20, 0.92);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  opacity: 0;
  transition: opacity 180ms ease;
  pointer-events: none;
}

.home-card:hover .home-card-overlay {
  opacity: 1;
  pointer-events: auto;
}

.home-card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  min-width: 180px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms ease;
}

.home-card-btn:active {
  transform: scale(0.98);
}

.home-card-btn--primary {
  background: var(--color-primary, #ff0000);
  color: #fff;
}
.home-card-btn--primary:hover {
  background: var(--color-primary-dark, #cc0000);
}

.home-card-btn--secondary {
  background: transparent;
  border-color: #333;
  color: var(--text-medium, #ccc);
}
.home-card-btn--secondary:hover {
  border-color: #555;
  color: var(--text-high, #fff);
}

.home-card-btn-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

@media (hover: none) and (pointer: coarse) {
  .home-card-overlay {
    opacity: 0.88;
    pointer-events: auto;
  }
  .home-card:hover {
    transform: none;
  }
}
</style>
