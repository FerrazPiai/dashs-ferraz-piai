<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  qualidadeTime: { type: Object, default: null }
})

const qt = computed(() => props.qualidadeTime || {})
const score = computed(() => qt.value.score != null ? Number(qt.value.score).toFixed(1) : null)
const fortes = computed(() => Array.isArray(qt.value.pontos_fortes) ? qt.value.pontos_fortes : [])
const atencao = computed(() => Array.isArray(qt.value.pontos_atencao) ? qt.value.pontos_atencao : [])

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(qt, () => nextTick(() => window.lucide && window.lucide.createIcons()))
</script>

<template>
  <section class="qt-card" v-if="qt">
    <header class="qt-head">
      <h2>
        <i data-lucide="users" class="qt-head-icon"></i>
        Qualidade do Time
      </h2>
      <div class="qt-meta">
        <span v-if="qt.squad_nome" class="qt-squad">Squad {{ qt.squad_nome }}</span>
        <span v-if="score != null" class="qt-score">{{ score }}/10</span>
      </div>
    </header>

    <div class="qt-cols">
      <div class="qt-col qt-col--fortes">
        <div class="qt-col-head">
          <i data-lucide="thumbs-up" class="qt-col-icon"></i>
          <span>Pontos fortes</span>
          <span class="qt-count">{{ fortes.length }}</span>
        </div>
        <ul v-if="fortes.length" class="qt-list">
          <li v-for="(p, i) in fortes" :key="i">{{ p }}</li>
        </ul>
        <p v-else class="qt-vazio">Sem pontos fortes destacados.</p>
      </div>

      <div class="qt-col qt-col--atencao">
        <div class="qt-col-head">
          <i data-lucide="alert-triangle" class="qt-col-icon"></i>
          <span>Pontos de atencao</span>
          <span class="qt-count">{{ atencao.length }}</span>
        </div>
        <ul v-if="atencao.length" class="qt-list">
          <li v-for="(p, i) in atencao" :key="i">{{ p }}</li>
        </ul>
        <p v-else class="qt-vazio">Sem pontos de atencao destacados.</p>
      </div>
    </div>

    <p v-if="qt.observacao" class="qt-observacao">{{ qt.observacao }}</p>
  </section>
</template>

<style scoped>
.qt-card {
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, rgba(255,255,255,0.06));
  border-radius: 8px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.qt-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
}
.qt-head h2 {
  font-size: 15px; color: #fff; margin: 0; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.qt-head-icon { width: 16px; height: 16px; color: #888; }
.qt-meta { display: flex; align-items: center; gap: 12px; }
.qt-squad {
  font-size: 12px; color: #aaa; font-weight: 500;
  padding: 3px 10px; border-radius: 10px;
  background: rgba(255,255,255,0.04);
}
.qt-score {
  font-size: 20px; color: #fff; font-weight: 700;
  letter-spacing: -0.3px;
}

.qt-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.qt-col {
  background: rgba(255,255,255,0.02);
  border-radius: 6px; padding: 12px 14px;
  border-left: 3px solid transparent;
}
.qt-col--fortes  { border-left-color: #22c55e; }
.qt-col--atencao { border-left-color: #f59e0b; }

.qt-col-head {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #ddd; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.4px;
  margin-bottom: 8px;
}
.qt-col-icon { width: 14px; height: 14px; }
.qt-col--fortes  .qt-col-icon { color: #22c55e; }
.qt-col--atencao .qt-col-icon { color: #f59e0b; }
.qt-count {
  margin-left: auto;
  font-size: 11px; color: #666; font-weight: 400;
}

.qt-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 6px;
}
.qt-list li {
  position: relative; padding-left: 14px;
  color: #ccc; font-size: 13px; line-height: 1.5;
}
.qt-list li::before {
  content: ''; position: absolute; left: 0; top: 8px;
  width: 5px; height: 5px; border-radius: 50%;
  background: #666;
}
.qt-col--fortes  .qt-list li::before { background: #22c55e; }
.qt-col--atencao .qt-list li::before { background: #f59e0b; }

.qt-vazio { color: #666; font-size: 12.5px; font-style: italic; margin: 0; }

.qt-observacao {
  color: #aaa; font-size: 13px; line-height: 1.55;
  margin: 0; padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-style: italic;
}

@media (max-width: 720px) {
  .qt-cols { grid-template-columns: 1fr; }
}
</style>
