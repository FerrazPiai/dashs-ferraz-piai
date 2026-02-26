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
  datasets: {
    type: Array,
    required: true,
    validator: (datasets) => {
      return datasets.every(
        (ds) => 'label' in ds && 'data' in ds
      )
    }
  },
  stacked: {
    type: Boolean,
    default: false
  },
  datalabels: {
    type: Boolean,
    default: false
  },
  horizontal: {
    type: Boolean,
    default: false
  },
  options: {
    type: Object,
    default: () => ({})
  },
  customPlugins: {
    type: Array,
    default: () => ([])
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

  // Default chart options with design system styling
  const defaultOptions = {
    indexAxis: props.horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: props.datasets.length > 1,
        position: 'top',
        labels: {
          color: '#cccccc',
          font: {
            size: 12
          },
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
        displayColors: true
      }
    },
    scales: {
      x: {
        stacked: props.stacked,
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
        stacked: props.stacked,
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
      }
    }
  }

  // Add datalabels plugin if enabled
  if (props.datalabels && window.ChartDataLabels) {
    defaultOptions.plugins.datalabels = props.horizontal ? {
      color: '#ffffff',
      font: {
        size: 11,
        weight: 'bold'
      },
      anchor: 'end',
      align: 'right',
      offset: 8
    } : {
      color: '#ffffff',
      font: {
        size: 10,
        weight: 600
      },
      anchor: 'end',
      align: 'top',
      offset: 4
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

  // Process datasets with default colors
  const defaultColors = [
    '#ff0000', // Red
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#fbbf24', // Yellow
    '#ef4444', // Orange/Red
    '#a855f7', // Purple
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ]

  const processedDatasets = props.datasets.map((dataset, index) => ({
    ...dataset,
    backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length],
    borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
    borderWidth: dataset.borderWidth || 0,
    borderRadius: dataset.borderRadius || 4
  }))

  // Register datalabels plugin if available
  const plugins = [...props.customPlugins]
  if (props.datalabels && window.ChartDataLabels) {
    plugins.push(window.ChartDataLabels)
  }

  chartInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: processedDatasets
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
  () => [props.labels, props.datasets],
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
