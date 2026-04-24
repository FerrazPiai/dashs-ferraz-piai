<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { getSemanticColors } from '../../../composables/useChartDefaults.js'

const props = defineProps({
  colaboradores: { type: Array, required: true }
})

const emit = defineEmits(['abrir-colab'])

const COLORS = getSemanticColors()

// ───────────────────────────────
// Agregados do time (baseline para deltas)
// ───────────────────────────────
const agregados = computed(() => {
  const list = props.colaboradores || []
  if (!list.length) return null

  const totalClientes    = list.reduce((s, c) => s + (Number(c.total_clientes) || 0), 0)
  const totalAuditados   = list.reduce((s, c) => s + (Number(c.clientes_com_analise) || 0), 0)
  const totalRisco       = list.reduce((s, c) => s + (Number(c.clientes_risco) || 0), 0)

  const scoresValidos = list
    .map(c => c.score_medio !== null && c.score_medio !== undefined ? Number(c.score_medio) : null)
    .filter(s => s !== null && !Number.isNaN(s))
  const scoreMedioTime = scoresValidos.length
    ? Math.round((scoresValidos.reduce((a, b) => a + b, 0) / scoresValidos.length) * 10) / 10
    : null

  const cobertura = totalClientes > 0
    ? Math.round((totalAuditados / totalClientes) * 100)
    : 0

  const pctRiscoTime = totalAuditados > 0
    ? Math.round((totalRisco / totalAuditados) * 100)
    : 0

  // AMs "abaixo da linha" — score_medio < (media - 1) do time, entre os que tem score
  const abaixo = scoreMedioTime != null
    ? scoresValidos.filter(s => s < scoreMedioTime - 1).length
    : 0

  return {
    totalAMs: list.length,
    totalClientes,
    totalAuditados,
    totalRisco,
    scoreMedioTime,
    cobertura,
    pctRiscoTime,
    abaixo
  }
})

// ───────────────────────────────
// Ranking tagueado — status auto-gerado
// ───────────────────────────────
const ranking = computed(() => {
  const list = props.colaboradores || []
  if (!list.length) return []
  const med = agregados.value?.scoreMedioTime ?? null

  // Maior carteira — para normalizar a barra de volume
  const maxClientes = list.reduce((m, c) => Math.max(m, Number(c.total_clientes) || 0), 0) || 1

  return list.map(c => {
    const total = Number(c.total_clientes) || 0
    const aud = Number(c.clientes_com_analise) || 0
    const risco = Number(c.clientes_risco) || 0
    const score = c.score_medio !== null && c.score_medio !== undefined ? Number(c.score_medio) : null
    const coberturaPct = total > 0 ? Math.round((aud / total) * 100) : 0
    const riscoPct = aud > 0 ? Math.round((risco / aud) * 100) : 0

    // Status auto-gerado
    let status = 'neutro'
    let statusLabel = '—'
    if (score == null) {
      status = 'pendente'; statusLabel = 'Sem dados'
    } else if (riscoPct >= 30 || score < 5) {
      status = 'critico'; statusLabel = 'Precisa coaching'
    } else if (total > 0 && total >= Math.ceil(maxClientes * 0.75) && score < (med ?? 7)) {
      status = 'sobrecarregado'; statusLabel = 'Sobrecarregado'
    } else if (total > 0 && total <= Math.max(1, Math.floor(maxClientes * 0.2)) && score >= 7.5) {
      status = 'ocioso'; statusLabel = 'Subutilizado'
    } else if (score >= (med ?? 7) + 0.5 && riscoPct < 15) {
      status = 'top'; statusLabel = 'Top performer'
    } else {
      status = 'ok'; statusLabel = 'Dentro da media'
    }

    const delta = (score != null && med != null) ? Math.round((score - med) * 10) / 10 : null

    return {
      ...c,
      totalClientes: total,
      auditados: aud,
      risco,
      score,
      coberturaPct,
      riscoPct,
      volumePct: total > 0 ? Math.round((total / maxClientes) * 100) : 0,
      status, statusLabel, delta
    }
  }).sort((a, b) => {
    // Ordena por: maior %risco -> menor score -> mais clientes
    if (b.riscoPct !== a.riscoPct) return b.riscoPct - a.riscoPct
    const sA = a.score ?? 99, sB = b.score ?? 99
    if (sA !== sB) return sA - sB
    return b.totalClientes - a.totalClientes
  })
})

