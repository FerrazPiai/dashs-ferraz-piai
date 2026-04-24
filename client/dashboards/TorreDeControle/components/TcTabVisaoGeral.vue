<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { getChartDefaults, getSemanticColors } from '../../../composables/useChartDefaults.js'

const props = defineProps({
  heatmap:    { type: Array,  required: true },
  churn:      { type: Array,  default: () => [] },
  scorecards: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['abrir-cliente'])

// ───────────────────────────────
// Heatmap agregado por fase (verde/amarelo/vermelho)
// ───────────────────────────────
const porFase = computed(() => {
  const acc = {}
  const ordem = {}
  let i = 0
  for (const row of props.heatmap) {
    if (!acc[row.fase]) {
      acc[row.fase] = { fase: row.fase, verde: 0, amarelo: 0, vermelho: 0, incompleta: 0 }
      ordem[row.fase] = i++
    }
    const cor = row.status_cor
    if (cor === 'verde' || cor === 'amarelo' || cor === 'vermelho' || cor === 'incompleta') {
      acc[row.fase][cor] = Number(row.total) || 0
    }
  }
  return Object.values(acc)
    .map(f => ({
      ...f,
      total: f.verde + f.amarelo + f.vermelho + f.incompleta,
      pct_vermelho: (f.verde + f.amarelo + f.vermelho) > 0
        ? Math.round((f.vermelho / (f.verde + f.amarelo + f.vermelho)) * 100)
        : 0
    }))
    .sort((a, b) => ordem[a.fase] - ordem[b.fase])
})

// Agregado global (para o donut)
const totaisGerais = computed(() => {
  const t = { verde: 0, amarelo: 0, vermelho: 0, incompleta: 0 }
  for (const f of porFase.value) {
    t.verde += f.verde
    t.amarelo += f.amarelo
    t.vermelho += f.vermelho
    t.incompleta += f.incompleta
  }
  t.total = t.verde + t.amarelo + t.vermelho + t.incompleta
  return t
})

// Fase mais critica (maior % vermelho com ao menos 1 analise)
const faseMaisCritica = computed(() => {
  const candidatos = porFase.value.filter(f => (f.verde + f.amarelo + f.vermelho) > 0)
  if (!candidatos.length) return null
  return [...candidatos].sort((a, b) => b.pct_vermelho - a.pct_vermelho)[0]
})

// Fase mais saudavel (maior % verde com ao menos 1 analise)
const faseMaisSaudavel = computed(() => {
  const candidatos = porFase.value.filter(f => (f.verde + f.amarelo + f.vermelho) > 0)
  if (!candidatos.length) return null
  return [...candidatos].sort((a, b) => {
    const denA = a.verde + a.amarelo + a.vermelho
    const denB = b.verde + b.amarelo + b.vermelho
    return (b.verde / denB) - (a.verde / denA)
  })[0]
})

// Top 5 leads em risco (vem de painelGeral.churn, score asc)
const topRisco = computed(() => props.churn.slice(0, 5))

// Empty state
const vazio = computed(() => totaisGerais.value.total === 0)

// Helper p/ classe do score
function classeScore(score) {
  const s = Number(score)
  if (s < 3) return 'score--critico'
  if (s < 5) return 'score--alto'
  if (s < 7) return 'score--medio'
  return 'score--bom'
}

// Chart refs
const stackedCanvas = ref(null)
const donutCanvas = ref(null)
let stackedChart = null
let donutChart = null

const COLORS = getSemanticColors()

function renderStacked() {
  if (stackedChart) { stackedChart.destroy(); stackedChart = null }
  if (!stackedCanvas.value || !window.Chart || !porFase.value.length) return
  const fases = porFase.value
  const labels = fases.map(f => f.fase)

  const opts = getChartDefaults({
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = fases[ctx.dataIndex].verde + fases[ctx.dataIndex].amarelo + fases[ctx.dataIndex].vermelho
            const pct = total > 0 ? Math.round((ctx.parsed.x / total) * 100) : 0
            return `${ctx.dataset.label}: ${ctx.parsed.x} (${pct}%)`
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        ticks: { precision: 0 }
      },
      y: {
        stacked: true,
        grid: { display: false }
      }
    }
  })

  stackedChart = new window.Chart(stackedCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Verde',
          data: fases.map(f => f.verde),
          backgroundColor: COLORS.safe,
          borderRadius: 3,
          borderSkipped: false
        },
        {
          label: 'Amarelo',
          data: fases.map(f => f.amarelo),
          backgroundColor: COLORS.care,
          borderRadius: 3,
          borderSkipped: false
        },
        {
          label: 'Vermelho',
          data: fases.map(f => f.vermelho),
          backgroundColor: COLORS.danger,
          borderRadius: 3,
          borderSkipped: false
        }
      ]
    },
    options: opts
  })
}

