<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  labels: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: 'Dataset'
  },
  color: {
    type: String,
    default: '#ff0000'
  },
  gradient: {
    type: Boolean,
    default: false
  },
  options: {
    type: Object,
    default: () => ({})
  },
  datalabels: {
    type: Boolean,
    default: false
  }
})

const canvasRef = ref(null)
let chartInstance = null

const createChart = () => {
  if (!canvasRef.value || !window.Chart) {
    console.error('Canvas or Chart.js not available')
    return
  }

  // Destroy previous instance
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const ctx = canvasRef.value.getContext('2d')

  // Create gradient if enabled
  let backgroundColor = props.color
  if (props.gradient) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400)
    gradient.addColorStop(0, `${props.color}88`) // 53% opacity
    gradient.addColorStop(1, `${props.color}00`) // 0% opacity
    backgroundColor = gradient
  }

  // Default chart options with design system styling
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#141414',
        titleColor: '#ffffff',
        bodyColor: '#cccccc',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            return `${context.parsed.y.toFixed(2)}%`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false
        },
        ticks: {
          color: '#666666',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          drawBorder: false
        },
        ticks: {
          color: '#666666',
          font: {
            size: 11
          },
          callback: (value) => `${value}%`
        }
      }
    }
  }

  // Add datalabels plugin if enabled
  if (props.datalabels && window.ChartDataLabels) {
    defaultOptions.plugins.datalabels = {
      color: '#ffffff',
      font: {
        size: 12,
        weight: 'bold'
      },
      anchor: 'end',
      align: 'top',
      offset: 6,
      formatter: (value) => {
        return value ? `${parseFloat(value).toFixed(1)}%` : ''
      }
    }
  }

  // Merge with custom options
  const mergedOptions = {
    ...defaultOptions,
    ...props.options,
    plugins: {
      ...defaultOptions.plugins,
      ...props.options.plugins
    },
    scales: {
      ...defaultOptions.scales,
      ...props.options.scales
    }
  }

  // Add extra space on Y axis if datalabels are enabled
  if (props.datalabels) {
    mergedOptions.scales.y.grace = '10%'
  }

  // Register plugins
  const plugins = []
  if (props.datalabels && window.ChartDataLabels) {
    plugins.push(window.ChartDataLabels)
  }

  chartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: [
        {
          label: props.label,
          data: props.data,
          borderColor: props.color,
          backgroundColor: backgroundColor,
          borderWidth: 2,
          fill: props.gradient,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: props.color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }
      ]
    },
    options: mergedOptions,
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

// Recreate chart when data changes
watch(
  () => [props.labels, props.data],
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
