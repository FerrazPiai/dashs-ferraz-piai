<template>
  <VBarChart
    :labels="chartLabels"
    :datasets="chartDatasets"
    :stacked="false"
    :datalabels="true"
    :options="chartOptions"
    :horizontal="props.view === 'consolidated'"
    :customPlugins="[safrasSeparatorPlugin]"
  />
</template>

<script setup>
import { computed } from 'vue'
import VBarChart from '@/components/charts/VBarChart.vue'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  view: {
    type: String,
    default: 'consolidated',
    validator: (val) => ['consolidated', 'by-safra'].includes(val)
  }
})

// Mapa de cores fixo por tier (consistente em todos os gráficos)
const tierColorMap = {
  'Enterprise - 480 Mi (Ano)': '#22c55e',      // Verde
  'Large - 50 a 480 Mi (Ano)': '#f59e0b',      // Laranja
  'Medium - 2.4 a 50 Mi (Ano)': '#fbbf24',     // Amarelo
  'Small - 1.2 a 2.4 Mi': '#ef4444',           // Vermelho
  'Tiny - Ate 1.2 Mi': '#a855f7',              // Roxo
  'Sem Tier': '#6b7280'                        // Cinza
}

// Get unique tiers and safras
const tiers = computed(() => {
  const tierSet = new Set(props.data.map(item => item.tier))
  const tiersArray = Array.from(tierSet).sort()
  // Move "Sem Tier" to the end
  return tiersArray.filter(t => t !== 'Sem Tier').concat(tiersArray.filter(t => t === 'Sem Tier'))
})

const safras = computed(() => {
  const safraSet = new Set(props.data.map(item => item.safra))
  // Ordenação cronológica crescente (MM/YYYY)
  return Array.from(safraSet).sort((a, b) => {
    const [monthA, yearA] = a.split('/').map(Number)
    const [monthB, yearB] = b.split('/').map(Number)
    if (yearA !== yearB) return yearA - yearB
    return monthA - monthB
  })
})

// Chart labels
const chartLabels = computed(() => {
  if (props.view === 'consolidated') {
    // Usar labels ordenados do dataset
    const dataset = chartDatasets.value[0]
    return dataset?._labels || tiers.value
  }
  return safras.value
})

// Chart datasets
const chartDatasets = computed(() => {
  if (props.view === 'consolidated') {
    // Consolidado: um dataset com todos os tiers, agregando todas as safras
    const consolidated = {}

    props.data.forEach(item => {
      if (!consolidated[item.tier]) {
        consolidated[item.tier] = { total: 0, monet: 0 }
      }
      consolidated[item.tier].total += item.total
      consolidated[item.tier].monet += item.monet
    })

    // Criar array com tier e taxa de conversão
    const tierData = tiers.value.map(tier => {
      const data = consolidated[tier]
      const rate = (data && data.total > 0) ? (data.monet / data.total) * 100 : 0
      return { tier, rate }
    })

    // Ordenar por taxa de conversão (maior para menor)
    tierData.sort((a, b) => b.rate - a.rate)

    const sortedLabels = tierData.map(item => item.tier)
    const sortedValues = tierData.map(item => item.rate.toFixed(2))
    const sortedColors = tierData.map(item => tierColorMap[item.tier] || '#6b7280')

    return [
      {
        label: 'Taxa de Conversão (%)',
        data: sortedValues,
        backgroundColor: sortedColors,
        _labels: sortedLabels // Armazenar labels ordenados
      }
    ]
  }

  // By-safra: múltiplos datasets, um por tier
  return tiers.value.map(tier => {
    const values = safras.value.map(safra => {
      const item = props.data.find(d => d.safra === safra && d.tier === tier)
      if (!item || item.total === 0) return 0
      return ((item.monet / item.total) * 100).toFixed(2)
    })

    // Usar cor do mapa de cores
    const color = tierColorMap[tier] || '#6b7280'

    return {
      label: tier,
      data: values,
      backgroundColor: color
    }
  })
})

// Plugin para adicionar separadores entre safras
const safrasSeparatorPlugin = {
  id: 'safrasSeparator',
  beforeDraw: (chart) => {
    if (props.view !== 'by-safra') return

    const ctx = chart.ctx
    const chartArea = chart.chartArea
    const labels = chart.data.labels

    ctx.save()

    // Desenhar linhas separadoras entre TODAS as safras
    for (let i = 1; i < labels.length; i++) {
      const prevLabel = labels[i - 1]
      const currentLabel = labels[i]

      // Verificar se mudou o ano (linha mais forte)
      const prevYear = prevLabel.split('/')[1]
      const currentYear = currentLabel.split('/')[1]
      const isYearChange = prevYear !== currentYear

      // Calcular posição X entre as duas categorias
      const xScale = chart.scales.x
      const prevX = xScale.getPixelForValue(i - 1)
      const currentX = xScale.getPixelForValue(i)
      const separatorX = (prevX + currentX) / 2

      // Estilo da linha
      if (isYearChange) {
        // Linha sólida branca para mudança de ano
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.lineWidth = 2
        ctx.setLineDash([])
      } else {
        // Linha tracejada cinza clara para separar meses
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
      }

      // Desenhar linha vertical
      ctx.beginPath()
      ctx.moveTo(separatorX, chartArea.top)
      ctx.lineTo(separatorX, chartArea.bottom)
      ctx.stroke()
    }

    ctx.restore()
  }
}

const chartOptions = computed(() => {
  const baseOptions = {
    plugins: {
      legend: {
        display: props.view === 'by-safra'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || ''
            const value = props.view === 'consolidated' ? context.parsed.x : context.parsed.y
            return `${label}: ${value}%`
          }
        }
      },
      datalabels: {
        color: '#ffffff',
        font: {
          weight: 'bold',
          size: 12
        },
        formatter: (value) => {
          return value > 0 ? `${value}%` : ''
        },
        // Números acima das barras (apenas na visão "Por Safra")
        anchor: props.view === 'by-safra' ? 'end' : 'center',
        align: props.view === 'by-safra' ? 'top' : 'center',
        offset: props.view === 'by-safra' ? 4 : 0
      },
      safrasSeparator: true // Habilitar plugin customizado
    }
  }

  if (props.view === 'consolidated') {
    // Barras horizontais: X é o valor (%), Y é a categoria
    baseOptions.scales = {
      x: {
        ticks: {
          callback: (value) => value + '%'
        }
      }
    }
  } else {
    // Barras verticais: Y é o valor (%)
    // Barras mais próximas e centralizadas
    baseOptions.barPercentage = 0.95
    baseOptions.categoryPercentage = 0.7

    baseOptions.scales = {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        grace: '15%', // Adiciona 15% de espaço extra no topo para os labels
        ticks: {
          callback: (value) => value + '%'
        }
      }
    }
  }

  return baseOptions
})
</script>
