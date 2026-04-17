<script setup>
import { computed, nextTick, onMounted, watch } from 'vue'

const props = defineProps({
  consolidado: { type: Object, default: () => ({}) },
  oportunidades: { type: Array, default: () => [] }
})

const avanco = computed(() => props.consolidado?.avanco || null)
const qt = computed(() => props.consolidado?.qualidade_time || null)

const scoreFinal = computed(() => {
  const v = avanco.value?.score_final
  return v != null ? Number(v).toFixed(1) : null
})
const delta = computed(() => {
  if (!avanco.value) return null
  const a = Number(avanco.value.score_inicial ?? 0)
  const b = Number(avanco.value.score_final ?? 0)
  const d = b - a
  if (!isFinite(d)) return null
  return Number(d.toFixed(1))
})
const tendencia = computed(() => avanco.value?.tendencia || 'estavel')
const tendenciaIcon = computed(() => ({
  ascendente: 'trending-up',
  descendente: 'trending-down',
  estavel: 'minus'
}[tendencia.value] || 'minus'))
const tendenciaClass = computed(() => `sc-card--${tendencia.value}`)

const qtScore = computed(() => qt.value?.score != null ? Number(qt.value.score).toFixed(1) : null)
const qtSquad = computed(() => qt.value?.squad_nome || '')
const qtPontosFortesN = computed(() => (qt.value?.pontos_fortes || []).length)

const valorTotal = computed(() =>
  props.oportunidades.reduce((a, o) => a + (Number(o.valor_estimado) || 0), 0)
)
const valorTotalFmt = computed(() =>
  valorTotal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
)
const temAltaAderencia = computed(() =>
  props.oportunidades.some(o => Number(o.probabilidade_fechamento) >= 70)
)

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => [avanco.value, qt.value, props.oportunidades.length], () => {
  nextTick(() => window.lucide && window.lucide.createIcons())
})
</script>

<template>
  <div class="sc-grid">
    <div class="sc-card" :class="tendenciaClass">
      <div class="sc-head">
        <span class="sc-label">Avanco</span>
        <i :data-lucide="tendenciaIcon" class="sc-icon"></i>
      </div>
      <div class="sc-body">
        <span class="sc-value">{{ scoreFinal ?? '—' }}</span>
        <span class="sc-value-sfx">/10</span>
      </div>
      <div class="sc-foot">
        <span v-if="delta != null" class="sc-delta" :class="{ 'sc-delta--pos': delta > 0, 'sc-delta--neg': delta < 0 }">
          {{ delta > 0 ? '+' : '' }}{{ delta }} desde Fase 1
        </span>
        <span v-else class="sc-foot-muted">sem fases auditadas</span>
      </div>
    </div>

    <div class="sc-card">
      <div class="sc-head">
        <span class="sc-label">Qualidade do Time</span>
        <i data-lucide="users" class="sc-icon"></i>
      </div>
      <div class="sc-body">
        <span class="sc-value">{{ qtScore ?? '—' }}</span>
        <span class="sc-value-sfx">/10</span>
      </div>
      <div class="sc-foot">
        <span v-if="qtSquad" class="sc-foot-muted">Squad {{ qtSquad }}</span>
        <span v-if="qtPontosFortesN > 0" class="sc-chip sc-chip--safe">
          +{{ qtPontosFortesN }} pontos fortes
        </span>
      </div>
    </div>

    <div class="sc-card">
      <div class="sc-head">
        <span class="sc-label">Oportunidades</span>
        <i data-lucide="target" class="sc-icon"></i>
      </div>
      <div class="sc-body">
        <span class="sc-value">{{ oportunidades.length }}</span>
        <span class="sc-value-sfx">{{ oportunidades.length === 1 ? 'produto' : 'produtos' }}</span>
      </div>
      <div class="sc-foot">
        <span class="sc-foot-muted">{{ valorTotalFmt }}</span>
        <span v-if="temAltaAderencia" class="sc-chip sc-chip--heat">
          Alta aderencia
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.sc-card {
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, rgba(255, 255, 255, 0.06));
  border-radius: 8px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 124px;
  transition: transform 160ms, border-color 160ms;
}
.sc-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

/* Tinge levemente o card de Avanco conforme tendencia */
.sc-card--ascendente {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.06), transparent 60%);
  border-color: rgba(34, 197, 94, 0.25);
}
.sc-card--descendente {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), transparent 60%);
  border-color: rgba(239, 68, 68, 0.25);
}

.sc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-label {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.sc-icon {
  width: 16px;
  height: 16px;
  color: #666;
}
.sc-card--ascendente .sc-icon { color: #22c55e; }
.sc-card--descendente .sc-icon { color: #ef4444; }

.sc-body {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.sc-value {
  font-size: 34px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  letter-spacing: -0.5px;
}
.sc-value-sfx {
  font-size: 13px;
  color: #666;
  font-weight: 400;
}

.sc-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  min-height: 20px;
}
.sc-foot-muted {
  font-size: 12px;
  color: #888;
}
.sc-delta {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}
.sc-delta--pos { color: #22c55e; }
.sc-delta--neg { color: #ef4444; }

.sc-chip {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.sc-chip--safe {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.sc-chip--heat {
  background: rgba(255, 0, 0, 0.15);
  color: #ff4444;
}

@media (max-width: 900px) {
  .sc-grid { grid-template-columns: 1fr; }
}
</style>
