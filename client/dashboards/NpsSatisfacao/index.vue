<template>
  <div class="dashboard-container">
    <!-- Header (sticky) — só título + período + refresh -->
    <div class="sticky-header-wrap">
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">NPS</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">Pesquisa de Satisfação</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">{{ lastUpdateTime }}</span>
        <VToggleGroup v-model="periodMode" :options="periodModeOptions" />
        <div v-if="periodMode === 'mes'" class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in mesesDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinalDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
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
    </div><!-- /sticky-header-wrap -->

    <!-- Filtros (abaixo do header, igual GTM Motion) -->
    <div class="filters-bar">
      <VSelect label="Tier" :options="tierSelectOptions" v-model="selectedTier" all-value="todos" placeholder="Todos" />
      <VSelect label="Coordenador" :options="coordSelectOptions" v-model="selectedCoord" all-value="todos" placeholder="Todos" />
      <VSelect label="Grupo LT" :options="ltGroupSelectOptions" v-model="selectedLtGroup" all-value="todos" placeholder="Todos" />
      <VSelect label="Categoria" :options="categoriaSelectOptions" v-model="selectedCategoria" all-value="todos" placeholder="Todos" />
      <VSelect label="Tipo" :options="tipoSelectOptions" v-model="selectedTipo" all-value="todos" placeholder="Todos" />
      <VSelect label="Modelo Vendas" :options="modeloSelectOptions" v-model="selectedModelo" all-value="todos" placeholder="Todos" />
    </div>

    <!-- Error State -->
    <div v-if="error && !npsData.length" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- NPS Content -->
    <NpsContent
      :data="npsFilteredByPeriod"
      :comparisonData="npsPreviousPeriod"
      :compPeriodLabel="compPeriodLabel"
      :loading="loading"
      :selectedTier="selectedTier"
      :selectedCoord="selectedCoord"
      :selectedLtGroup="selectedLtGroup"
      :selectedCategoria="selectedCategoria"
      :selectedTipo="selectedTipo"
      :selectedModelo="selectedModelo"
    />
  </div>

  <!-- Modal: Confirmação de atualização -->
  <VConfirmModal
    :visible="showConfirmModal"
    title="Atualizar dados"
    :message="confirmMessage"
    confirmText="Sim, atualizar"
    cancelText="Cancelar"
    type="warning"
    @confirm="confirmRefresh"
    @cancel="showConfirmModal = false"
  />

  <VConfirmModal
    :visible="showUpdatingModal"
    title="Atualização em andamento"
    message="Já existe uma atualização dos dados em andamento. Aguarde a conclusão."
    confirmText="Entendido"
    type="info"
    @confirm="showUpdatingModal = false"
    @cancel="showUpdatingModal = false"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VConfirmModal from '../../components/ui/VConfirmModal.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import VSelect from '../../components/ui/VSelect.vue'
import NpsContent from './components/NpsContent.vue'

const { data, loading, error, fetchData } = useDashboardData('nps-satisfacao')

const refreshing = ref(false)
const showConfirmModal = ref(false)
const showUpdatingModal = ref(false)

