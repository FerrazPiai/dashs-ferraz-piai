<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

const props = defineProps({
  distribuicao: { type: Object, required: true }
})

const tierCanvas = ref(null)
const canalCanvas = ref(null)
const flagCanvas = ref(null)
const urgenciaCanvas = ref(null)

const charts = {}
const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#84cc16', '#f43f5e', '#06b6d4', '#6b7280']
const FLAG_COLORS = { safe: '#22c55e', care: '#f59e0b', risk: '#ef4444', danger: '#ef4444' }

function pickFlagColors(labels) {
  return labels.map((l, i) => FLAG_COLORS[String(l).toLowerCase()] || COLORS[i % COLORS.length])
}

function render(key, canvas, dados, { flagMode = false } = {}) {
  if (charts[key]) { charts[key].destroy(); charts[key] = null }
  if (!canvas || !dados?.length || !window.Chart) return
  const labels = dados.map(d => d.label)
  const values = dados.map(d => Number(d.value) || 0)
  const colors = flagMode ? pickFlagColors(labels) : COLORS
  charts[key] = new window.Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#ccc', font: { size: 11, family: 'Ubuntu, Segoe UI, sans-serif' } }
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: '#333',
          borderWidth: 1
        }
      }
    }
  })
}

async function renderAll() {
  await nextTick()
  render('tier', tierCanvas.value, props.distribuicao?.tier)
  render('canal', canalCanvas.value, props.distribuicao?.canal)
  render('flag', flagCanvas.value, props.distribuicao?.flag, { flagMode: true })
  render('urgencia', urgenciaCanvas.value, props.distribuicao?.urgencia)
}

onMounted(renderAll)
watch(() => props.distribuicao, renderAll, { deep: true })
onBeforeUnmount(() => {
  for (const c of Object.values(charts)) c?.destroy()
})
</script>

<template>
  <div class="tab-distribuicao">
    <div class="donut-grid">
      <div class="donut-card">
        <h3>Tier</h3>
        <div class="canvas-wrap"><canvas ref="tierCanvas"></canvas></div>
      </div>
      <div class="donut-card">
        <h3>Canal de Origem</h3>
        <div class="canvas-wrap"><canvas ref="canalCanvas"></canvas></div>
      </div>
      <div class="donut-card">
        <h3>Flag (Risco)</h3>
        <div class="canvas-wrap"><canvas ref="flagCanvas"></canvas></div>
      </div>
      <div class="donut-card">
        <h3>Urgencia</h3>
        <div class="canvas-wrap"><canvas ref="urgenciaCanvas"></canvas></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-distribuicao { padding: var(--spacing-md) 0; }
.donut-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
}
.donut-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-md); padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-sm);
}
.donut-card h3 {
  color: var(--text-high); margin: 0;
  font-size: var(--font-size-base); font-weight: 500;
}
.canvas-wrap { position: relative; height: 260px; }
@media (max-width: 768px) {
  .donut-grid { grid-template-columns: 1fr; }
}
</style>
