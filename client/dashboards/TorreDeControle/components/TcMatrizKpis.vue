<script setup>
import { computed, nextTick, onMounted, watch } from 'vue'

const props = defineProps({
  clientes: { type: Array, default: () => [] },
  fases: { type: Array, default: () => [] }
})

// Extrai todos os scores das analises dos clientes (uma entry por fase auditada)
const todosScores = computed(() => {
  const out = []
  for (const c of props.clientes) {
    const fases = c.fases || {}
    for (const key of Object.keys(fases)) {
      const f = fases[key]
      const s = f?.score
      if (s != null && isFinite(Number(s))) out.push(Number(s))
    }
  }
  return out
})

const totalAnalises = computed(() => todosScores.value.length)
const mediaGeral = computed(() => {
  if (!totalAnalises.value) return null
  const soma = todosScores.value.reduce((a, b) => a + b, 0)
  return soma / totalAnalises.value
})

// Escala: >= 9 verde (bom), 7-8 amarelo (mediano), <= 6 vermelho (ruim) — alinhada com status_cor do backend
const countBom = computed(() => todosScores.value.filter(s => s >= 9).length)
const countMediano = computed(() => todosScores.value.filter(s => s >= 7 && s < 9).length)
const countRuim = computed(() => todosScores.value.filter(s => s < 7).length)

const pctBom = computed(() => totalAnalises.value ? (countBom.value / totalAnalises.value) * 100 : 0)
const pctMediano = computed(() => totalAnalises.value ? (countMediano.value / totalAnalises.value) * 100 : 0)
const pctRuim = computed(() => totalAnalises.value ? (countRuim.value / totalAnalises.value) * 100 : 0)

// Clientes com analises — para saber quantos dos clientes da matriz ja tem pelo menos 1 score
const clientesComAnalise = computed(() => {
  let n = 0
  for (const c of props.clientes) {
    const fases = c.fases || {}
    const tem = Object.values(fases).some(f => f?.score != null)
    if (tem) n += 1
  }
  return n
})

// Cobertura: % de clientes da matriz que ja tiveram pelo menos 1 fase auditada
const coberturaPct = computed(() => {
  if (!props.clientes.length) return 0
  return (clientesComAnalise.value / props.clientes.length) * 100
})

function mediaClass(v) {
  if (v == null) return 'neutral'
  if (v >= 9) return 'safe'
  if (v >= 7) return 'care'
  return 'danger'
}

function fmt1(v) {
  return v == null ? '—' : Number(v).toFixed(1)
}

function fmtPct(v) {
  return Number(v).toFixed(0) + '%'
}

function refreshIcons() {
  if (typeof window !== 'undefined' && window.lucide?.createIcons) {
    nextTick(() => window.lucide.createIcons())
  }
}

onMounted(refreshIcons)
watch(() => [props.clientes, props.fases], refreshIcons, { deep: true })
</script>

