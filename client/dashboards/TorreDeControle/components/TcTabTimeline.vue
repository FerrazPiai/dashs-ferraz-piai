<script setup>
import { computed, onMounted, nextTick, watch } from 'vue'

const props = defineProps({
  clientes: { type: Array, required: true }
})

const DIAS_POR_FASE = 9
const DIAS_TOTAIS = 45
const MS_DAY = 24 * 60 * 60 * 1000

const now = new Date()

function diffDays(start, end) {
  return Math.floor((end - start) / MS_DAY)
}

// ───────────────────────────────
// Classifica cada cliente (no-prazo / atencao / atrasado / concluido / sem-inicio)
// ───────────────────────────────
const clientesComStatus = computed(() => {
  return (props.clientes || []).map(c => {
    const inicioIso = c.inicio_projeto
    const slug = c.fase_atual_slug
    const ordem = Number(c.fase_atual_ordem) || 0

    if (slug === 'projeto-concluido' || ordem === 6) {
      return {
        ...c,
        status: 'concluido',
        inicio: inicioIso ? new Date(inicioIso) : null,
        deadline: inicioIso ? new Date(new Date(inicioIso).getTime() + DIAS_TOTAIS * MS_DAY) : null
      }
    }

    if (!inicioIso) {
      return { ...c, status: 'sem-inicio', inicio: null, deadline: null }
    }

    const inicio = new Date(inicioIso)
    const deadline = new Date(inicio.getTime() + DIAS_TOTAIS * MS_DAY)
    const daysElapsed = diffDays(inicio, now)

    let expectedPhase
    if (daysElapsed <= 0) expectedPhase = 1
    else expectedPhase = Math.min(5, Math.ceil(daysElapsed / DIAS_POR_FASE))

    const gap = expectedPhase - ordem

    let status
    if (daysElapsed > DIAS_TOTAIS) status = 'atrasado'
    else if (gap <= 0) status = 'no-prazo'
    else if (gap === 1) status = 'atencao'
    else status = 'atrasado'

    return { ...c, status, inicio, deadline, daysElapsed, expectedPhase }
  })
})

// ───────────────────────────────
// KPIs
// ───────────────────────────────
const kpis = computed(() => {
  const list = clientesComStatus.value
  return {
    noPrazo:    list.filter(c => c.status === 'no-prazo').length,
    atencao:    list.filter(c => c.status === 'atencao').length,
    atrasados:  list.filter(c => c.status === 'atrasado').length,
    concluidos: list.filter(c => c.status === 'concluido').length,
    semInicio:  list.filter(c => c.status === 'sem-inicio').length
  }
})

// ───────────────────────────────
// Ordenacao: atrasado > atencao > no-prazo > concluido > sem-inicio
// ───────────────────────────────
const ORDEM_STATUS = { 'atrasado': 0, 'atencao': 1, 'no-prazo': 2, 'concluido': 3, 'sem-inicio': 4 }

const timelineClients = computed(() => {
  return [...clientesComStatus.value]
    .filter(c => c.inicio) // sem-inicio vai pra lista separada
    .sort((a, b) => {
      const d = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]
      if (d !== 0) return d
      return a.inicio - b.inicio
    })
})

const clientesSemInicio = computed(() =>
  clientesComStatus.value.filter(c => c.status === 'sem-inicio')
)

// ───────────────────────────────
// Viewport global da timeline (menor inicio -> maior deadline)
// ───────────────────────────────
const viewport = computed(() => {
  const list = timelineClients.value
  if (!list.length) return null
  const minInicio = Math.min(...list.map(c => c.inicio.getTime()))
  const maxDeadline = Math.max(...list.map(c => c.deadline.getTime()))
  const start = new Date(minInicio - 7 * MS_DAY)
  const end = new Date(maxDeadline + 7 * MS_DAY)
  return { start, end, totalMs: end.getTime() - start.getTime() }
})

