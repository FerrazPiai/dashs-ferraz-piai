<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Financeiro</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">Fechamento por Squads</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">Última atualização: {{ lastUpdateTime }}</span>
        <VToggleGroup v-model="periodMode" :options="periodModeOptions" />
        <div v-if="periodMode === 'mes'" class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in mesesDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinaisDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div v-else class="period-range">
          <select class="month-select" v-model="selectedQuarter">
            <option v-for="q in quartersDisponiveis" :key="q.value" :value="q.value">{{ q.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading || refreshing" @click="handleRefresh" />
      </div>
    </div>

    <!-- Filtro de Squad -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Squad</label>
        <select class="filter-select" v-model="selectedSquad">
          <option value="__all__">Consolidado</option>
          <option v-for="s in squadsDisponiveis" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !hasData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !hasData" class="skeleton-table">
      <div v-for="i in 8" :key="i" class="skeleton-row">
        <div v-for="j in 7" :key="j" class="skeleton-cell"></div>
      </div>
    </div>

    <!-- Tabela: linhas = categorias de receita, colunas = meses -->
    <template v-if="hasData">
      <div class="table-wrapper">
        <table class="fin-table">
          <thead>
            <tr>
              <th class="col-label">{{ selectedSquad === '__all__' ? 'Consolidado' : selectedSquad }}</th>
              <th v-for="mes in mesesVisiveis" :key="mes" class="col-month">{{ mes }}</th>
            </tr>
          </thead>
          <tbody>
            <!-- Grupo: Aquisição -->
            <tr class="row-group-header">
              <td colspan="100" class="group-label">Aquisição</td>
            </tr>
            <tr v-for="field in FIELDS_AQUISICAO" :key="field.key">
              <td class="col-label">{{ field.label }}</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value"
              >{{ fmtBRL(getVal(mes, field.key)) }}</td>
            </tr>

            <!-- Grupo: Renovação -->
            <tr class="row-group-header">
              <td colspan="100" class="group-label">Renovação</td>
            </tr>
            <tr v-for="field in FIELDS_RENOVACAO" :key="field.key">
              <td class="col-label">{{ field.label }}</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value"
              >{{ fmtBRL(getVal(mes, field.key)) }}</td>
            </tr>

            <!-- Grupo: Expansão -->
            <tr class="row-group-header">
              <td colspan="100" class="group-label">Expansão</td>
            </tr>
            <tr v-for="field in FIELDS_EXPANSAO" :key="field.key">
              <td class="col-label">{{ field.label }}</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value"
              >{{ fmtBRL(getVal(mes, field.key)) }}</td>
            </tr>

            <!-- Grupo: Expansão — Outras Origens (só na visão por squad) -->
            <template v-if="selectedSquad !== '__all__'">
              <tr class="row-group-header">
                <td colspan="100" class="group-label group-label--outras">Expansão — Outras Origens</td>
              </tr>
              <tr v-for="field in FIELDS_EXPANSAO_OUTRAS" :key="field.key">
                <td class="col-label">{{ field.label }}</td>
                <td
                  v-for="mes in mesesVisiveis"
                  :key="mes"
                  class="col-value"
                >{{ fmtBRL(getVal(mes, field.key)) }}</td>
              </tr>
            </template>

            <!-- Grupo: Comissão -->
            <tr class="row-group-header">
              <td colspan="100" class="group-label">Comissão</td>
            </tr>
            <tr v-for="field in FIELDS_COMISSAO" :key="field.key">
              <td class="col-label">{{ field.label }}</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value"
              >{{ fmtBRL(getVal(mes, field.key)) }}</td>
            </tr>

            <!-- Total -->
            <tr class="row-total">
              <td class="col-label label-bold">Total</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value val-bold"
              >{{ fmtBRL(getVal(mes, 'total')) }}</td>
            </tr>

            <!-- Qtde clientes -->
            <tr class="row-meta">
              <td class="col-label">Qtde Clientes</td>
              <td
                v-for="mes in mesesVisiveis"
                :key="mes"
                class="col-value col-meta"
              >{{ getVal(mes, 'Qtde clientes') ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    message="Deseja atualizar os dados do Fechamento Financeiro? A atualização pode levar alguns minutos."
    confirmText="Sim, atualizar"
    cancelText="Cancelar"
    type="warning"
    @confirm="confirmRefresh"
    @cancel="cancelRefresh"
  />

  <!-- Modal: Atualização já em andamento -->
  <VConfirmModal
    :visible="showUpdatingModal"
    title="Atualização em andamento"
    message="Já existe uma atualização dos dados em andamento. Aguarde a conclusão antes de solicitar uma nova atualização."
    confirmText="Entendido"
    type="info"
    @confirm="showUpdatingModal = false"
    @cancel="showUpdatingModal = false"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import { MOCK_DATA } from './mock-data.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DASHBOARD_ID = 'fechamento-financeiro-squads'

const MONTH_ORDER = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const QUARTER_MONTHS = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12]
}

const periodModeOptions = [
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'mes', label: 'Mensal' }
]

/** Categorias de receita agrupadas */
const FIELDS_AQUISICAO = [
  { key: '1.1.01 Aquisição | [Saber] BR', label: 'Saber BR' },
  { key: '1.1.02 Aquisição | [Ter] BR', label: 'Ter BR' },
  { key: '1.1.03 Aquisição | [Executar] BR', label: 'Executar BR' },
  { key: '1.1.04 Aquisição | [Potencializar] BR', label: 'Potencializar BR' }
]

const FIELDS_RENOVACAO = [
  { key: '1.2.01 Renovação | [Saber] BR', label: 'Saber BR' },
  { key: '1.2.03 Renovação | [Executar] BR', label: 'Executar BR' },
  { key: '1.2.07 Renovação | [Executar] USA', label: 'Executar USA' }
]

const FIELDS_EXPANSAO = [
  { key: '1.3.01 Expansão | [Saber] BR', label: 'Saber BR' },
  { key: '1.3.02 Expansão | [Ter] BR', label: 'Ter BR' },
  { key: '1.3.03 Expansão | [Executar] BR', label: 'Executar BR' }
]

const FIELDS_EXPANSAO_OUTRAS = [
  { key: '1.3.01 Expansão Outras Origens | [Saber] BR', label: 'Saber BR' },
  { key: '1.3.02 Expansão Outras Origens | [Ter] BR', label: 'Ter BR' },
  { key: '1.3.03 Expansão Outras Origens | [Executar] BR', label: 'Executar BR' }
]

const FIELDS_COMISSAO = [
  { key: '1.4.01 Comissão de Cliente (BV / Variável)', label: 'BV / Variável' },
  { key: '1.4.02 Comissão Stack Digital', label: 'Stack Digital' }
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const selectedSquad = ref('__all__')
const periodMode = ref('trimestre')
const selectedQuarter = ref(null)
const mesInicial = ref(null)
const mesFinal = ref(null)
const lastUpdateTime = ref(null)
const loading = ref(false)
const error = ref(null)

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtBRL(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v)
}

// ---------------------------------------------------------------------------
// Parse month string → sortable value
// ---------------------------------------------------------------------------

function parseMonthStr(mesAno) {
  if (!mesAno) return { month: 0, year: 0, sortKey: 0 }
  const parts = mesAno.split('/')
  const monthName = parts[0]?.toLowerCase().trim()
  const year = parseInt(parts[1], 10) || 0
  const month = MONTH_ORDER.indexOf(monthName) + 1
  return { month, year, sortKey: year * 100 + month }
}

// ---------------------------------------------------------------------------
// Campos de expansão (usados na separação própria vs outras origens)
// ---------------------------------------------------------------------------

const EXPANSION_KEYS = [
  '1.3.01 Expansão | [Saber] BR',
  '1.3.02 Expansão | [Ter] BR',
  '1.3.03 Expansão | [Executar] BR'
]

// ---------------------------------------------------------------------------
// Transformação: dados crus da API → agregado por Mes/Ano + Squad
// Separa expansão própria de expansão via monetização (outras origens)
// ---------------------------------------------------------------------------

function transformApiData(rawRows) {
  const map = new Map()

  rawRows.forEach(r => {
    const key = r['Mes/Ano'] + '|' + r.Squad
    if (!map.has(key)) {
      map.set(key, {
        'Mes/Ano': r['Mes/Ano'],
        'Squad': r.Squad,
        '1.1.01 Aquisição | [Saber] BR': 0,
        '1.1.02 Aquisição | [Ter] BR': 0,
        '1.1.03 Aquisição | [Executar] BR': 0,
        '1.1.04 Aquisição | [Potencializar] BR': 0,
        '1.2.01 Renovação | [Saber] BR': 0,
        '1.2.03 Renovação | [Executar] BR': 0,
        '1.2.07 Renovação | [Executar] USA': 0,
        '1.3.01 Expansão | [Saber] BR': 0,
        '1.3.02 Expansão | [Ter] BR': 0,
        '1.3.03 Expansão | [Executar] BR': 0,
        '1.3.01 Expansão Outras Origens | [Saber] BR': 0,
        '1.3.02 Expansão Outras Origens | [Ter] BR': 0,
        '1.3.03 Expansão Outras Origens | [Executar] BR': 0,
        '1.4.01 Comissão de Cliente (BV / Variável)': 0,
        '1.4.02 Comissão Stack Digital': 0,
        'total': 0,
        'Qtde clientes': 0
      })
    }

    const entry = map.get(key)
    const isOutrasOrigens = r['Descrição'] && /monetiza/i.test(r['Descrição'])

    for (const [k, v] of Object.entries(r)) {
      if (k === 'Mes/Ano' || k === 'Squad' || k === 'Nome do cliente' || k === 'Descrição' || k === 'Observações') continue
      if (typeof v !== 'number') continue

      if (isOutrasOrigens && EXPANSION_KEYS.includes(k)) {
        const outrasKey = k.replace('Expansão', 'Expansão Outras Origens')
        entry[outrasKey] = (entry[outrasKey] || 0) + v
      } else {
        entry[k] = (entry[k] || 0) + v
      }
    }
    entry['Qtde clientes'] = (entry['Qtde clientes'] || 0) + 1
  })

  return [...map.values()].map(r => {
    const o = {}
    for (const [k, v] of Object.entries(r)) {
      o[k] = typeof v === 'number' && k !== 'Qtde clientes' ? Math.round(v * 100) / 100 : v
    }
    return o
  })
}

// ---------------------------------------------------------------------------
// Dados processados
// ---------------------------------------------------------------------------

// TODO: trocar por useDashboardData quando sair de desenvolvimento
// Quando usar API real: const porMesSquad = computed(() => transformApiData(rawData.value))
const porMesSquad = computed(() => transformApiData(MOCK_DATA))

// ---------------------------------------------------------------------------
// Squads disponíveis
// ---------------------------------------------------------------------------

const squadsDisponiveis = computed(() => {
  const set = new Set()
  porMesSquad.value.forEach(r => {
    if (r.Squad) set.add(r.Squad)
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

// ---------------------------------------------------------------------------
// Todos os meses disponíveis (parsed)
// ---------------------------------------------------------------------------

const allParsedMonths = computed(() => {
  const seen = new Set()
  const result = []
  porMesSquad.value.forEach(r => {
    const m = r['Mes/Ano']
    if (m && !seen.has(m)) {
      seen.add(m)
      const parsed = parseMonthStr(m)
      result.push({ raw: m, ...parsed })
    }
  })
  return result.sort((a, b) => b.sortKey - a.sortKey)
})

// ---------------------------------------------------------------------------
// Quarters disponíveis (ordem decrescente)
// ---------------------------------------------------------------------------

const quartersDisponiveis = computed(() => {
  const seen = new Set()
  const result = []
  allParsedMonths.value.forEach(({ month, year }) => {
    for (const [q, months] of Object.entries(QUARTER_MONTHS)) {
      if (months.includes(month)) {
        const key = `${year}-${q}`
        if (!seen.has(key)) {
          seen.add(key)
          result.push({ value: key, label: `${q}/${year}`, year, quarter: q })
        }
      }
    }
  })
  return result.sort((a, b) => a.year !== b.year ? b.year - a.year : b.quarter.localeCompare(a.quarter))
})

// ---------------------------------------------------------------------------
// Meses disponíveis para selects (ordem decrescente)
// ---------------------------------------------------------------------------

const mesesDisponiveis = computed(() => {
  return allParsedMonths.value.map(({ raw, sortKey }) => ({
    value: sortKey,
    label: raw
  }))
})

const mesesFinaisDisponiveis = computed(() => {
  if (!mesInicial.value) return mesesDisponiveis.value
  return mesesDisponiveis.value.filter(m => m.value >= mesInicial.value)
})

// ---------------------------------------------------------------------------
// Watchers para inicializar período
// ---------------------------------------------------------------------------

watch(quartersDisponiveis, (quarters) => {
  if (!quarters.length) return
  if (!selectedQuarter.value) {
    const now = new Date()
    const curYear = now.getFullYear()
    const curQ = `Q${Math.ceil((now.getMonth() + 1) / 3)}`
    const curKey = `${curYear}-${curQ}`
    const match = quarters.find(q => q.value === curKey)
    selectedQuarter.value = match ? match.value : quarters[0].value
  }
}, { immediate: true })

watch(mesesDisponiveis, (months) => {
  if (!months.length) return
  if (!mesInicial.value) mesInicial.value = months[0].value
  if (!mesFinal.value) mesFinal.value = months[0].value
}, { immediate: true })

// ---------------------------------------------------------------------------
// Meses visíveis (filtrados pelo período selecionado)
// ---------------------------------------------------------------------------

const mesesVisiveis = computed(() => {
  const rows = selectedSquad.value === '__all__'
    ? porMesSquad.value
    : porMesSquad.value.filter(r => r.Squad === selectedSquad.value)

  const seen = new Set()
  const meses = []
  rows.forEach(r => {
    const m = r['Mes/Ano']
    if (m && !seen.has(m)) {
      seen.add(m)
      meses.push(m)
    }
  })

  const sorted = meses.sort((a, b) => parseMonthStr(a).sortKey - parseMonthStr(b).sortKey)

  // Filtrar pelo período selecionado
  if (periodMode.value === 'trimestre' && selectedQuarter.value) {
    const [yearStr, q] = selectedQuarter.value.split('-')
    const year = parseInt(yearStr, 10)
    const qMonths = QUARTER_MONTHS[q] || []
    return sorted.filter(m => {
      const p = parseMonthStr(m)
      return p.year === year && qMonths.includes(p.month)
    })
  }

  if (periodMode.value === 'mes' && mesInicial.value && mesFinal.value) {
    const ini = Math.min(mesInicial.value, mesFinal.value)
    const fim = Math.max(mesInicial.value, mesFinal.value)
    return sorted.filter(m => {
      const sk = parseMonthStr(m).sortKey
      return sk >= ini && sk <= fim
    })
  }

  return sorted
})

// ---------------------------------------------------------------------------
// Mapa de valores: mes → campo → valor
// ---------------------------------------------------------------------------

const valuesMap = computed(() => {
  const rows = selectedSquad.value === '__all__'
    ? porMesSquad.value
    : porMesSquad.value.filter(r => r.Squad === selectedSquad.value)

  // Agrupar por mês (somar se consolidado)
  const map = new Map()
  rows.forEach(r => {
    const mes = r['Mes/Ano']
    if (!mes) return
    if (!map.has(mes)) map.set(mes, {})
    const entry = map.get(mes)
    for (const [key, val] of Object.entries(r)) {
      if (key === 'Mes/Ano' || key === 'Squad') continue
      if (typeof val === 'number') {
        entry[key] = (entry[key] ?? 0) + val
      }
    }
  })

  return map
})

function getVal(mes, key) {
  const entry = valuesMap.value.get(mes)
  if (!entry) return null
  const val = entry[key]
  return val !== undefined ? val : null
}

const hasData = computed(() => mesesVisiveis.value.length > 0)

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  lastUpdateTime.value = new Date().toLocaleString('pt-BR', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
  })
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// ---------------------------------------------------------------------------
// Update confirmation modal
// ---------------------------------------------------------------------------

const refreshing = ref(false)
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

async function handleRefresh() {
  try {
    const statusRes = await fetch(`/api/update-status/${DASHBOARD_ID}`)
    const statusData = await statusRes.json()
    if (statusData.updating) {
      showUpdatingModal.value = true
      return
    }
  } catch {
    // Se falhar, prosseguir com confirmação
  }
  showConfirmModal.value = true
}

function cancelRefresh() {
  showConfirmModal.value = false
}

async function confirmRefresh() {
  showConfirmModal.value = false
  refreshing.value = true
  try {
    const res = await fetch(`/api/${DASHBOARD_ID}/trigger-update`)
    if (!res.ok && res.status === 409) {
      refreshing.value = false
      showUpdatingModal.value = true
      return
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] [Fechamento Financeiro] Falha ao chamar webhook:`, err.message)
  }
  refreshing.value = false
  await fetchData(true)
}
</script>

<style scoped>
/* ---- Header ---- */
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.title-sep {
  font-size: 20px;
  color: #333;
  font-weight: 300;
}

.main-subtitle {
  font-size: 18px;
  font-weight: 400;
  color: #888;
  margin: 0;
}

/* ---- Period selector ---- */
.period-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.period-sep {
  font-size: 12px;
  color: #555;
}

.month-select {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding: 6px 18px 6px 4px;
  appearance: none;
  -webkit-appearance: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.month-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 8px 12px;
}

/* ---- Filters ---- */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 8px 14px;
}

.filter-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.filter-select {
  background: transparent;
  border: none;
  color: #ccc;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  padding: 4px 18px 4px 4px;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.filter-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  padding: 8px 12px;
}

/* ---- Table ---- */
.table-wrapper {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #222;
}

.fin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.fin-table thead th {
  padding: 12px 16px;
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  white-space: nowrap;
}

.fin-table thead th.col-label {
  text-align: left;
  min-width: 200px;
  position: sticky;
  left: 0;
  z-index: 2;
  background: #141414;
}

/* ---- Group header row ---- */
.row-group-header td {
  padding: 10px 16px 6px;
  background: #111;
  border-bottom: 1px solid #1e1e1e;
}

.group-label {
  font-size: 11px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.group-label--outras {
  color: #b45309;
}

/* ---- Data rows ---- */
.col-label {
  padding: 9px 16px;
  background: #111;
  border-bottom: 1px solid #1a1a1a;
  border-right: 1px solid #2a2a2a;
  color: #aaa;
  white-space: nowrap;
  text-align: left;
  position: sticky;
  left: 0;
  z-index: 1;
}

.col-value {
  padding: 9px 16px;
  border-bottom: 1px solid #1a1a1a;
  border-right: 1px solid #1e1e1e;
  text-align: right;
  color: #ccc;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ---- Total row ---- */
.row-total td {
  border-top: 2px solid #333;
  background: rgba(255, 255, 255, 0.03);
}

.label-bold {
  color: #fff !important;
  font-weight: 600;
}

.val-bold {
  color: #fff !important;
  font-weight: 600;
}

/* ---- Meta row (qtde clientes) ---- */
.row-meta td {
  border-top: 1px solid #2a2a2a;
}

.col-meta {
  color: #666;
  font-size: 12px;
}

/* ---- Last row no bottom border ---- */
.fin-table tbody tr:last-child td {
  border-bottom: none;
}

/* ---- Skeleton ---- */
.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.skeleton-row {
  display: flex;
  gap: 3px;
}

.skeleton-cell {
  height: 40px;
  flex: 1;
  background: #141414;
  border-radius: 3px;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}

/* ---- Error ---- */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
}
</style>
