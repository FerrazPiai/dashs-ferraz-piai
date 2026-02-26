<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  }
})

const canvasRef = ref(null)
let chartInstance = null

const labels = computed(() => {
  return props.data.map(item => item.safra)
})

const createChart = () => {
  if (!canvasRef.value || !window.Chart) return

  // Destroy previous instance
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const ctx = canvasRef.value.getContext('2d')

  // Preparar dados
  const conversionRates = props.data.map(item => (item.convertion_rate * 100).toFixed(1))
  const totalLeads = props.data.map(item => item.count_leads)
  const monetizedLeads = props.data.map(item => item.count_leads_monetizados)
  const nonMonetizedLeads = props.data.map((item, i) => totalLeads[i] - monetizedLeads[i])

  // Plugins
  const plugins = []
  if (window.ChartDataLabels) {
    plugins.push(window.ChartDataLabels)
  }

  chartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.value,
      datasets: [
        // Parte inferior da barra: Clientes Monetizados (verde)
        {
          label: 'Clientes Monetizados',
          data: monetizedLeads,
          backgroundColor: '#22c55e',
          borderRadius: { bottomLeft: 4, bottomRight: 4 },
          datalabels: {
            color: '#ffffff',
            font: {
              size: 12,
              weight: 'bold'
            },
            anchor: 'end',
            align: 'top',
            offset: 4,
            formatter: (value, context) => {
              if (value === 0) return ''
              const rate = conversionRates[context.dataIndex]
              return `${value} / ${rate}%`
            }
          }
        },
        // Parte superior da barra: Restante (cinza claro)
        {
          label: 'Total de Clientes',
          data: nonMonetizedLeads,
          backgroundColor: 'rgba(102, 102, 102, 0.3)',
          borderRadius: { topLeft: 4, topRight: 4 },
          datalabels: {
            color: '#cccccc',
            font: {
              size: 11,
              weight: 'normal'
            },
            anchor: 'end',
            align: 'top',
            offset: 4,
            formatter: (value, context) => {
              const total = totalLeads[context.dataIndex]
              return total // Mostrar total acima
            }
          }
        }
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
          position: 'top',
          labels: {
            color: '#cccccc',
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#ffffff',
          bodyColor: '#cccccc',
          borderColor: '#333333',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => 'Safra ' + items[0].label,
            afterBody: (items) => {
              const index = items[0].dataIndex
              const total = totalLeads[index]
              const monet = monetizedLeads[index]
              const rate = conversionRates[index]
              return `\nTotal de Clientes: ${total}\nClientes Monetizados: ${monet}\nTaxa de Conversão: ${rate}%`
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawBorder: false
          },
          ticks: {
            color: '#666666',
            font: { size: 11 }
          }
        },
        y: {
          stacked: true,
          grace: '15%',
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
            drawBorder: false
          },
          ticks: {
            color: '#666666',
            font: { size: 11 }
          },
          title: {
            display: true,
            text: 'Quantidade de Clientes',
            color: '#cccccc',
            font: { size: 12, weight: 'bold' }
          }
        }
      }
    },
    plugins
  })
}

onMounted(() => {
  createChart()
})

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

watch(
  () => props.data,
  () => {
    createChart()
  },
  { deep: true }
)
</script>

<style scoped>
canvas {
  max-height: 400px;
}
</style>