// ───────────────────────────────
// Sinais da IA (coluna lateral) — agrega pontos_atencao + recomendacoes
// ───────────────────────────────
const sinaisIa = computed(() => {
  const out = []
  for (const c of props.colaboradores || []) {
    for (const p of (c.pontos_atencao || [])) {
      out.push({ tipo: 'atencao', texto: p, colab: c.name, id: c.id, periodo: c.periodo })
    }
    for (const r of (c.recomendacoes || [])) {
      out.push({ tipo: 'recomendacao', texto: r, colab: c.name, id: c.id, periodo: c.periodo })
    }
  }
  // Limita aos 15 mais recentes
  return out
    .sort((a, b) => (b.periodo || '').localeCompare(a.periodo || ''))
    .slice(0, 15)
})

// ───────────────────────────────
// Scatter: carga x qualidade
// ───────────────────────────────
const scatterCanvas = ref(null)
let scatterChart = null

function statusColorFor(status) {
  switch (status) {
    case 'top':            return COLORS.safe
    case 'ocioso':         return '#a855f7'
    case 'sobrecarregado': return COLORS.care
    case 'critico':        return COLORS.danger
    default:               return COLORS.neutral
  }
}

function renderScatter() {
  if (scatterChart) { scatterChart.destroy(); scatterChart = null }
  if (!scatterCanvas.value || !window.Chart) return

  const pts = ranking.value
    .filter(c => c.score != null && c.totalClientes > 0)
    .map(c => ({
      x: c.totalClientes,
      y: c.score,
      r: Math.max(5, Math.min(22, 5 + (c.risco || 0) * 3)),
      label: c.name,
      risco: c.risco,
      status: c.status,
      color: statusColorFor(c.status) + 'cc'
    }))

  if (!pts.length) return

  const medX = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const medY = pts.reduce((s, p) => s + p.y, 0) / pts.length

  const quadrantLine = {
    id: 'quadrantLine',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart
      const px = x.getPixelForValue(medX)
      const py = y.getPixelForValue(medY)
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(px, top); ctx.lineTo(px, bottom)
      ctx.moveTo(left, py); ctx.lineTo(right, py)
      ctx.stroke()

      // Labels quadrantes
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '10px Ubuntu, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('ESTRELA', (left + px) / 2, top + 14)
      ctx.fillText('SOBRECARREGADO', (px + right) / 2, top + 14)
      ctx.fillText('OCIOSO', (left + px) / 2, bottom - 6)
      ctx.fillText('CRITICO', (px + right) / 2, bottom - 6)
      ctx.restore()
    }
  }

  scatterChart = new window.Chart(scatterCanvas.value, {
    type: 'bubble',
    data: {
      datasets: [{
        data: pts,
        backgroundColor: pts.map(p => p.color),
        borderColor: pts.map(p => statusColorFor(p.status)),
        borderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: '#333',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => items[0]?.raw?.label || '',
            label: (ctx) => {
              const d = ctx.raw
              return [
                `${d.x} clientes`,
                `Score ${d.y}`,
                `${d.risco || 0} em risco`
              ]
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Clientes na carteira', color: '#888', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          ticks: { color: '#666', font: { size: 11, family: "'Ubuntu', sans-serif" }, precision: 0, stepSize: 1 },
          beginAtZero: true
        },
        y: {
          title: { display: true, text: 'Score medio', color: '#888', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          ticks: { color: '#666', font: { size: 11, family: "'Ubuntu', sans-serif" } },
          min: 0, max: 10
        }
      }
    },
    plugins: [quadrantLine]
  })
}

onBeforeUnmount(() => {
  scatterChart?.destroy()
})

onMounted(async () => {
  await nextTick()
  renderScatter()
  if (window.lucide) window.lucide.createIcons()
})

watch(() => props.colaboradores, async () => {
  await nextTick()
  renderScatter()
  if (window.lucide) window.lucide.createIcons()
}, { deep: true })

function fmtPct(n) { return `${n}%` }
function scoreClass(score) {
  if (score == null) return 'score--na'
  const s = Number(score)
  if (s < 5) return 'score--critico'
  if (s < 7) return 'score--medio'
  if (s < 8.5) return 'score--bom'
  return 'score--top'
}
</script>

<template>
  <div class="tab-colabs">
    <!-- Empty state -->
    <div v-if="!colaboradores.length" class="empty-block">
      <i data-lucide="users" class="empty-icon"></i>
      <p class="empty-title">Nenhuma analise de colaboradores ainda</p>
      <small>A primeira roda no proximo domingo as 03:00.</small>
    </div>

    <template v-else>
      <!-- ═════════════════════════════════════════════════════
           Strip de saude do time
           ═════════════════════════════════════════════════════ -->
      <div v-if="agregados" class="time-strip">
        <div class="time-block">
          <span class="time-label">Carteira auditada</span>
          <span class="time-value">{{ agregados.cobertura }}<small>%</small></span>
          <span class="time-hint">{{ agregados.totalAuditados }} de {{ agregados.totalClientes }} clientes</span>
        </div>
        <div class="time-block">
          <span class="time-label">Score medio do time</span>
          <span class="time-value">{{ agregados.scoreMedioTime ?? '—' }}</span>
          <span class="time-hint">{{ agregados.totalAMs }} accounts ativos</span>
        </div>
        <div class="time-block" :class="{ 'time-block--alert': agregados.pctRiscoTime >= 25 }">
          <span class="time-label">Clientes em risco</span>
          <span class="time-value">{{ agregados.pctRiscoTime }}<small>%</small></span>
          <span class="time-hint">{{ agregados.totalRisco }} com score abaixo de 5</span>
        </div>
        <div class="time-block" :class="{ 'time-block--alert': agregados.abaixo > 0 }">
          <span class="time-label">Abaixo da linha</span>
          <span class="time-value">{{ agregados.abaixo }}</span>
          <span class="time-hint">AMs com score &lt; media &minus; 1</span>
        </div>
      </div>

      <!-- ═════════════════════════════════════════════════════
           Grid: Ranking (esq) + Feed IA (dir)
           ═════════════════════════════════════════════════════ -->
      <div class="accounts-grid">
        <!-- ── Ranking principal ── -->
        <div class="ranking-card">
          <div class="ranking-head">
            <div>
              <h3 class="card-title">Ranking operacional</h3>
              <p class="card-subtitle">Ordenado por maior % de clientes em risco — onde age primeiro</p>
            </div>
          </div>
          <div class="ranking-scroll">
            <table class="ranking-table">
              <thead>
                <tr>
                  <th class="col-pos">#</th>
                  <th class="col-name">Account</th>
                  <th class="col-volume">Carteira</th>
                  <th class="col-cobertura">Auditada</th>
                  <th class="col-score">Score</th>
                  <th class="col-risco">Risco</th>
                  <th class="col-status">Status IA</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(c, i) in ranking"
                  :key="c.id"
                  class="ranking-row"
                  @click="emit('abrir-colab', c.id)"
                >
                  <td class="col-pos">
                    <span class="pos-badge" :class="`pos--${i < 3 ? 'top' : 'rest'}`">{{ i + 1 }}</span>
                  </td>
                  <td class="col-name">
                    <div class="name-wrap">
                      <strong>{{ c.name }}</strong>
                      <span v-if="c.email" class="name-sub">{{ c.email }}</span>
                    </div>
                  </td>
                  <td class="col-volume">
                    <div class="microbar">
                      <div class="microbar-fill" :style="{ width: c.volumePct + '%' }"></div>
                    </div>
                    <span class="microbar-label">{{ c.totalClientes }}</span>
                  </td>
                  <td class="col-cobertura">
                    <div class="cobertura-wrap">
                      <div class="donut-mini" :style="{ background: `conic-gradient(var(--color-safe) ${c.coberturaPct * 3.6}deg, var(--bg-inner) 0)` }">
                        <span>{{ c.coberturaPct }}%</span>
                      </div>
                    </div>
                  </td>
                  <td class="col-score">
                    <div class="score-wrap">
                      <span class="score-badge" :class="scoreClass(c.score)">
                        {{ c.score ?? '—' }}
                      </span>
                      <span v-if="c.delta != null" class="score-delta" :class="c.delta >= 0 ? 'delta-up' : 'delta-down'">
                        {{ c.delta >= 0 ? '+' : '' }}{{ c.delta }}
                      </span>
                    </div>
                  </td>
                  <td class="col-risco">
                    <div class="risk-wrap">
                      <div class="risk-bar">
                        <div class="risk-bar-line"></div>
                        <div class="risk-bar-fill" :class="c.riscoPct >= 30 ? 'risk-bar-fill--danger' : c.riscoPct >= 15 ? 'risk-bar-fill--care' : 'risk-bar-fill--safe'" :style="{ width: Math.min(100, c.riscoPct) + '%' }"></div>
                      </div>
                      <span class="risk-label">{{ c.risco }}/{{ c.auditados || 0 }}</span>
                    </div>
                  </td>
                  <td class="col-status">
                    <span class="status-tag" :class="`tag--${c.status}`">{{ c.statusLabel }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Feed lateral de sinais IA ── -->
        <aside class="sinais-card">
          <div class="sinais-head">
            <h3 class="card-title">Sinais da IA</h3>
            <p class="card-subtitle">Pontos de atencao e recomendacoes agregadas</p>
          </div>
          <div v-if="!sinaisIa.length" class="empty-inline">
            Sem sinais agregados. Execute analises de colaboradores.
          </div>
          <ul v-else class="sinais-list">
            <li
              v-for="(s, i) in sinaisIa"
              :key="i"
              class="sinal-item"
              :class="`sinal--${s.tipo}`"
            >
              <div class="sinal-head">
                <span class="sinal-tag">{{ s.tipo === 'atencao' ? 'Atencao' : 'Recomendacao' }}</span>
                <span class="sinal-colab">{{ s.colab }}</span>
              </div>
              <p class="sinal-text">{{ s.texto }}</p>
            </li>
          </ul>
        </aside>
      </div>

      <!-- ═════════════════════════════════════════════════════
           Scatter: Carga x Qualidade
           ═════════════════════════════════════════════════════ -->
      <div class="scatter-card">
        <div class="ranking-head">
          <div>
            <h3 class="card-title">Carga vs Qualidade</h3>
            <p class="card-subtitle">Eixo X: clientes sob responsabilidade &middot; Eixo Y: score medio &middot; Tamanho: clientes em risco</p>
          </div>
          <div class="scatter-legend">
            <span class="legend-quadrant q-top">Estrela</span>
            <span class="legend-quadrant q-ocioso">Ocioso</span>
            <span class="legend-quadrant q-sobrecarregado">Sobrecarregado</span>
            <span class="legend-quadrant q-critico">Critico</span>
          </div>
        </div>
        <div class="scatter-canvas-wrap">
          <canvas ref="scatterCanvas"></canvas>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-colabs {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding-top: var(--spacing-md);
}

/* ═══ Empty ═══ */
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

.empty-inline {
  padding: var(--spacing-md);
  color: var(--text-lowest); font-size: var(--font-size-sm);
  text-align: center;
}

/* ═══ Strip do time ═══ */
.time-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}
.time-block {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 2px;
  position: relative; overflow: hidden;
}
.time-block::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0;
  height: 2px; background: var(--chart-color-neutral);
}
.time-block--alert::before { background: var(--color-danger); }
.time-block--alert .time-value { color: var(--color-danger); }
.time-label {
  font-size: var(--font-size-xs); color: var(--text-lowest);
  text-transform: uppercase; letter-spacing: 0.5px; font-weight: var(--font-weight-semibold);
}
.time-value {
  font-size: 24px; color: var(--text-high);
  font-weight: var(--font-weight-semibold); line-height: 1.1; margin-top: 4px;
}
.time-value small { font-size: 14px; color: var(--text-low); margin-left: 2px; }
.time-hint { font-size: var(--font-size-sm); color: var(--text-low); margin-top: 4px; }