function renderDonut() {
  if (donutChart) { donutChart.destroy(); donutChart = null }
  if (!donutCanvas.value || !window.Chart) return
  const t = totaisGerais.value
  const data = [t.verde, t.amarelo, t.vermelho]
  if (data.reduce((a, b) => a + b, 0) === 0) return

  donutChart = new window.Chart(donutCanvas.value, {
    type: 'doughnut',
    data: {
      labels: ['Verde', 'Amarelo', 'Vermelho'],
      datasets: [{
        data,
        backgroundColor: [COLORS.safe, COLORS.care, COLORS.danger],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#ffffff',
          bodyColor: '#cccccc',
          borderColor: '#333333',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
              const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0
              return `${ctx.label}: ${ctx.parsed} (${pct}%)`
            }
          }
        }
      }
    }
  })
}

function renderAll() {
  renderStacked()
  renderDonut()
}

onMounted(async () => {
  await nextTick()
  renderAll()
  if (window.lucide) window.lucide.createIcons()
})

watch(() => props.heatmap, async () => {
  await nextTick()
  renderAll()
  if (window.lucide) window.lucide.createIcons()
}, { deep: true })

watch(() => props.churn, async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}, { deep: true })

onBeforeUnmount(() => {
  stackedChart?.destroy()
  donutChart?.destroy()
})
</script>