// ───────────────────────────────
// Ticks semanais (segundas-feiras) pra marcar o eixo
// ───────────────────────────────
const ticks = computed(() => {
  if (!viewport.value) return []
  const { start, end, totalMs } = viewport.value
  const out = []
  const d = new Date(start)
  d.setHours(0, 0, 0, 0)
  // avanca pra proxima segunda-feira
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  while (d <= end) {
    const pct = ((d.getTime() - start.getTime()) / totalMs) * 100
    out.push({ date: new Date(d), pct })
    d.setDate(d.getDate() + 7)
  }
  return out
})

const todayPct = computed(() => {
  if (!viewport.value) return null
  const { start, totalMs } = viewport.value
  const pct = ((now.getTime() - start.getTime()) / totalMs) * 100
  if (pct < 0 || pct > 100) return null
  return pct
})

function barStyle(c) {
  if (!viewport.value) return {}
  const { start, totalMs } = viewport.value
  const left = ((c.inicio.getTime() - start.getTime()) / totalMs) * 100
  const width = ((c.deadline.getTime() - c.inicio.getTime()) / totalMs) * 100
  return { left: left + '%', width: width + '%' }
}

// Marcadores de troca de fase: 4 pontos internos (apos fases 1,2,3,4)
const faseMarkers = [1, 2, 3, 4].map(n => ({ pct: (n / 5) * 100 }))