/* ═══ Grid ranking + sinais ═══ */
.accounts-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--spacing-md);
}
.ranking-card, .sinais-card, .scatter-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.ranking-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: var(--spacing-md); flex-wrap: wrap;
}
.card-title {
  color: var(--text-high); font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold); margin: 0;
}
.card-subtitle {
  color: var(--text-lowest); font-size: var(--font-size-sm);
  margin: 2px 0 0;
}

/* ═══ Ranking table ═══ */
.ranking-scroll { overflow-x: auto; }
.ranking-table {
  width: 100%; border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.ranking-table th {
  color: var(--text-lowest);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-xs);
  text-transform: uppercase; letter-spacing: 0.5px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-row);
  white-space: nowrap;
}
.ranking-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-row);
  vertical-align: middle;
  color: var(--text-medium);
}
.ranking-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ranking-row:hover { background: var(--bg-inner); }
.ranking-row:last-child td { border-bottom: none; }

.col-pos { width: 40px; }
.pos-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);
  background: var(--bg-inner); color: var(--text-low);
}
.pos--top { background: var(--color-primary); color: var(--text-high); }

.col-name { min-width: 160px; }
.name-wrap { display: flex; flex-direction: column; gap: 2px; }
.name-wrap strong { color: var(--text-high); font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); }
.name-sub { color: var(--text-lowest); font-size: var(--font-size-xs); }

