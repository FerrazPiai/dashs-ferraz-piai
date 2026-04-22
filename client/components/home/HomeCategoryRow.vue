<template>
  <section class="home-row" v-if="dashboards.length > 0">
    <div class="home-row-header">
      <h2 class="home-row-label">{{ label }}</h2>
    </div>

    <div class="home-row-wrapper" @mouseenter="updateOverflow" @mouseleave="onLeave">
      <button
        v-show="canScrollLeft"
        class="home-row-arrow home-row-arrow--left"
        aria-label="Rolar para a esquerda"
        @click="scrollBy(-1)"
      >
        <i data-lucide="chevron-left"></i>
      </button>

      <div
        ref="scrollerRef"
        class="home-row-scroller"
        tabindex="0"
        @scroll="onScroll"
        @keydown="onKey"
      >
        <HomeCard
          v-for="d in dashboards"
          :key="d.id"
          :dashboard="d"
          @open="(payload) => $emit('open', payload)"
          @docs="(payload) => $emit('docs', payload)"
        />
      </div>

      <button
        v-show="canScrollRight"
        class="home-row-arrow home-row-arrow--right"
        aria-label="Rolar para a direita"
        @click="scrollBy(1)"
      >
        <i data-lucide="chevron-right"></i>
      </button>

      <div v-show="canScrollLeft" class="home-row-fade home-row-fade--left" aria-hidden="true"></div>
      <div v-show="canScrollRight" class="home-row-fade home-row-fade--right" aria-hidden="true"></div>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import HomeCard from './HomeCard.vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  dashboards: {
    type: Array,
    required: true
  }
})

defineEmits(['open', 'docs'])

const scrollerRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const CARD_STEP = 336

function updateOverflow() {
  const el = scrollerRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function onScroll() {
  updateOverflow()
}

function onLeave() {
}

function scrollBy(dir) {
  const el = scrollerRef.value
  if (!el) return
  el.scrollBy({ left: dir * CARD_STEP, behavior: 'smooth' })
}

function onKey(e) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    scrollBy(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    scrollBy(-1)
  }
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

let resizeObserver = null
onMounted(() => {
  nextTick(() => {
    updateOverflow()
    renderIcons()
  })
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    resizeObserver = new ResizeObserver(() => updateOverflow())
    resizeObserver.observe(scrollerRef.value)
  }
  window.addEventListener('resize', updateOverflow)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateOverflow)
  if (resizeObserver) resizeObserver.disconnect()
})

watch(() => props.dashboards, () => {
  nextTick(() => {
    updateOverflow()
    renderIcons()
  })
}, { deep: true })
</script>

<style scoped>
.home-row {
  margin-bottom: 48px;
}

.home-row-header {
  display: flex;
  align-items: center;
  padding: 0 0 14px 0;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
  margin-bottom: 20px;
}

.home-row-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
}

.home-row-wrapper {
  position: relative;
}

.home-row-scroller {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 6px 2px 16px;
  scrollbar-width: none;
}
.home-row-scroller::-webkit-scrollbar {
  display: none;
}
.home-row-scroller:focus {
  outline: none;
}
.home-row-scroller:focus-visible {
  outline: 2px solid rgba(255, 0, 0, 0.4);
  outline-offset: 4px;
  border-radius: 4px;
}

.home-row-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid #333;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: var(--text-medium, #ccc);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0;
  transition: opacity 180ms ease, background 150ms ease, color 150ms ease, border-color 150ms ease;
}
.home-row-wrapper:hover .home-row-arrow {
  opacity: 0.95;
}
.home-row-arrow:hover {
  background: rgba(30, 30, 30, 0.95);
  color: var(--text-high, #fff);
  border-color: #555;
}
.home-row-arrow--left { left: -8px; }
.home-row-arrow--right { right: -8px; }
.home-row-arrow :deep(svg) {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.home-row-fade {
  position: absolute;
  top: 0;
  bottom: 16px;
  width: 48px;
  pointer-events: none;
  z-index: 1;
}
.home-row-fade--left {
  left: 0;
  background: linear-gradient(to right, var(--bg-body, #0d0d0d), transparent);
}
.home-row-fade--right {
  right: 0;
  background: linear-gradient(to left, var(--bg-body, #0d0d0d), transparent);
}

@media (hover: none) and (pointer: coarse) {
  .home-row-arrow {
    opacity: 0.9;
  }
}
</style>
