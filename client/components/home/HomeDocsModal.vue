<template>
  <Transition name="home-modal">
    <div v-if="dashboard" class="home-modal-backdrop" @click.self="close">
      <div class="home-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header class="home-modal-header">
          <i :data-lucide="dashboard.icon || 'layout-dashboard'" class="home-modal-icon"></i>
          <h2 :id="titleId" class="home-modal-title">{{ dashboard.title }}</h2>
          <button class="home-modal-close" aria-label="Fechar" @click="close">
            <i data-lucide="x"></i>
          </button>
        </header>

        <div class="home-modal-body">
          <section class="home-modal-section">
            <h3 class="home-modal-section-label">O que mostra</h3>
            <p class="home-modal-text">
              {{ docs.whatItShows || 'Documentação em breve.' }}
            </p>
          </section>

          <section class="home-modal-section">
            <h3 class="home-modal-section-label">Principais métricas</h3>
            <ul v-if="docs.keyMetrics && docs.keyMetrics.length" class="home-modal-list">
              <li v-for="m in docs.keyMetrics" :key="m">{{ m }}</li>
            </ul>
            <p v-else class="home-modal-text">Documentação em breve.</p>
          </section>

          <section class="home-modal-section">
            <h3 class="home-modal-section-label">Quando usar</h3>
            <p class="home-modal-text">
              {{ docs.whenToUse || 'Documentação em breve.' }}
            </p>
          </section>
        </div>

        <footer class="home-modal-footer">
          <button class="home-modal-btn" @click="openDashboard">
            <span>Abrir dashboard</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  dashboard: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'open'])

const titleId = computed(() => `home-modal-title-${props.dashboard?.id || 'x'}`)
const docs = computed(() => props.dashboard?.docs || {})

function close() {
  emit('close')
}

function openDashboard() {
  emit('open', props.dashboard)
}

function onKey(e) {
  if (e.key === 'Escape' && props.dashboard) close()
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
})

watch(() => props.dashboard, (v) => {
  if (v) renderIcons()
})
</script>

<style scoped>
.home-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.home-modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
}

.home-modal-icon {
  width: 24px;
  height: 24px;
  color: var(--text-medium, #ccc);
  stroke-width: 1.75;
  flex-shrink: 0;
}

.home-modal-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-high, #fff);
  letter-spacing: -0.01em;
}

.home-modal-close {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  transition: color 120ms ease, background 120ms ease;
}
.home-modal-close:hover {
  color: var(--text-high, #fff);
  background: var(--bg-inner, #1a1a1a);
}
.home-modal-close :deep(svg) {
  width: 18px;
  height: 18px;
}

.home-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home-modal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-modal-section-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
}

.home-modal-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-medium, #ccc);
}

.home-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-modal-list li {
  font-size: 13px;
  color: var(--text-medium, #ccc);
  padding-left: 16px;
  position: relative;
}
.home-modal-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary, #ff0000);
}

.home-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-row, #1f1f1f);
  display: flex;
  justify-content: flex-end;
}

.home-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: var(--color-primary, #ff0000);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
}
.home-modal-btn:hover { background: var(--color-primary-dark, #cc0000); }
.home-modal-btn:active { transform: scale(0.98); }
.home-modal-btn :deep(svg) {
  width: 14px;
  height: 14px;
  stroke-width: 2.25;
}

.home-modal-enter-active,
.home-modal-leave-active {
  transition: opacity 200ms ease;
}
.home-modal-enter-active .home-modal,
.home-modal-leave-active .home-modal {
  transition: opacity 200ms ease, transform 200ms ease;
}
.home-modal-enter-from,
.home-modal-leave-to {
  opacity: 0;
}
.home-modal-enter-from .home-modal,
.home-modal-leave-to .home-modal {
  opacity: 0;
  transform: scale(0.96);
}
</style>
