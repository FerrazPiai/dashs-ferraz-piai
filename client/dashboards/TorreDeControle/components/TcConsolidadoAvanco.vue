<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  avanco: { type: Object, default: null }
})

const fases = computed(() => Array.isArray(props.avanco?.fases) ? props.avanco.fases : [])
const tendencia = computed(() => props.avanco?.tendencia || null)
const evolucao = computed(() => props.avanco?.evolucao || '')

function corDoScore(score) {
  const s = Number(score)
  if (!isFinite(s)) return 'bar--empty'
  if (s >= 7) return 'bar--verde'
  if (s >= 5) return 'bar--amarelo'
  return 'bar--vermelho'
}

function alturaBar(score) {
  const s = Number(score)
  if (!isFinite(s)) return '4%'
  return `${Math.max(6, Math.min(100, s * 10))}%`
}

function chipClass(delta) {
  const d = Number(delta)
  if (!isFinite(d) || d === 0) return 'chip chip--neutro'
  return d > 0 ? 'chip chip--pos' : 'chip chip--neg'
}

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => fases.value, () => nextTick(() => window.lucide && window.lucide.createIcons()))
</script>

<template>
  <section class="av-card" v-if="props.avanco">
    <header class="av-head">
      <h2>
        <i data-lucide="activity" class="av-head-icon"></i>
        Evolucao do Projeto
      </h2>
      <span v-if="tendencia" class="av-tendencia" :class="`av-tendencia--${tendencia}`">
        {{ tendencia }}
      </span>
    </header>

    <div v-if="fases.length > 0" class="av-chart">
      <div v-for="(f, i) in fases" :key="i" class="av-col">
        <div class="bar-wrap">
          <span class="bar-score">{{ f.score != null ? Number(f.score).toFixed(1) : '—' }}</span>
          <div class="bar" :class="corDoScore(f.score)" :style="{ height: alturaBar(f.score) }"></div>
        </div>
        <div v-if="i > 0 && f.delta != null" class="av-delta" :class="chipClass(f.delta)">
          {{ f.delta > 0 ? '+' : '' }}{{ Number(f.delta).toFixed(1) }}
        </div>
        <div v-else class="av-delta-spacer"></div>
        <div class="av-nome">{{ f.fase }}</div>
        <div class="av-veredicto" v-if="f.veredicto_curto">{{ f.veredicto_curto }}</div>
      </div>
    </div>

    <div v-else class="av-empty">
      Sem fases auditadas previamente para compor a evolucao.
    </div>

    <p v-if="evolucao" class="av-narrativa">{{ evolucao }}</p>
  </section>
</template>

<style scoped>
.av-card {
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.av-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.av-head h2 {
  font-size: 15px;
  color: #fff;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.av-head-icon { width: 16px; height: 16px; color: #888; }

.av-tendencia {
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 700;
}
.av-tendencia--ascendente {
  background: rgba(34, 197, 94, 0.15); color: #22c55e;
}
.av-tendencia--descendente {
  background: rgba(239, 68, 68, 0.15); color: #ef4444;
}
.av-tendencia--estavel {
  background: rgba(255, 255, 255, 0.06); color: #aaa;
}

.av-chart {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 10px;
  align-items: end;
  min-height: 150px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.av-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.bar-wrap {
  width: 32px;
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  position: relative;
}
.bar-score {
  font-size: 11px;
  color: #aaa;
  font-weight: 600;
}
.bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  transition: height 240ms ease-out;
}
.bar--verde    { background: linear-gradient(to top, #16a34a, #22c55e); }
.bar--amarelo  { background: linear-gradient(to top, #d97706, #f59e0b); }
.bar--vermelho { background: linear-gradient(to top, #b91c1c, #ef4444); }
.bar--empty    { background: #2a2a2a; }

.av-delta {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.3;
}
.chip--pos    { background: rgba(34, 197, 94, 0.15);  color: #22c55e; }
.chip--neg    { background: rgba(239, 68, 68, 0.15);  color: #ef4444; }
.chip--neutro { background: rgba(255, 255, 255, 0.05); color: #888; }
.av-delta-spacer { height: 16px; }

.av-nome {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  font-weight: 500;
}
.av-veredicto {
  font-size: 10.5px;
  color: #666;
  text-align: center;
  line-height: 1.35;
  max-height: 3em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.av-empty {
  padding: 24px 12px;
  text-align: center;
  color: #666;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.av-narrativa {
  color: #ccc;
  font-size: 13.5px;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}
</style>