<template>
  <div class="tab-visao-geral">
    <!-- ═════════════════════════════════════════════════════
         Empty state global
         ═════════════════════════════════════════════════════ -->
    <div v-if="vazio" class="empty-block">
      <i data-lucide="activity" class="empty-icon"></i>
      <p class="empty-title">Ainda nao ha analises registradas</p>
      <small>Execute uma analise em qualquer lead da matriz para comecar a popular esta visao.</small>
    </div>

    <template v-else>
      <!-- ═════════════════════════════════════════════════════
           Linha 1 — Insight cards (operacional/decisao)
           ═════════════════════════════════════════════════════ -->
      <div class="insight-row">
        <div class="insight insight--danger">
          <div class="insight-head">
            <i data-lucide="alert-triangle"></i>
            <span class="insight-label">Fase mais critica</span>
          </div>
          <div v-if="faseMaisCritica" class="insight-body">
            <strong class="insight-value">{{ faseMaisCritica.fase }}</strong>
            <span class="insight-meta">
              {{ faseMaisCritica.pct_vermelho }}% em vermelho
              <span class="insight-sep">·</span>
              {{ faseMaisCritica.vermelho }} de {{ faseMaisCritica.verde + faseMaisCritica.amarelo + faseMaisCritica.vermelho }} leads
            </span>
          </div>
          <div v-else class="insight-body">
            <span class="insight-meta">Sem dados</span>
          </div>
        </div>

        <div class="insight insight--safe">
          <div class="insight-head">
            <i data-lucide="check-circle-2"></i>
            <span class="insight-label">Fase mais saudavel</span>
          </div>
          <div v-if="faseMaisSaudavel" class="insight-body">
            <strong class="insight-value">{{ faseMaisSaudavel.fase }}</strong>
            <span class="insight-meta">
              {{ faseMaisSaudavel.verde }} verdes em {{ faseMaisSaudavel.verde + faseMaisSaudavel.amarelo + faseMaisSaudavel.vermelho }} leads
            </span>
          </div>
          <div v-else class="insight-body">
            <span class="insight-meta">Sem dados</span>
          </div>
        </div>

        <div class="insight insight--neutral">
          <div class="insight-head">
            <i data-lucide="list-checks"></i>
            <span class="insight-label">Cobertura de analise</span>
          </div>
          <div class="insight-body">
            <strong class="insight-value">{{ totaisGerais.total }}</strong>
            <span class="insight-meta">
              fases ja analisadas
              <span v-if="totaisGerais.incompleta > 0" class="insight-sep">·</span>
              <span v-if="totaisGerais.incompleta > 0">{{ totaisGerais.incompleta }} incompletas</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ═════════════════════════════════════════════════════
           Linha 2 — Charts principais
           ═════════════════════════════════════════════════════ -->
      <div class="chart-row">
        <!-- Stacked bar: Saude por Fase -->
        <div class="chart-card chart-card--wide">
          <div class="chart-head">
            <div>
              <h3 class="chart-title">Saude por Fase</h3>
              <p class="chart-subtitle">Distribuicao verde / amarelo / vermelho em cada fase do pipeline Saber</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot legend-dot--safe"></span>Verde (9-10)</span>
              <span class="legend-item"><span class="legend-dot legend-dot--care"></span>Amarelo (7-8)</span>
              <span class="legend-item"><span class="legend-dot legend-dot--danger"></span>Vermelho (&lt;7)</span>
            </div>
          </div>
          <div class="chart-canvas-wrap chart-canvas-wrap--tall">
            <canvas ref="stackedCanvas"></canvas>
          </div>
        </div>

        <!-- Donut: distribuicao agregada -->
        <div class="chart-card">
          <div class="chart-head">
            <div>
              <h3 class="chart-title">Distribuicao geral</h3>
              <p class="chart-subtitle">Agregado de todas as fases analisadas</p>
            </div>
          </div>
          <div class="chart-canvas-wrap">
            <canvas ref="donutCanvas"></canvas>
          </div>
          <div class="donut-summary">
            <div class="donut-stat">
              <span class="donut-stat-value donut-stat--safe">{{ totaisGerais.verde }}</span>
              <span class="donut-stat-label">Verde</span>
            </div>
            <div class="donut-stat">
              <span class="donut-stat-value donut-stat--care">{{ totaisGerais.amarelo }}</span>
              <span class="donut-stat-label">Amarelo</span>
            </div>
            <div class="donut-stat">
              <span class="donut-stat-value donut-stat--danger">{{ totaisGerais.vermelho }}</span>
              <span class="donut-stat-label">Vermelho</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═════════════════════════════════════════════════════
           Linha 3 — Top 5 leads em risco + tabela completa
           ═════════════════════════════════════════════════════ -->
      <div class="risco-card">
        <div class="chart-head">
          <div>
            <h3 class="chart-title">Top leads em risco</h3>
            <p class="chart-subtitle">Ordenado por menor score — clique para abrir no super-painel</p>
          </div>
          <span v-if="churn.length > 5" class="chart-tag">Mostrando 5 de {{ churn.length }}</span>
        </div>
        <ul v-if="topRisco.length" class="risco-list">
          <li
            v-for="c in topRisco"
            :key="c.id"
            class="risco-item"
            @click="emit('abrir-cliente', c.id)"
          >
            <div class="risco-nome">
              <strong>{{ c.nome }}</strong>
              <span v-if="c.veredicto" class="risco-veredicto">{{ c.veredicto }}</span>
            </div>
            <div class="risco-meta">
              <span v-if="Number(c.dores_graves) > 0" class="risco-dores">
                <i data-lucide="alert-octagon"></i>
                {{ c.dores_graves }} dor(es) grave(s)
              </span>
              <span class="risco-score" :class="classeScore(c.score)">{{ c.score }}</span>
              <i data-lucide="chevron-right" class="risco-arrow"></i>
            </div>
          </li>
        </ul>
        <div v-else class="empty-inline">Nenhum lead com score abaixo de 6.</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-visao-geral {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding-top: var(--spacing-md);
}

/* ═══ Empty state ═══ */
.empty-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px;
  padding: 64px 24px;
  background: var(--bg-card);
  border: 1px dashed var(--border-card);
  border-radius: var(--radius-md);
  color: var(--text-lowest);
  text-align: center;
}
.empty-icon { width: 32px; height: 32px; color: var(--border-input); }
.empty-title { color: var(--text-medium); font-size: var(--font-size-md); margin: 0; }

