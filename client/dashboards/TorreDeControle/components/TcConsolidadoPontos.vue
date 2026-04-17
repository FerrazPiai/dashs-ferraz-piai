<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  pontosPositivos: { type: Array, default: () => [] },
  pontosNegativos: { type: Array, default: () => [] }
})

const positivos = computed(() => Array.isArray(props.pontosPositivos) ? props.pontosPositivos : [])
const negativos = computed(() => Array.isArray(props.pontosNegativos) ? props.pontosNegativos : [])
const total = computed(() => positivos.value.length + negativos.value.length)

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => [positivos.value, negativos.value], () => nextTick(() => window.lucide && window.lucide.createIcons()))
</script>

<template>
  <section class="pp-section" v-if="total > 0">
    <header class="pp-section-head">
      <h2>
        <i data-lucide="clipboard-check" class="pp-section-icon"></i>
        Pontos do Projeto
      </h2>
      <span class="pp-section-hint">Balanço geral da execucao</span>
    </header>

    <div class="pp-grid">
      <div class="pp-col pp-col--pos">
        <div class="pp-col-head">
          <i data-lucide="check-circle-2" class="pp-col-icon"></i>
          <span>Pontos positivos</span>
          <span class="pp-count">{{ positivos.length }}</span>
        </div>
        <ul v-if="positivos.length" class="pp-list">
          <li v-for="(p, i) in positivos" :key="i">
            <span class="pp-marker pp-marker--pos">+</span>
            <span class="pp-text">{{ p }}</span>
          </li>
        </ul>
        <p v-else class="pp-vazio">Sem destaques positivos registrados.</p>
      </div>

      <div class="pp-col pp-col--neg">
        <div class="pp-col-head">
          <i data-lucide="x-circle" class="pp-col-icon"></i>
          <span>Pontos negativos</span>
          <span class="pp-count">{{ negativos.length }}</span>
        </div>
        <ul v-if="negativos.length" class="pp-list">
          <li v-for="(p, i) in negativos" :key="i">
            <span class="pp-marker pp-marker--neg">−</span>
            <span class="pp-text">{{ p }}</span>
          </li>
        </ul>
        <p v-else class="pp-vazio">Sem destaques negativos registrados.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pp-section {
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, rgba(255,255,255,0.06));
  border-radius: 8px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pp-section-head {
  display: flex; justify-content: space-between;
  align-items: baseline; gap: 10px; flex-wrap: wrap;
}
.pp-section-head h2 {
  font-size: 15px; color: #fff; margin: 0; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.pp-section-icon { width: 16px; height: 16px; color: #888; }
.pp-section-hint { font-size: 11.5px; color: #666; }

.pp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pp-col {
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  padding: 12px 14px;
  border-left: 3px solid transparent;
}
.pp-col--pos { border-left-color: #22c55e; background: rgba(34, 197, 94, 0.04); }
.pp-col--neg { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.04); }

.pp-col-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #ddd; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.4px;
  margin-bottom: 10px;
}
.pp-col-icon { width: 14px; height: 14px; }
.pp-col--pos .pp-col-icon { color: #22c55e; }
.pp-col--neg .pp-col-icon { color: #ef4444; }
.pp-count { margin-left: auto; color: #666; font-weight: 400; font-size: 11px; }

.pp-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.pp-list li {
  display: flex; gap: 10px; align-items: flex-start;
}
.pp-marker {
  flex-shrink: 0;
  width: 20px; height: 20px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; line-height: 1;
}
.pp-marker--pos { background: rgba(34,197,94,0.2); color: #22c55e; }
.pp-marker--neg { background: rgba(239,68,68,0.2); color: #ef4444; }
.pp-text {
  color: #ddd; font-size: 13px; line-height: 1.5;
}

.pp-vazio {
  color: #666; font-size: 12.5px; font-style: italic; margin: 0;
}

@media (max-width: 720px) {
  .pp-grid { grid-template-columns: 1fr; }
}
</style>