.col-volume { min-width: 140px; }
.microbar {
  background: var(--bg-inner); height: 6px; border-radius: 3px;
  overflow: hidden; margin-bottom: 4px;
}
.microbar-fill {
  height: 100%; background: var(--chart-color-neutral);
  border-radius: 3px; transition: width 0.3s;
}
.microbar-label { color: var(--text-high); font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); }

.col-cobertura { width: 90px; }
.cobertura-wrap { display: flex; justify-content: center; }
.donut-mini {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.donut-mini::before {
  content: ''; position: absolute;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--bg-card);
}
.donut-mini span {
  position: relative; z-index: 1;
  font-size: 10px; color: var(--text-high);
  font-weight: var(--font-weight-semibold);
}

.col-score { width: 110px; }
.score-wrap { display: flex; align-items: center; gap: 6px; }
.score-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 38px; padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: var(--font-size-md); font-weight: var(--font-weight-bold);
}
.score--critico { background: var(--color-danger); color: var(--text-high); }
.score--medio   { background: var(--color-care);   color: #000; }
.score--bom     { background: var(--color-safe);   color: #000; }
.score--top     { background: var(--color-safe);   color: #000; box-shadow: 0 0 0 2px rgba(var(--color-safe-rgb), 0.25); }
.score--na      { background: var(--bg-inner);     color: var(--text-low); border: 1px dashed var(--border-card); }
.score-delta {
  font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
  padding: 2px 6px; border-radius: var(--radius-sm);
}
.delta-up   { color: var(--color-safe);   background: rgba(var(--color-safe-rgb), 0.1); }
.delta-down { color: var(--color-danger); background: rgba(var(--color-danger-rgb), 0.1); }

.col-risco { min-width: 180px; }
.risk-wrap { display: flex; align-items: center; gap: 10px; }
.risk-bar {
  position: relative;
  flex: 1;
  height: 8px;
  background: var(--bg-inner);
  border-radius: 4px;
  overflow: hidden;
}
.risk-bar-line {
  position: absolute; top: 0; bottom: 0; left: 30%;
  width: 1px; background: var(--text-lowest); opacity: 0.5;
  z-index: 1;
}
.risk-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.risk-bar-fill--safe   { background: var(--color-safe); }
.risk-bar-fill--care   { background: var(--color-care); }
.risk-bar-fill--danger { background: var(--color-danger); }
.risk-label { color: var(--text-low); font-size: var(--font-size-xs); min-width: 42px; text-align: right; }

.col-status { min-width: 150px; }
.status-tag {
  display: inline-block;
  padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
  text-transform: uppercase; letter-spacing: 0.3px;
  white-space: nowrap;
}
.tag--top            { background: rgba(var(--color-safe-rgb),   0.15); color: var(--color-safe); }
.tag--ok             { background: var(--bg-inner); color: var(--text-medium); }
.tag--ocioso         { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.tag--sobrecarregado { background: rgba(var(--color-care-rgb),   0.15); color: var(--color-care); }
.tag--critico        { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); }
.tag--pendente       { background: var(--bg-inner); color: var(--text-lowest); border: 1px dashed var(--border-card); }
.tag--neutro         { background: var(--bg-inner); color: var(--text-low); }

/* ═══ Sinais ═══ */
.sinais-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; }
.sinais-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
  max-height: 520px; overflow-y: auto;
}
.sinal-item {
  background: var(--bg-inner);
  border-left: 2px solid var(--chart-color-neutral);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 10px 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.sinal--atencao       { border-left-color: var(--color-care); }
.sinal--recomendacao  { border-left-color: var(--color-safe); }

.sinal-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.sinal-tag {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: var(--font-weight-bold); color: var(--text-lowest);
}
.sinal--atencao      .sinal-tag { color: var(--color-care); }
.sinal--recomendacao .sinal-tag { color: var(--color-safe); }

.sinal-colab {
  font-size: var(--font-size-xs); color: var(--text-low);
}
.sinal-text {
  margin: 0; color: var(--text-medium);
  font-size: var(--font-size-sm); line-height: 1.45;
}

/* ═══ Scatter ═══ */
.scatter-legend {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.legend-quadrant {
  font-size: var(--font-size-xs); padding: 3px 8px;
  border-radius: var(--radius-sm);
}
.q-top            { background: rgba(var(--color-safe-rgb),   0.15); color: var(--color-safe); }
.q-ocioso         { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.q-sobrecarregado { background: rgba(var(--color-care-rgb),   0.15); color: var(--color-care); }
.q-critico        { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); }

.scatter-canvas-wrap {
  position: relative; height: 340px;
}

@media (max-width: 1100px) {
  .time-strip { grid-template-columns: repeat(2, 1fr); }
  .accounts-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .time-strip { grid-template-columns: 1fr; }
  .ranking-table th, .ranking-table td { padding: 8px; }
}
</style>