/* ═══ Insight cards ═══ */
.insight-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}
.insight {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: 10px;
  position: relative;
  overflow: hidden;
}
.insight::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0;
  height: 2px;
}
.insight--danger::before  { background: var(--color-danger); }
.insight--safe::before    { background: var(--color-safe); }
.insight--neutral::before { background: var(--chart-color-neutral); }

.insight-head {
  display: flex; align-items: center; gap: 8px;
  color: var(--text-low);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: var(--font-weight-semibold);
}
.insight-head i { width: 14px; height: 14px; }
.insight--danger  .insight-head { color: var(--color-danger); }
.insight--safe    .insight-head { color: var(--color-safe); }
.insight--neutral .insight-head { color: var(--text-medium); }

.insight-body { display: flex; flex-direction: column; gap: 2px; }
.insight-value {
  color: var(--text-high);
  font-size: 22px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}
.insight-meta {
  color: var(--text-low);
  font-size: var(--font-size-sm);
}
.insight-sep {
  display: inline-block;
  margin: 0 6px;
  color: var(--border-input);
}

/* ═══ Chart cards ═══ */
.chart-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-md);
}
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.chart-card--wide { min-height: 320px; }
.chart-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}
.chart-title {
  color: var(--text-high);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin: 0;
}
.chart-subtitle {
  color: var(--text-lowest);
  font-size: var(--font-size-sm);
  margin: 2px 0 0;
}
.chart-tag {
  color: var(--text-lowest);
  font-size: var(--font-size-xs);
  background: var(--bg-inner);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.chart-legend {
  display: flex; gap: 14px;
  align-items: center;
}
.legend-item {
  display: flex; align-items: center; gap: 6px;
  color: var(--text-low);
  font-size: var(--font-size-sm);
}
.legend-dot {
  width: 10px; height: 10px;
  border-radius: 2px;
}
.legend-dot--safe   { background: var(--color-safe); }
.legend-dot--care   { background: var(--color-care); }
.legend-dot--danger { background: var(--color-danger); }

.chart-canvas-wrap {
  position: relative;
  height: 220px;
  flex: 1;
}
.chart-canvas-wrap--tall { height: 280px; }

/* ═══ Donut summary ═══ */
.donut-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--border-row);
}
.donut-stat {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.donut-stat-value {
  font-size: 18px;
  font-weight: var(--font-weight-semibold);
}
.donut-stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-lowest);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.donut-stat--safe   { color: var(--color-safe); }
.donut-stat--care   { color: var(--color-care); }
.donut-stat--danger { color: var(--color-danger); }

/* ═══ Risco card ═══ */
.risco-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.risco-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column;
}
.risco-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 10px;
  border-bottom: 1px solid var(--border-row);
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}
.risco-item:last-child { border-bottom: none; }
.risco-item:hover {
  background: var(--bg-inner);
}
.risco-nome { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.risco-nome strong {
  color: var(--text-high);
  font-size: var(--font-size-md);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.risco-veredicto {
  color: var(--text-lowest);
  font-size: var(--font-size-sm);
}
.risco-meta {
  display: flex; align-items: center; gap: 14px;
  flex-shrink: 0;
}
.risco-dores {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.risco-dores i { width: 13px; height: 13px; }
.risco-score {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 38px; padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
}
.score--critico { background: var(--color-danger); color: var(--text-high); }
.score--alto    { background: var(--color-care);   color: #000; }
.score--medio   { background: var(--bg-inner);     color: var(--text-high); border: 1px solid var(--border-card); }
.score--bom     { background: var(--color-safe);   color: #000; }
.risco-arrow {
  width: 16px; height: 16px;
  color: var(--text-lowest);
}

.empty-inline {
  color: var(--text-lowest);
  font-size: var(--font-size-sm);
  text-align: center;
  padding: var(--spacing-md);
}

@media (max-width: 1100px) {
  .chart-row { grid-template-columns: 1fr; }
  .insight-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .insight-row { grid-template-columns: 1fr; }
  .chart-legend { gap: 10px; flex-wrap: wrap; }
}
</style>
