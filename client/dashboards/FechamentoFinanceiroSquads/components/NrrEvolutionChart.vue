<template>
  <div class="nrr-chart-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  labels: { type: Array, required: true },
  datasets: {
    type: Array,
    required: true,
    validator: v => v.every(d => d.label && Array.isArray(d.data) && d.color)
  }
})

const CHART_COLORS = {
  grid: 'rgba(255,255,255,0.03)',
  tick: '#666',
  refLine: 'rgba(255,255,255,0.15)',
  tooltipBg: '#1a1a1a',
  tooltipBorder: '#333'
}

const canvasRef = ref(null)
let chartInstance = null

function renderChart() {
  if (!canvasRef.value || !window.Chart) return
  if (chartInstance) chartInstance.destroy()

  const ctx = canvasRef.value.getContext('2d')
  chartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [
        {
          label: 'Meta 100%',
          data: props.labels.map(() => 100),
          borderColor: CHART_COLORS.refLine,
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: 999
        },
        ...props.datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + '20',
          borderWidth: ds.highlight ? 3 : 2,
          pointRadius: ds.highlight ? 4 : 3,
          pointBackgroundColor: ds.color,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false
        }))
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#999',
            font: { family: "'Ubuntu', sans-serif", size: 11 },
            boxWidth: 12,
            padding: 12,
            filter: item => item.text !== 'Meta 100%'
          }
        },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltipBg,
          titleColor: '#fff',
          bodyColor: '#ccc',
          borderColor: CHART_COLORS.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Ubuntu', sans-serif", size: 12 },
          bodyFont: { family: "'Ubuntu', sans-serif", size: 11 },
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Meta 100%') return null
              const val = ctx.parsed.y
              if (val === null || val === undefined) return null
              return ` ${ctx.dataset.label}: ${val.toFixed(1).replace('.', ',')}%`
            }
          }
        },
        datalabels: { display: false }
      },
      scales: {
        x: {
          grid: { color: CHART_COLORS.grid },
          ticks: {
            color: CHART_COLORS.tick,
            font: { family: "'Ubuntu', sans-serif", size: 11 },
            maxRotation: 45
          }
        },
        y: {
          grid: { color: CHART_COLORS.grid },
          ticks: {
            color: CHART_COLORS.tick,
            font: { family: "'Ubuntu', sans-serif", size: 11 },
            callback: v => v + '%'
          }
        }
      }
    }
  })
}

watch(() => [props.labels, props.datasets], () => {
  nextTick(renderChart)
}, { deep: true })

onMounted(() => nextTick(renderChart))
onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy() })
</script>

<style scoped>
.nrr-chart-container {
  position: relative;
  height: 280px;
}
</style>
