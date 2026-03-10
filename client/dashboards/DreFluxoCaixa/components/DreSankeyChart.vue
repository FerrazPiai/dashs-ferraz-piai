<template>
  <div ref="chartEl" class="sankey-chart"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  financeData: {
    type: Object,
    required: true
  }
})

const chartEl = ref(null)
let chartInstance = null

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function buildOption(d) {
  // Valores reais para labels e tooltips (podem ser negativos)
  const actual = {
    'Receita Bruta':             d.receitaBruta,
    'Receita Líquida':           d.receitaLiquida,
    'Impostos':                  d.impostos,
    'Tarifas':                   d.tarifas,
    'Royalties':                 d.royalties,
    'Lucro Bruto':               d.lucroBruto,
    'Custos Operacionais':       d.custosOperacionais,
    'EBITDA':                    d.ebitda,
    '4.1 Desp. Comerciais':      d.despesasComerciais,
    '4.2 Desp. Administrativas': d.despesasAdministrativas,
    '4.3 Desp. Gerais':          d.despesasGerais,
    'EBT':                       d.ebt,
    '5.1 Depreciação':           d.depreciacao,
    '5.2 Amortização':           d.amortizacao,
    '6.1 Receita Financeira':    d.receitaFinanceira,
    '6.2 Despesa Financeira':    d.despesaFinanceira,
    'Lucro Líquido':             d.lucroLiquido,
    'Impostos Sobre Lucro':      d.impostosSobreLucro,
  }

  // Valores absolutos para layout do Sankey (que não aceita negativos)
  // Links marcados como negative=true recebem cor vermelha
  const depreciacao  = d.depreciacao        || 0
  const amortizacao  = d.amortizacao        || 0
  const receitaFin   = d.receitaFinanceira  || 0
  const despesaFin   = d.despesaFinanceira  || 0
  const impostosSL   = d.impostosSobreLucro || 0

  // Cor dinâmica para nós do fluxo principal: vermelho quando negativo
  const mc = (name, pos) => (actual[name] || 0) < 0 ? '#7f1d1d' : pos

  const nodes = [
    { name: 'Receita Bruta',             itemStyle: { color: mc('Receita Bruta', '#10b981') },   depth: 0, label: { position: 'left' } },
    { name: 'Receita Líquida',           itemStyle: { color: mc('Receita Líquida', '#059669') }, depth: 1, label: { position: 'top' } },
    { name: 'Impostos',                  itemStyle: { color: '#f43f5e' }, depth: 1 },
    { name: 'Tarifas',                   itemStyle: { color: '#e11d48' }, depth: 1 },
    { name: 'Royalties',                 itemStyle: { color: '#fb923c' }, depth: 1 },
    { name: 'Lucro Bruto',               itemStyle: { color: mc('Lucro Bruto', '#047857') },     depth: 2, label: { position: 'top' } },
    { name: 'Custos Operacionais',       itemStyle: { color: '#f97316' }, depth: 2 },
    { name: 'EBITDA',                    itemStyle: { color: mc('EBITDA', '#065f46') },           depth: 3, label: { position: 'top' } },
    { name: '4.1 Desp. Comerciais',      itemStyle: { color: '#ef4444' }, depth: 3 },
    { name: '4.2 Desp. Administrativas', itemStyle: { color: '#dc2626' }, depth: 3 },
    { name: '4.3 Desp. Gerais',          itemStyle: { color: '#b91c1c' }, depth: 3 },
    { name: 'EBT',                       itemStyle: { color: mc('EBT', '#064e3b') },              depth: 4, label: { position: 'top' } },
    { name: '5.1 Depreciação',           itemStyle: { color: '#f59e0b' }, depth: 4 },
    { name: '5.2 Amortização',           itemStyle: { color: '#d97706' }, depth: 4 },
    { name: '6.1 Receita Financeira',    itemStyle: { color: '#34d399' }, depth: 4 },
    { name: '6.2 Despesa Financeira',    itemStyle: { color: '#b45309' }, depth: 4 },
    { name: 'Lucro Líquido',             itemStyle: { color: mc('Lucro Líquido', '#22c55e') },   depth: 5, label: { position: 'right' } },
    { name: 'Impostos Sobre Lucro',      itemStyle: { color: '#9f1239' }, depth: 5 },
  ]

  const neg = (v) => (v || 0) < 0

  const allLinks = [
    { source: 'Receita Bruta',     target: 'Receita Líquida',           value: d.receitaLiquida,           negative: neg(d.receitaLiquida) },
    { source: 'Receita Bruta',     target: 'Impostos',                  value: d.impostos },
    { source: 'Receita Bruta',     target: 'Tarifas',                   value: d.tarifas },
    { source: 'Receita Bruta',     target: 'Royalties',                 value: d.royalties },
    { source: 'Receita Líquida',   target: 'Lucro Bruto',               value: d.lucroBruto,               negative: neg(d.lucroBruto) },
    { source: 'Receita Líquida',   target: 'Custos Operacionais',       value: d.custosOperacionais },
    { source: 'Lucro Bruto',       target: 'EBITDA',                    value: d.ebitda,                   negative: neg(d.ebitda) },
    { source: 'Lucro Bruto',       target: '4.1 Desp. Comerciais',      value: d.despesasComerciais },
    { source: 'Lucro Bruto',       target: '4.2 Desp. Administrativas', value: d.despesasAdministrativas },
    { source: 'Lucro Bruto',       target: '4.3 Desp. Gerais',          value: d.despesasGerais },
    { source: 'EBITDA',            target: 'EBT',                       value: d.ebt,                      negative: neg(d.ebt) },
    { source: 'EBITDA',            target: '5.1 Depreciação',           value: depreciacao },
    { source: 'EBITDA',            target: '5.2 Amortização',           value: amortizacao },
    { source: '6.1 Receita Financeira', target: 'EBT',                  value: receitaFin },
    { source: 'EBITDA',            target: '6.2 Despesa Financeira',    value: despesaFin },
    { source: 'EBT',               target: 'Lucro Líquido',             value: d.lucroLiquido,             negative: neg(d.lucroLiquido) },
    { source: 'EBT',               target: 'Impostos Sobre Lucro',      value: impostosSL },
  ]

  const links = allLinks
    .filter((l) => Math.abs(l.value || 0) > 0)
    .map(({ negative, value, ...l }) => ({
      ...l,
      value: Math.abs(value),
      realValue: value,
      ...(negative ? { lineStyle: { color: '#ef4444', opacity: 0.8, curveness: 0.7 } } : {}),
    }))
  const linkedNames = new Set(links.flatMap((l) => [l.source, l.target]))
  const filteredNodes = nodes.filter((n) => linkedNames.has(n.name))

  const incomeNodes     = ['Receita Bruta', 'Receita Líquida', 'Lucro Bruto', 'EBITDA', 'EBT', 'Lucro Líquido', '6.1 Receita Financeira']
  const mainFlowNodes   = incomeNodes
  const mainFlowTargets = ['Receita Líquida', 'Lucro Bruto', 'EBITDA', 'EBT', 'Lucro Líquido']

  return {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: '#141414',
      borderColor: '#222',
      padding: 12,
      textStyle: { color: '#ccc', fontFamily: 'Ubuntu, Segoe UI, sans-serif', fontSize: 12 },
      formatter(params) {
        // Sempre mostra o valor financeiro real (não o valor ajustado do layout)
        const displayVal = params.dataType === 'node'
          ? (actual[params.name] ?? params.value)
          : (params.data.realValue ?? params.value)
        const percBruta   = ((displayVal / d.receitaBruta)   * 100).toFixed(1)
        const percLiquida = ((displayVal / d.receitaLiquida) * 100).toFixed(1)

        const percentagesHtml = `
          <hr style="border-top: 1px solid #333; margin: 8px 0;" />
          <div style="font-size: 11px; color: #999; line-height: 1.6;">
            <div>% da Receita Bruta: <strong style="color: #ccc; float: right; margin-left: 12px;">${percBruta}%</strong></div>
            <div>% da Receita Líquida: <strong style="color: #ccc; float: right; margin-left: 12px;">${percLiquida}%</strong></div>
          </div>
        `

        if (params.dataType === 'node') {
          const isPositive = displayVal >= 0
          const valueColor = mainFlowNodes.includes(params.name)
            ? (isPositive ? '#10b981' : '#ef4444')
            : '#ef4444'
          return `
            <div style="font-family: Ubuntu, Segoe UI, sans-serif; min-width: 180px;">
              <strong style="font-size: 13px; color: #fff;">${params.name}</strong><br/>
              <span style="font-size: 15px; font-weight: 600; color: ${valueColor};">${formatCurrency(displayVal)}</span>
              ${percentagesHtml}
            </div>
          `
        } else {
          const isMainFlow = mainFlowTargets.includes(params.data.target)
          const valueColor = isMainFlow && displayVal >= 0 ? '#10b981' : '#ef4444'
          return `
            <div style="font-family: Ubuntu, Segoe UI, sans-serif; min-width: 180px;">
              <div style="font-size: 11px; color: #999; margin-bottom: 4px;">
                ${params.data.source} <span style="color: #555;">➔</span> ${params.data.target}
              </div>
              <span style="font-size: 15px; font-weight: 600; color: ${valueColor};">${formatCurrency(displayVal)}</span>
              ${percentagesHtml}
            </div>
          `
        }
      }
    },
    series: [
      {
        type: 'sankey',
        layoutIterations: 0,
        nodeAlign: 'left',
        top: '10%',
        bottom: '5%',
        left: '14%',
        right: '20%',
        nodeWidth: 8,
        nodeGap: 25,
        data: filteredNodes,
        links,
        itemStyle: { borderWidth: 0, borderRadius: 4 },
        lineStyle: { color: 'source', curveness: 0.7, opacity: 0.4 },
        label: {
          position: 'right',
          color: '#ccc',
          fontFamily: 'Ubuntu, Segoe UI, sans-serif',
          fontWeight: 500,
          fontSize: 11,
          distance: 10,
          formatter(params) {
            // Mostra o valor real (não o layout value)
            const displayVal = actual[params.data.name] ?? params.value
            return `${params.data.name}\n${formatCurrency(displayVal)}`
          },
          lineHeight: 16
        }
      }
    ]
  }
}

function initChart() {
  if (!chartEl.value || !window.echarts) return
  chartInstance = window.echarts.init(chartEl.value)
  chartInstance.setOption(buildOption(props.financeData))
}

function handleResize() {
  chartInstance?.resize()
}

watch(() => props.financeData, (newData) => {
  if (chartInstance && newData) {
    chartInstance.setOption(buildOption(newData))
  }
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.sankey-chart {
  width: 100%;
  height: 750px;
}
</style>
