<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  qualidadeTime: { type: Object, default: null }
})

const qt = computed(() => props.qualidadeTime || {})
const score = computed(() => qt.value.score != null ? Number(qt.value.score).toFixed(1) : null)
const fortes = computed(() => Array.isArray(qt.value.pontos_fortes) ? qt.value.pontos_fortes : [])
const atencao = computed(() => Array.isArray(qt.value.pontos_atencao) ? qt.value.pontos_atencao : [])

const DIMS_LABEL = {
  exploracao_dor: 'Exploracao da dor',
  empatia_atencao: 'Empatia e atencao',
  clareza_comunicacao: 'Clareza na comunicacao',
  aderencia_metodologia: 'Aderencia metodologica',
  proatividade: 'Proatividade',
  qualidade_entregaveis: 'Qualidade dos entregaveis'
}
const dimensoes = computed(() => {
  const obj = qt.value.dimensoes || {}
  return Object.keys(DIMS_LABEL)
    .filter(k => obj[k] != null)
    .map(k => ({ key: k, label: DIMS_LABEL[k], score: Number(obj[k]) }))
})
// Escala unica: 9-10 = verde, 7-8 = amarelo, <=6 = vermelho
function barColor(s) {
  if (s >= 9) return 'bar--verde'
  if (s >= 7) return 'bar--amarelo'
  return 'bar--vermelho'
}

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

    <!-- Dimensoes de avaliacao do time (scores 0-10) -->
    <div v-if="dimensoes.length" class="qt-dims">
      <div class="qt-dims-head">Avaliacao por dimensao</div>
      <div class="qt-dims-grid">
        <div v-for="d in dimensoes" :key="d.key" class="qt-dim">
          <div class="qt-dim-row">
            <span class="qt-dim-label">{{ d.label }}</span>
            <span class="qt-dim-score">{{ d.score.toFixed(1) }}</span>
          </div>
          <div class="qt-dim-bar-wrap">
            <div class="qt-dim-bar" :class="barColor(d.score)" :style="{ width: Math.max(4, Math.min(100, d.score * 10)) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

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

/* Dimensoes (barras horizontais) */
.qt-dims {
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.qt-dims-head {
  font-size: 11px; color: #888; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.qt-dims-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;
}
.qt-dim { display: flex; flex-direction: column; gap: 3px; }
.qt-dim-row {
  display: flex; justify-content: space-between; align-items: baseline;
}
.qt-dim-label { font-size: 12px; color: #ccc; }
.qt-dim-score { font-size: 12.5px; color: #fff; font-weight: 600; }
.qt-dim-bar-wrap {
  width: 100%; height: 6px; border-radius: 3px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
}
.qt-dim-bar {
  height: 100%; border-radius: 3px;
  transition: width 240ms ease-out;
}
.bar--verde    { background: linear-gradient(90deg, #16a34a, #22c55e); }
.bar--amarelo  { background: linear-gradient(90deg, #d97706, #f59e0b); }
.bar--vermelho { background: linear-gradient(90deg, #b91c1c, #ef4444); }

@media (max-width: 640px) {
  .qt-dims-grid { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .qt-cols { grid-template-columns: 1fr; }
}
</style>