function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtDateFull(d) {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusLabel(s) {
  switch (s) {
    case 'no-prazo':   return 'No prazo'
    case 'atencao':    return 'Atencao'
    case 'atrasado':   return 'Atrasado'
    case 'concluido':  return 'Concluido'
    case 'sem-inicio': return 'Sem inicio'
    default: return ''
  }
}

onMounted(async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

watch(() => props.clientes, async () => {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}, { deep: true })
</script>

<template>
  <div class="tc-timeline">
    <!-- KPI cards -->
    <div class="kpi-strip">
      <div class="kpi kpi--safe">
        <span class="kpi-label">No Prazo</span>
        <span class="kpi-value">{{ kpis.noPrazo }}</span>
      </div>
      <div class="kpi kpi--care">
        <span class="kpi-label">Atencao</span>
        <span class="kpi-value">{{ kpis.atencao }}</span>
      </div>
      <div class="kpi kpi--danger">
        <span class="kpi-label">Atrasados</span>
        <span class="kpi-value">{{ kpis.atrasados }}</span>
      </div>
      <div class="kpi kpi--neutral">
        <span class="kpi-label">Concluidos</span>
        <span class="kpi-value">{{ kpis.concluidos }}</span>
      </div>
      <div class="kpi kpi--muted" v-if="kpis.semInicio">
        <span class="kpi-label">Sem inicio</span>
        <span class="kpi-value">{{ kpis.semInicio }}</span>
      </div>
    </div>

    <!-- Timeline principal -->
    <div v-if="!timelineClients.length" class="empty-block">
      <i data-lucide="calendar-x"></i>
      <p>Nenhum projeto com data de inicio preenchida.</p>
      <small>Preencha o campo "Inicio do Projeto" no Kommo para ver o cronograma.</small>
    </div>

    <div v-else class="timeline-card">
      <div class="timeline-head">
        <div>
          <h3 class="card-title">Cronograma de projetos</h3>
          <p class="card-subtitle">5 fases x 9 dias = 45 dias corridos por projeto</p>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="legend-dot dot--safe"></span>No prazo</span>
          <span class="legend-item"><span class="legend-dot dot--care"></span>Atencao</span>
          <span class="legend-item"><span class="legend-dot dot--danger"></span>Atrasado</span>
          <span class="legend-item"><span class="legend-dot dot--neutral"></span>Concluido</span>
        </div>
      </div>

      <div class="timeline-grid">
        <!-- Colunas: [cliente/account] [timeline] -->
        <div class="timeline-header">
          <div class="col-client">PROJETO</div>
          <div class="col-bar">
            <div class="axis">
              <span
                v-for="(t, i) in ticks" :key="i"
                class="axis-tick"
                :style="{ left: t.pct + '%' }"
              >{{ fmtDate(t.date) }}</span>
            </div>
          </div>
        </div>

        <div
          v-for="c in timelineClients"
          :key="c.id"
          class="timeline-row"
        >
          <div class="col-client">
            <div class="client-info">
              <strong class="client-name">{{ c.nome }}</strong>
              <span class="client-meta">
                <span class="account-tag">{{ c.account || 'Sem account' }}</span>
                <span class="status-tag" :class="`tag--${c.status}`">{{ statusLabel(c.status) }}</span>
              </span>
            </div>
          </div>
          <div class="col-bar">
            <!-- Gridlines das semanas -->
            <div class="gridlines">
              <div
                v-for="(t, i) in ticks" :key="i"
                class="gridline"
                :style="{ left: t.pct + '%' }"
              ></div>
            </div>

            <!-- Hoje -->
            <div
              v-if="todayPct != null"
              class="today-line"
              :style="{ left: todayPct + '%' }"
              title="Hoje"
            ></div>

            <!-- Barra do projeto -->
            <div
              class="bar"
              :class="`bar--${c.status}`"
              :style="barStyle(c)"
              :title="`${c.nome} — ${fmtDateFull(c.inicio)} a ${fmtDateFull(c.deadline)}`"
            >
              <div class="bar-label">
                <span>{{ fmtDate(c.inicio) }}</span>
                <span class="bar-sep">—</span>
                <span>{{ fmtDate(c.deadline) }}</span>
              </div>
              <div
                v-for="(m, i) in faseMarkers" :key="i"
                class="phase-marker"
                :style="{ left: m.pct + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bloco leve pra clientes sem inicio preenchido -->
    <div v-if="clientesSemInicio.length" class="sem-inicio-block">
      <div class="sem-inicio-head">
        <span class="section-label">Sem data de inicio</span>
        <span class="section-hint">{{ clientesSemInicio.length }} projeto(s) sem "Inicio do Projeto" no Kommo</span>
      </div>
      <ul class="sem-inicio-list">
        <li v-for="c in clientesSemInicio" :key="c.id">
          <strong>{{ c.nome }}</strong>
          <span class="muted">{{ c.account || '—' }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.tc-timeline {
  display: flex; flex-direction: column; gap: var(--spacing-lg);
  padding-top: var(--spacing-md);
}

/* ═══ KPIs ═══ */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
}
.kpi {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 4px;
}
.kpi::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0;
  height: 2px;
}
.kpi--safe::before    { background: var(--color-safe); }
.kpi--care::before    { background: var(--color-care); }
.kpi--danger::before  { background: var(--color-danger); }
.kpi--neutral::before { background: var(--chart-color-neutral); }
.kpi--muted::before   { background: var(--border-input); }
.kpi-label {
  font-size: var(--font-size-xs); color: var(--text-lowest);
  text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: var(--font-weight-semibold);
}
.kpi-value {
  font-size: 28px; color: var(--text-high);
  font-weight: var(--font-weight-semibold); line-height: 1.1;
}
.kpi--safe   .kpi-value { color: var(--color-safe); }
.kpi--care   .kpi-value { color: var(--color-care); }
.kpi--danger .kpi-value { color: var(--color-danger); }

/* ═══ Card da timeline ═══ */
.timeline-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-md);
}
.timeline-head {
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
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.legend-item {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--font-size-xs); color: var(--text-low);
}
.legend-dot {
  width: 10px; height: 10px; border-radius: 2px;
}
.dot--safe    { background: var(--color-safe); }
.dot--care    { background: var(--color-care); }
.dot--danger  { background: var(--color-danger); }
.dot--neutral { background: var(--chart-color-neutral); }