// ── Última atualização ─────────────────────────────────────────────────────
const lastUpdateTime = ref('')
const formatTimestamp = () => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} às ${hours}:${minutes}`
}

// ── Modo de período (Mês / Quarter) ────────────────────────────────────────
const periodMode = ref('mes')
const periodModeOptions = [
  { value: 'mes', label: 'Mês' },
  { value: 'quarter', label: 'Quarter' },
]

// ── Filtros ─────────────────────────────────────────────────────────────────
const selectedTier = ref('todos')
const selectedCoord = ref('todos')
const selectedLtGroup = ref('todos')
const selectedCategoria = ref('todos')
const selectedTipo = ref('todos')
const selectedModelo = ref('todos')

const TIER_ORDER = ['Enterprise', 'Large', 'Medium', 'Small', 'Tiny', 'Non-ICP', 'Sem preenchimento']

// ── Período (mês) ───────────────────────────────────────────────────────────
const MES_LABELS = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function parseDataToMonth(d) {
  if (!d) return null
  // "2026-03-10 0:00:00" (ISO-like)
  if (d.includes('-')) { const p = d.split(' ')[0].split('-'); return `${p[0]}-${p[1]}` }
  // "21/08/2025" (BR)
  const parts = d.split('/'); if (parts.length === 3) return `${parts[2]}-${parts[1]}`
  return null
}

// Extrair array NPS do response da API
// Suporta múltiplos formatos:
// 1. Array direto de NPS: [{ Nota, ... }]
// 2. GTM Motion format: [{ data: { nps: [...], kpis, funil, ... } }]
// 3. Objeto com nps: { nps: [...] }
// 4. Objeto com data array: { data: [...] }
const npsData = computed(() => {
  const raw = data.value
  if (!raw) return []
  // 1. Array direto de registros NPS
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.Nota !== undefined) return raw
  // 2. Encapsulado em [{ data: { nps: [...] } }] (GTM Motion format)
  if (Array.isArray(raw) && raw[0]?.data) {
    const inner = raw[0].data
    if (inner?.nps && Array.isArray(inner.nps)) return inner.nps
    if (Array.isArray(inner)) return inner
  }
  // 3. { data: { nps: [...] } }
  if (raw?.data?.nps && Array.isArray(raw.data.nps)) return raw.data.nps
  // 4. { data: [...] }
  if (raw?.data && Array.isArray(raw.data)) return raw.data
  // 5. { nps: [...] }
  if (raw?.nps && Array.isArray(raw.nps)) return raw.nps
  return []
})

// ── Quarter selection (igual GTM Motion) ────────────────────────────────────
function getCurrentQuarterValue() {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

function getPreviousQuarter(q) {
  const [year, qNum] = [parseInt(q.split('-Q')[0]), parseInt(q.split('-Q')[1])]
  if (qNum === 1) return `${year - 1}-Q4`
  return `${year}-Q${qNum - 1}`
}

function quarterStartMonth(qKey) {
  const [y, q] = qKey.split('-Q')
  const m = (Number(q) - 1) * 3 + 1
  return `${y}-${String(m).padStart(2, '0')}`
}
function quarterEndMonth(qKey) {
  const [y, q] = qKey.split('-Q')
  const m = Number(q) * 3
  return `${y}-${String(m).padStart(2, '0')}`
}

const selectedQuarter = ref(getCurrentQuarterValue())
const compQuarter = ref(getPreviousQuarter(selectedQuarter.value))

watch(selectedQuarter, (q) => {
  compQuarter.value = getPreviousQuarter(q)
})

// Quarters disponíveis (derivados dos meses nos dados)
const quartersDisponiveis = computed(() => {
  const set = new Set()
  for (const r of npsData.value) {
    const key = parseDataToMonth(r.Data)
    if (!key) continue
    const [y, m] = key.split('-')
    const q = Math.ceil(Number(m) / 3)
    set.add(`${y}-Q${q}`)
  }
  return [...set].sort().reverse().map(k => {
    const [y, q] = k.split('-')
    return { value: k, label: `${q} ${y}` }
  })
})

watch(quartersDisponiveis, (available) => {
  if (!available.length) return
  const vals = available.map(q => q.value)
  if (!vals.includes(selectedQuarter.value)) selectedQuarter.value = vals[0]
}, { immediate: false })

// ── Month range ─────────────────────────────────────────────────────────────
const mesInicial = ref('')
const mesFinal = ref('')

// Meses disponíveis (extraídos dos dados)
const mesesDisponiveis = computed(() => {
  const set = new Set()
  for (const r of npsData.value) {
    const key = parseDataToMonth(r.Data)
    if (key) set.add(key)
  }
  return [...set].sort().reverse().map(k => {
    const [y, m] = k.split('-')
    return { value: k, label: `${MES_LABELS[m]} ${y}` }
  })
})

const mesesFinalDisponiveis = computed(() =>
  mesesDisponiveis.value.filter(m => m.value >= mesInicial.value)
)

watch(mesesDisponiveis, (available) => {
  if (!available.length) return
  const vals = available.map(m => m.value)
  if (!mesInicial.value || !vals.includes(mesInicial.value)) mesInicial.value = vals[vals.length - 1]
  if (!mesFinal.value || !vals.includes(mesFinal.value)) mesFinal.value = vals[0]
}, { immediate: true })

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
})

// Sync ao trocar de modo (igual GTM Motion)
watch(periodMode, (mode) => {
  if (mode === 'quarter') {
    if (!mesInicial.value) return
    const [y, m] = mesInicial.value.split('-').map(Number)
    if (isNaN(y) || isNaN(m)) return
    const q = Math.ceil(m / 3)
    selectedQuarter.value = `${y}-Q${q}`
    compQuarter.value = getPreviousQuarter(selectedQuarter.value)
  } else {
    const [year, qNum] = [parseInt(selectedQuarter.value.split('-Q')[0]), parseInt(selectedQuarter.value.split('-Q')[1])]
    const pad = (n) => String(n).padStart(2, '0')
    const qStart = (qNum - 1) * 3 + 1
    const qEnd = qStart + 2
    mesInicial.value = `${year}-${pad(qStart)}`
    mesFinal.value = `${year}-${pad(qEnd)}`
  }
})

// ── Dados filtrados por período ─────────────────────────────────────────────
const npsFilteredByPeriod = computed(() => {
  if (periodMode.value === 'quarter') {
    const startMonth = quarterStartMonth(selectedQuarter.value)
    const endMonth = quarterEndMonth(selectedQuarter.value)
    return npsData.value.filter(r => {
      const key = parseDataToMonth(r.Data)
      if (!key) return false
      return key >= startMonth && key <= endMonth
    })
  }
  if (!mesInicial.value || !mesFinal.value) return npsData.value
  return npsData.value.filter(r => {
    const key = parseDataToMonth(r.Data)
    if (!key) return false
    return key >= mesInicial.value && key <= mesFinal.value
  })
})

// ── Dados do período anterior (para comparação) ────────────────────────────
function monthTotal(key) { const [y, m] = key.split('-').map(Number); return y * 12 + m - 1 }
function monthKey(t) { const y = Math.floor(t / 12); const m = (t % 12) + 1; return `${y}-${String(m).padStart(2, '0')}` }

const npsPreviousPeriod = computed(() => {
  if (periodMode.value === 'quarter') {
    const startMonth = quarterStartMonth(compQuarter.value)
    const endMonth = quarterEndMonth(compQuarter.value)
    return npsData.value.filter(r => {
      const key = parseDataToMonth(r.Data)
      if (!key) return false
      return key >= startMonth && key <= endMonth
    })
  }
  if (!mesInicial.value || !mesFinal.value) return []
  const startT = monthTotal(mesInicial.value)
  const endT = monthTotal(mesFinal.value)
  const duration = endT - startT + 1
  const prevStart = monthKey(startT - duration)
  const prevEnd = monthKey(endT - duration)
  return npsData.value.filter(r => {
    const key = parseDataToMonth(r.Data)
    if (!key) return false
    return key >= prevStart && key <= prevEnd
  })
})

const compPeriodLabel = computed(() => {
  if (periodMode.value === 'quarter') return compQuarter.value
  if (!mesInicial.value || !mesFinal.value) return ''
  const startT = monthTotal(mesInicial.value)
  const endT = monthTotal(mesFinal.value)
  const duration = endT - startT + 1
  const ps = monthKey(startT - duration)
  const pe = monthKey(endT - duration)
  const toLabel = (k) => { const [y, m] = k.split('-'); return `${MES_LABELS[m]} ${y}` }
  return duration === 1 ? toLabel(ps) : `${toLabel(ps)} — ${toLabel(pe)}`
})

// Options dinâmicos para filtros
const tierOptions = computed(() => {
  const set = new Set()
  for (const r of npsFilteredByPeriod.value) if (r.Tier) set.add(r.Tier)
  return TIER_ORDER.filter(t => set.has(t))
})

const coordOptions = computed(() => {
  const set = new Set()
  for (const r of npsFilteredByPeriod.value) {
    if (r.coordenador && r.coordenador !== '-') set.add(r.coordenador)
  }
  return [...set].sort()
})

const categoriaOptions = computed(() => {
  const set = new Set()
  for (const r of npsFilteredByPeriod.value) {
    const v = r.Categoria || r.categoria
    if (v && v !== '-') set.add(v)
  }
  return [...set].sort()
})

const tipoOptions = computed(() => {
  const set = new Set()
  for (const r of npsFilteredByPeriod.value) {
    const v = r.Tipo || r.tipo
    if (v && v !== '-') set.add(v)
  }
  return [...set].sort()
})

const modeloOptions = computed(() => {
  const set = new Set()
  for (const r of npsFilteredByPeriod.value) {
    const v = r['Modelo de Vendas'] || r.Modelo_de_Vendas || r.modelo_de_vendas
    if (v && v !== '-') set.add(v)
  }
  return [...set].sort()
})

// Options no formato do VSelect (com "Todos" no topo)
const TODOS_OPT = { value: 'todos', label: 'Todos' }
const tierSelectOptions = computed(() => [TODOS_OPT, ...tierOptions.value.map(v => ({ value: v, label: v }))])
const coordSelectOptions = computed(() => [TODOS_OPT, ...coordOptions.value.map(v => ({ value: v, label: v }))])
const categoriaSelectOptions = computed(() => [TODOS_OPT, ...categoriaOptions.value.map(v => ({ value: v, label: v }))])
const tipoSelectOptions = computed(() => [TODOS_OPT, ...tipoOptions.value.map(v => ({ value: v, label: v }))])
const modeloSelectOptions = computed(() => [TODOS_OPT, ...modeloOptions.value.map(v => ({ value: v, label: v }))])
const ltGroupSelectOptions = [
  TODOS_OPT,
  { value: '0-3', label: '0 a 3 meses' },
  { value: '3-6', label: '3 a 6 meses' },
  { value: '6-9', label: '6 a 9 meses' },
  { value: '9-12', label: '9 a 12 meses' },
  { value: '12+', label: '12+ meses' }
]

const confirmMessage = computed(() => {
  const base = 'A atualização pode levar alguns minutos.'
  return `${base}\n\nDeseja continuar?`
})

async function handleRefresh() {
  try {
    const statusRes = await fetch('/api/update-status/nps-satisfacao')
    const statusData = await statusRes.json()
    if (statusData.updating) {
      showUpdatingModal.value = true
      return
    }
  } catch { /* proceed */ }
  showConfirmModal.value = true
}

async function confirmRefresh() {
  showConfirmModal.value = false
  refreshing.value = true
  try {
    const res = await fetch('/api/nps-satisfacao/trigger-update')
    if (!res.ok && res.status === 409) {
      refreshing.value = false
      showUpdatingModal.value = true
      return
    }
  } catch (err) {
    console.warn('[NPS] Webhook error:', err.message)
  }
  refreshing.value = false
  await fetchData(true)
  lastUpdateTime.value = formatTimestamp()
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(async () => {
  await fetchData()
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})

// Atualizar timestamp quando dados carregam
watch(data, (newData) => {
  if (newData && !loading.value) {
    lastUpdateTime.value = formatTimestamp()
  }
})
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────────────────── */
.header-title { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.title-sep { font-size: 20px; color: #333; font-weight: 300; }
.main-subtitle { font-size: 18px; font-weight: 400; color: #888; margin: 0; }

.sticky-header-wrap {
  position: sticky; top: -1px; z-index: 20;
  background: #0d0d0d; padding: 14px 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: visible;
}
.sticky-header-wrap .main-header {
  margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  gap: 8px;
}

/* ── Last update ────────────────────────────────────────────────────────── */
.last-update { font-size: 13px; color: #666; white-space: nowrap; }

/* ── Period selector ─────────────────────────────────────────────────────── */
.period-range { display: inline-flex; align-items: center; gap: 8px; background: #1a1a1a; border: 1px solid #222; border-radius: 6px; padding: 8px 14px; }
.period-sep { font-size: 12px; color: #555; }
.month-select {
  background: transparent; border: none; color: #ccc; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; outline: none;
  padding: 6px 18px 6px 4px; appearance: none; -webkit-appearance: none;
  text-transform: uppercase; letter-spacing: 0.5px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 2px center;
}
.month-select option { background: #1a1a1a; color: #ccc; font-family: 'Ubuntu', sans-serif; font-size: 13px; }

/* ── Filters Bar ─────────────────────────────────────────────────────────── */
.filters-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }

/* ── Filters ─────────────────────────────────────────────────────────────── */
.filter-group { display: flex; align-items: center; gap: 8px; background: #1a1a1a; border: 1px solid #222; border-radius: 6px; padding: 8px 14px; min-width: 160px; max-width: 300px; }
.filter-label { font-size: 12px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
.filter-select {
  flex: 1; min-width: 0; background: transparent; border: none; color: #ccc; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; outline: none;
  padding: 6px 18px 6px 4px; appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 2px center;
}
.filter-select option { background: #1a1a1a; color: #ccc; }
</style>
