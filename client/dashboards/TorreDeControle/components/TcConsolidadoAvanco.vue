<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  avanco: { type: Object, default: null }
})

const fases = computed(() => Array.isArray(props.avanco?.fases) ? props.avanco.fases : [])
const tendencia = computed(() => props.avanco?.tendencia || null)
const evolucao = computed(() => props.avanco?.evolucao || '')

// Escala unica: 9-10 = verde, 7-8 = amarelo, <=6 = vermelho
function corDoScore(score) {
  const s = Number(score)
  if (!isFinite(s)) return 'bar--empty'
  if (s >= 9) return 'bar--verde'
  if (s >= 7) return 'bar--amarelo'
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
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
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
  color: var(--text-high);
  margin: 0;
  font-weight: var(--font-weight-semibold);
  display: flex;
  align-items: center;
  gap: 8px;
}
.av-head-icon { width: 16px; height: 16px; color: var(--text-muted); }

.av-tendencia {
  font-size: var(--font-size-sm);
  padding: 3px 9px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: var(--font-weight-bold);
}
.av-tendencia--ascendente {
  background: rgba(var(--color-safe-rgb), 0.15); color: var(--color-safe);
}
.av-tendencia--descendente {
  background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger);
}
.av-tendencia--estavel {
  background: var(--bg-inner); color: var(--text-low);
}

.av-chart {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 10px;
  align-items: end;
  min-height: 150px;
  padding: 10px 0;
  border-top: 1px solid var(--border-row);
  border-bottom: 1px solid var(--border-row);
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
  font-size: var(--font-size-sm);
  color: var(--text-low);
  font-weight: var(--font-weight-semibold);
}
.bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  transition: height var(--transition-normal) ease-out;
}
.bar--verde    { background: linear-gradient(to top, #16a34a, var(--color-safe)); }
.bar--amarelo  { background: linear-gradient(to top, #d97706, var(--color-care)); }
.bar--vermelho { background: linear-gradient(to top, #b91c1c, var(--color-danger)); }
.bar--empty    { background: var(--bg-toggle-active); }

.av-delta {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.3;
}
.chip--pos    { background: rgba(var(--color-safe-rgb), 0.15);   color: var(--color-safe); }
.chip--neg    { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); }
.chip--neutro { background: var(--bg-inner); color: var(--text-muted); }
.av-delta-spacer { height: 16px; }

.av-nome {
  font-size: var(--font-size-sm);
  color: var(--text-low);
  text-align: center;
  font-weight: var(--font-weight-medium);
}
.av-veredicto {
  font-size: var(--font-size-xs);
  color: var(--text-lowest);
  text-align: center;
  line-height: 1.35;
  max-height: 3em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.av-empty {
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
  color: var(--text-lowest);
  font-size: var(--font-size-md);
  background: var(--bg-inner);
  border-radius: var(--radius-sm);
}

.av-narrativa {
  color: var(--text-medium);
  font-size: var(--font-size-md);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}
</style>
