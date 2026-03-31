<template>
  <div class="section-card">
    <!-- Header -->
    <div class="section-header">
      <i data-lucide="list" class="section-icon"></i>
      <h3 class="section-title">Listagem de Prospects</h3>
      <span v-if="!loading && rows.length" class="row-badge">{{ rows.length }} prospects</span>
    </div>

    <!-- Controls -->
    <div class="table-controls">
      <div class="search-wrapper">
        <i data-lucide="search" class="search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome..."
          class="search-input"
        />
      </div>
      <div class="page-size-wrapper">
        <label class="page-size-label">Linhas por página:</label>
        <select v-model="pageSize" class="page-size-select">
          <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="mv-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="['sortable-th', col.key === 'nome' ? 'col-nome' : '']"
              @click="handleSort(col.key)"
            >
              <span class="th-inner">
                {{ col.label }}
                <span class="sort-icon">
                  <template v-if="sortKey === col.key">
                    <i :data-lucide="sortDir === 'asc' ? 'chevron-up' : 'chevron-down'" class="sort-chevron active"></i>
                  </template>
                  <template v-else>
                    <i data-lucide="chevrons-up-down" class="sort-chevron"></i>
                  </template>
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="i in pageSize" :key="i" class="skeleton-row">
              <td v-for="j in columns.length" :key="j"><span class="skeleton-bar"></span></td>
            </tr>
          </template>

          <!-- Empty state -->
          <template v-else-if="filteredRows.length === 0">
            <tr>
              <td :colspan="columns.length" class="empty-state">
                <i data-lucide="inbox"></i>
                <span>{{ searchQuery ? 'Nenhum prospect encontrado para a busca.' : 'Nenhum prospect disponível.' }}</span>
              </td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr v-for="(row, idx) in paginatedRows" :key="idx" class="data-row">
              <td class="col-nome-cell">{{ row.nome }}</td>
              <td>{{ formatDate(row.data_criacao) }}</td>
              <td>
                <span class="tier-badge" :class="`tier-${tierClass(row.tier)}`">{{ row.tier }}</span>
              </td>
              <td>{{ row.categoria_step }}</td>
              <td>{{ row.canal_origem }}</td>
              <td>
                <span class="etapa-badge">{{ row.etapa }}</span>
              </td>
              <td class="col-link">
                <a
                  v-if="row.link_kommo"
                  :href="row.link_kommo"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="kommo-link"
                >
                  <i data-lucide="external-link" class="link-icon"></i>
                  Abrir
                </a>
                <span v-else class="no-link">—</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="pagination">
      <button @click="currentPage = 1" :disabled="currentPage === 1" class="page-btn" title="Primeira página">
        <i data-lucide="chevrons-left"></i>
      </button>
      <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn" title="Página anterior">
        <i data-lucide="chevron-left"></i>
      </button>
      <span class="page-info">
        Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong>
      </span>
      <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn" title="Próxima página">
        <i data-lucide="chevron-right"></i>
      </button>
      <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" class="page-btn" title="Última página">
        <i data-lucide="chevrons-right"></i>
      </button>
      <span class="pagination-summary">
        {{ rangeStart }}–{{ rangeEnd }} de {{ filteredRows.length }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const PAGE_SIZES = [10, 25, 50, 100]

const columns = [
  { key: 'nome',          label: 'Nome' },
  { key: 'data_criacao',  label: 'Data de Criação' },
  { key: 'tier',          label: 'Tier' },
  { key: 'categoria_step', label: 'Categoria / Step' },
  { key: 'canal_origem',  label: 'Canal de Origem' },
  { key: 'etapa',         label: 'Etapa' },
  { key: 'link_kommo',    label: 'Kommo' },
]

const searchQuery = ref('')
const pageSize    = ref(10)
const currentPage = ref(1)
const sortKey     = ref('data_criacao')
const sortDir     = ref('desc')

function handleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

function parseDateBR(val) {
  if (!val) return null
  // DD/MM/YYYY format from raw data
  const match = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  // ISO or other parseable format
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(val) {
  if (!val) return '—'
  // If already in DD/MM/YYYY, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(val))) return val
  const d = parseDateBR(val)
  if (!d) return val
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function tierClass(tier) {
  const t = (tier || '').toLowerCase()
  if (t === 'enterprise') return 'enterprise'
  if (t === 'large')      return 'large'
  if (t === 'medium')     return 'medium'
  if (t === 'small')      return 'small'
  if (t === 'tiny')       return 'tiny'
  return 'default'
}

const filteredRows = computed(() => {
  let rows = [...props.rows]

  // Search filter (by nome only)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    rows = rows.filter(r => (r.nome || '').toLowerCase().includes(q))
  }

  // Sort
  if (sortKey.value) {
    const key = sortKey.value
    const dir = sortDir.value === 'asc' ? 1 : -1

    rows.sort((a, b) => {
      // Date column: sort by timestamp (parse DD/MM/YYYY correctly)
      if (key === 'data_criacao') {
        const at = (parseDateBR(a[key]) || new Date(0)).getTime()
        const bt = (parseDateBR(b[key]) || new Date(0)).getTime()
        return (at - bt) * dir
      }
      // Default: case-insensitive string comparison
      const av = (a[key] ?? '').toString().toLowerCase()
      const bv = (b[key] ?? '').toString().toLowerCase()
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }

  return rows
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)))
const rangeStart = computed(() => filteredRows.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1)
const rangeEnd   = computed(() => Math.min(currentPage.value * pageSize.value, filteredRows.value.length))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

// Reset to page 1 when search or page size changes
watch([searchQuery, pageSize], () => { currentPage.value = 1 })

async function initIcons() {
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(initIcons)
watch(() => props.rows, initIcons)
watch(() => props.loading, (val) => { if (!val) initIcons() })
</script>

<style scoped>
.section-card {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
}

/* ── Header ── */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #2a2a2a;
  position: relative;
}

.section-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #ff0000;
}

.section-icon {
  width: 16px;
  height: 16px;
  color: #888;
  stroke-width: 1.5;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.row-badge {
  margin-left: auto;
  font-size: 11px;
  color: #666;
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 2px 8px;
}

/* ── Controls ── */
.table-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #1f1f1f;
  flex-wrap: wrap;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #555;
  stroke-width: 2;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  font-family: inherit;
  padding: 6px 10px 6px 32px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.search-input::placeholder { color: #444; }
.search-input:focus { border-color: #444; }

.page-size-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.page-size-label {
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}

.page-size-select {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 8px;
  outline: none;
  cursor: pointer;
}

.page-size-select:focus { border-color: #444; }

/* ── Table ── */
.table-wrapper { overflow-x: auto; }

.mv-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.sortable-th {
  padding: 10px 14px;
  color: #666;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2a2a2a;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}

.sortable-th:hover { color: #999; }

.th-inner {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sort-chevron {
  width: 12px;
  height: 12px;
  stroke-width: 2;
  color: #444;
  flex-shrink: 0;
}

.sort-chevron.active { color: #ff0000; }

.mv-table tbody td {
  padding: 10px 14px;
  color: #ccc;
  font-size: 12px;
  border-bottom: 1px solid #1f1f1f;
  text-align: left;
}

.mv-table tbody tr:last-child td { border-bottom: none; }

.mv-table tbody tr.data-row:hover td { background: #1a1a1a; }

/* ── Name col ── */
.col-nome { min-width: 180px; }
.col-nome-cell { color: #fff !important; font-weight: 500; }

/* ── Link col ── */
.col-link { text-align: center !important; }

.kommo-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #ff0000;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition: opacity 0.15s;
}

.kommo-link:hover { opacity: 0.75; }

.link-icon {
  width: 12px;
  height: 12px;
  stroke-width: 2;
}

.no-link { color: #444; }

/* ── Tier badge ── */
.tier-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 2px 7px;
  border-radius: 3px;
  text-transform: uppercase;
}

.tier-enterprise { background: rgba(168,85,247,0.15); color: #a855f7; }
.tier-large      { background: rgba(59,130,246,0.12); color: #60a5fa; }
.tier-medium     { background: rgba(34,197,94,0.12);  color: #22c55e; }
.tier-small      { background: rgba(234,179,8,0.12);  color: #eab308; }
.tier-tiny       { background: rgba(239,68,68,0.12);  color: #ef4444; }
.tier-default    { background: #2a2a2a; color: #888; }

/* ── Etapa badge ── */
.etapa-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #888;
  background: #1f1f1f;
  border: 1px solid #2a2a2a;
  border-radius: 3px;
  padding: 2px 6px;
}

/* ── Empty state ── */
.empty-state {
  text-align: center !important;
  padding: 32px !important;
  color: #444;
}

.empty-state i {
  width: 20px;
  height: 20px;
  display: block;
  margin: 0 auto 8px;
}

.empty-state span {
  display: block;
  font-size: 12px;
}

/* ── Loading skeleton ── */
.skeleton-row td { opacity: 0.25; }

.skeleton-bar {
  display: inline-block;
  height: 10px;
  width: 80px;
  background: #2a2a2a;
  border-radius: 3px;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-top: 1px solid #1f1f1f;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.page-btn i {
  width: 14px;
  height: 14px;
  stroke-width: 2;
  pointer-events: none;
}

.page-btn:hover:not(:disabled) {
  border-color: #444;
  color: #ccc;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: #666;
  padding: 0 8px;
}

.page-info strong { color: #ccc; }

.pagination-summary {
  margin-left: auto;
  font-size: 11px;
  color: #444;
}
</style>