/* ═══ Grid ═══ */
.timeline-grid {
  display: flex; flex-direction: column; gap: 0;
  border-radius: var(--radius-sm); overflow: hidden;
}
.timeline-header,
.timeline-row {
  display: grid;
  grid-template-columns: 260px 1fr;
  align-items: stretch;
}
.timeline-header {
  border-bottom: 1px solid var(--border-row);
  background: var(--bg-inner);
}
.timeline-header .col-client {
  font-size: var(--font-size-xs); color: var(--text-lowest);
  text-transform: uppercase; letter-spacing: 0.5px;
  font-weight: var(--font-weight-semibold);
  padding: 10px 14px;
}
.timeline-header .col-bar {
  position: relative; height: 36px;
}
.axis {
  position: absolute; inset: 0;
}
.axis-tick {
  position: absolute; top: 10px;
  transform: translateX(-50%);
  font-size: 10px; color: var(--text-lowest);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ═══ Linhas de projeto ═══ */
.timeline-row {
  border-bottom: 1px solid var(--border-row);
  transition: background var(--transition-fast);
}
.timeline-row:last-child { border-bottom: none; }
.timeline-row:hover { background: rgba(255,255,255,0.02); }

.col-client {
  padding: 12px 14px;
  border-right: 1px solid var(--border-row);
  display: flex; align-items: center;
}
.client-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.client-name {
  color: var(--text-high); font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.client-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.account-tag {
  font-size: 10px; color: var(--text-low);
  padding: 2px 6px;
  background: var(--bg-inner);
  border-radius: var(--radius-sm);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 140px;
}

.status-tag {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.tag--no-prazo   { background: rgba(var(--color-safe-rgb),   0.15); color: var(--color-safe); }
.tag--atencao    { background: rgba(var(--color-care-rgb),   0.15); color: var(--color-care); }
.tag--atrasado   { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); }
.tag--concluido  { background: var(--bg-inner); color: var(--text-low); border: 1px solid var(--border-card); }
.tag--sem-inicio { background: var(--bg-inner); color: var(--text-lowest); border: 1px dashed var(--border-card); }

/* ═══ Area da barra ═══ */
.col-bar {
  position: relative;
  height: 56px;
  overflow: hidden;
}
.gridlines { position: absolute; inset: 0; pointer-events: none; }
.gridline {
  position: absolute; top: 0; bottom: 0; width: 1px;
  background: rgba(255,255,255,0.03);
}
.today-line {
  position: absolute; top: 0; bottom: 0; width: 2px;
  background: var(--color-primary);
  z-index: 2;
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.5);
}

.bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 28px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  padding: 0 10px;
  z-index: 1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  min-width: 40px;
}
.bar--no-prazo  { background: var(--color-safe);   color: #001a00; }
.bar--atencao   { background: var(--color-care);   color: #1a1300; }
.bar--atrasado  { background: var(--color-danger); color: #fff; }
.bar--concluido {
  background: var(--bg-inner);
  color: var(--text-low);
  border: 1px dashed var(--border-card);
  box-shadow: none;
}

.bar-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.bar-sep { opacity: 0.6; }
.bar--concluido .bar-sep { opacity: 0.4; }

.phase-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(0,0,0,0.3);
}
.bar--atrasado .phase-marker { background: rgba(255,255,255,0.35); }
.bar--concluido .phase-marker { background: var(--border-card); }

/* ═══ Sem inicio ═══ */
.sem-inicio-block {
  background: var(--bg-card);
  border: 1px dashed var(--border-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: 8px;
}
.sem-inicio-head { display: flex; align-items: baseline; gap: var(--spacing-sm); }
.section-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.section-hint { font-size: var(--font-size-xs); color: var(--text-lowest); }
.sem-inicio-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.sem-inicio-list li {
  display: flex; gap: 8px;
  font-size: var(--font-size-sm); color: var(--text-medium);
}
.sem-inicio-list .muted { color: var(--text-lowest); }

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
.empty-block i { width: 32px; height: 32px; color: var(--border-input); }
.empty-block p { color: var(--text-medium); font-size: var(--font-size-md); margin: 0; }
.empty-block small { color: var(--text-lowest); }

/* ═══ Responsivo ═══ */
@media (max-width: 900px) {
  .timeline-header, .timeline-row { grid-template-columns: 180px 1fr; }
  .axis-tick { font-size: 9px; }
}
</style>