<template>
  <div class="mk-wrap" v-if="clientes.length">
    <div class="mk-kpi mk-kpi--principal" :class="`mk-principal--${mediaClass(mediaGeral)}`">
      <div class="mk-kpi-head">
        <i data-lucide="activity" class="mk-kpi-icon" :class="`mk-icon--${mediaClass(mediaGeral)}`"></i>
        <span class="mk-kpi-label">Nota Média Geral</span>
      </div>
      <div class="mk-kpi-value-row">
        <span class="mk-kpi-value" :class="mediaClass(mediaGeral)">{{ fmt1(mediaGeral) }}</span>
        <span class="mk-kpi-sfx">/ 10</span>
      </div>
      <div class="mk-kpi-foot">
        <span class="mk-kpi-hint">{{ totalAnalises }} análise{{ totalAnalises === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <div class="mk-kpi">
      <div class="mk-kpi-head">
        <i data-lucide="check-circle-2" class="mk-kpi-icon mk-icon--safe"></i>
        <span class="mk-kpi-label">Bom (9–10)</span>
      </div>
      <div class="mk-kpi-value-row">
        <span class="mk-kpi-value safe">{{ countBom }}</span>
        <span class="mk-kpi-sfx">{{ fmtPct(pctBom) }}</span>
      </div>
      <div class="mk-kpi-bar">
        <span class="mk-bar-fill mk-bar--safe" :style="{ width: pctBom + '%' }"></span>
      </div>
    </div>

    <div class="mk-kpi">
      <div class="mk-kpi-head">
        <i data-lucide="alert-triangle" class="mk-kpi-icon mk-icon--care"></i>
        <span class="mk-kpi-label">Mediano (7–8)</span>
      </div>
      <div class="mk-kpi-value-row">
        <span class="mk-kpi-value care">{{ countMediano }}</span>
        <span class="mk-kpi-sfx">{{ fmtPct(pctMediano) }}</span>
      </div>
      <div class="mk-kpi-bar">
        <span class="mk-bar-fill mk-bar--care" :style="{ width: pctMediano + '%' }"></span>
      </div>
    </div>

    <div class="mk-kpi">
      <div class="mk-kpi-head">
        <i data-lucide="alert-octagon" class="mk-kpi-icon mk-icon--danger"></i>
        <span class="mk-kpi-label">Ruim (≤ 6)</span>
      </div>
      <div class="mk-kpi-value-row">
        <span class="mk-kpi-value danger">{{ countRuim }}</span>
        <span class="mk-kpi-sfx">{{ fmtPct(pctRuim) }}</span>
      </div>
      <div class="mk-kpi-bar">
        <span class="mk-bar-fill mk-bar--danger" :style="{ width: pctRuim + '%' }"></span>
      </div>
    </div>

    <div class="mk-kpi">
      <div class="mk-kpi-head">
        <i data-lucide="users" class="mk-kpi-icon"></i>
        <span class="mk-kpi-label">Cobertura</span>
      </div>
      <div class="mk-kpi-value-row">
        <span class="mk-kpi-value neutral">{{ clientesComAnalise }}</span>
        <span class="mk-kpi-sfx">/ {{ clientes.length }}</span>
      </div>
      <div class="mk-kpi-foot">
        <span class="mk-kpi-hint">{{ fmtPct(coberturaPct) }} dos leads auditados</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mk-wrap {
  display: grid;
  grid-template-columns: 1.3fr repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

@media (max-width: 1100px) {
  .mk-wrap { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 720px) {
  .mk-wrap { grid-template-columns: repeat(2, 1fr); }
}

.mk-kpi {
  background: var(--bg-card);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 96px;
  transition: border-color var(--transition-fast), transform var(--transition-fast);
}
.mk-kpi:hover { border-color: var(--border-input); }

/* Card principal: fundo e borda refletem a cor da nota, conforme a legenda da matriz. */
.mk-kpi--principal {
  background: var(--bg-card);
  border-color: var(--border-row);
}
.mk-principal--safe {
  background: linear-gradient(135deg, rgba(var(--color-safe-rgb), 0.12) 0%, var(--bg-card) 60%);
  border-color: rgba(var(--color-safe-rgb), 0.35);
}
.mk-principal--care {
  background: linear-gradient(135deg, rgba(var(--color-care-rgb), 0.12) 0%, var(--bg-card) 60%);
  border-color: rgba(var(--color-care-rgb), 0.35);
}
.mk-principal--danger {
  background: linear-gradient(135deg, rgba(var(--color-danger-rgb), 0.12) 0%, var(--bg-card) 60%);
  border-color: rgba(var(--color-danger-rgb), 0.35);
}
.mk-principal--neutral {
  background: var(--bg-card);
  border-color: var(--border-row);
}

.mk-kpi-head {
  display: flex; align-items: center; gap: 6px;
  color: var(--text-lowest);
}
.mk-kpi-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-low);
  font-weight: var(--font-weight-semibold);
}
.mk-kpi-icon { width: 14px; height: 14px; color: var(--text-lowest); }
.mk-icon--safe   { color: var(--color-safe); }
.mk-icon--care   { color: var(--color-care); }
.mk-icon--danger { color: var(--color-danger); }

.mk-kpi-value-row {
  display: flex; align-items: baseline; gap: 6px;
}
.mk-kpi-value {
  font-size: 30px; line-height: 1;
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
}
.mk-kpi-value.safe    { color: var(--color-safe); }
.mk-kpi-value.care    { color: var(--color-care); }
.mk-kpi-value.danger  { color: var(--color-danger); }
.mk-kpi-value.neutral { color: var(--text-high); }

.mk-kpi-sfx {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
  font-weight: var(--font-weight-medium);
}

.mk-kpi-foot { display: flex; align-items: center; gap: 6px; }
.mk-kpi-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.mk-kpi-bar {
  position: relative;
  height: 4px;
  background: var(--bg-inner);
  border-radius: 999px;
  overflow: hidden;
  margin-top: auto;
}
.mk-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width var(--transition-fast);
}
.mk-bar--safe   { background: var(--color-safe); }
.mk-bar--care   { background: var(--color-care); }
.mk-bar--danger { background: var(--color-danger); }
</style>
