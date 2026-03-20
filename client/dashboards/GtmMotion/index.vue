<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="main-header">
      <div class="header-title">
        <h1 class="main-title">Produção Comercial</h1>
        <span class="title-sep">|</span>
        <h2 class="main-subtitle">GTM Motion</h2>
      </div>
      <div class="main-actions">
        <span v-if="lastUpdateTime" class="last-update">
          Última atualização: {{ lastUpdateTime }}
        </span>
        <div class="period-range">
          <select class="month-select" v-model="mesInicial">
            <option v-for="m in MESES" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="period-sep">até</span>
          <select class="month-select" v-model="mesFinal">
            <option v-for="m in mesesFinalDisponiveis" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <VRefreshButton :loading="loading" @click="handleRefresh" />
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error && !resolvedData" class="error-message">
      <i data-lucide="alert-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">Canal</label>
        <select class="filter-select" v-model="selectedChannel">
          <option value="consolidado">Consolidado</option>
          <option v-for="canal in channelOptions" :key="canal.id" :value="canal.id">
            {{ canal.label }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Closer</label>
        <select class="filter-select" v-model="selectedCloser">
          <option value="todos">Todos</option>
          <option v-for="c in closerOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">SDR</label>
        <select class="filter-select" v-model="selectedSdr">
          <option value="todos">Todos</option>
          <option v-for="s in sdrOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <GtmScorecard
        label="Leads"
        :value="kpis.leads?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.leads?.provisionado ?? null"
        :meta="kpis.leads?.meta ?? null"
        :delta="kpis.leads?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="MQL"
        :value="kpis.mql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.mql?.provisionado ?? null"
        :meta="kpis.mql?.meta ?? null"
        :delta="kpis.mql?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="SQL"
        :value="kpis.sql?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sql?.provisionado ?? null"
        :meta="kpis.sql?.meta ?? null"
        :delta="kpis.sql?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="SAL"
        :value="kpis.sal?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.sal?.provisionado ?? null"
        :meta="kpis.sal?.meta ?? null"
        :delta="kpis.sal?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Commit"
        :value="kpis.commit?.value ?? null"
        :formatter="formatNumber"
        :provisionado="kpis.commit?.provisionado ?? null"
        :meta="kpis.commit?.meta ?? null"
        :delta="kpis.commit?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Avg Ticket"
        :value="kpis.avgTicket?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.avgTicket?.provisionado ?? null"
        :meta="kpis.avgTicket?.meta ?? null"
        :delta="kpis.avgTicket?.delta ?? null"
        :loading="loading"
      />
      <GtmScorecard
        label="Booking"
        :value="kpis.booking?.value ?? null"
        :formatter="formatCurrencyAbbrev"
        :provisionado="kpis.booking?.provisionado ?? null"
        :meta="kpis.booking?.meta ?? null"
        :delta="kpis.booking?.delta ?? null"
        :loading="loading"
      />
    </div>

    <!-- Funnel Table -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">{{ tableTitle }}</h3>
      </div>
      <GtmFunnelTable :tiers="currentTiers" :loading="loading" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useDashboardData } from '../../composables/useDashboardData.js'
import { formatNumber, formatCurrencyAbbrev, formatDateTime } from '../../composables/useFormatters.js'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import GtmScorecard from './components/GtmScorecard.vue'
import GtmFunnelTable from './components/GtmFunnelTable.vue'
import { MOCK_DATA, CANAIS, MESES } from './mock-data.js'

const { data, loading, error, fetchData } = useDashboardData('gtm-motion')

// ── Month range ───────────────────────────────────────────────────────────────
function getCurrentQuarterRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const qStart = Math.floor((month - 1) / 3) * 3 + 1
  const qEnd = qStart + 2
  const pad = (n) => String(n).padStart(2, '0')
  const start = `${year}-${pad(qStart)}`
  const end = `${year}-${pad(qEnd)}`
  const vals = MESES.map((m) => m.value)
  return {
    start: vals.includes(start) ? start : (vals.find((v) => v >= start) ?? vals[0]),
    end:   vals.includes(end)   ? end   : ([...vals].reverse().find((v) => v <= end) ?? vals[vals.length - 1]),
  }
}

const { start: defaultStart, end: defaultEnd } = getCurrentQuarterRange()
const mesInicial = ref(defaultStart)
const mesFinal   = ref(defaultEnd)

const mesesFinalDisponiveis = computed(() =>
  MESES.filter((m) => m.value >= mesInicial.value)
)

watch(mesInicial, (val) => {
  if (mesFinal.value < val) mesFinal.value = val
})

const fetchAllData = (forceRefresh = false) => fetchData(forceRefresh)

// ── Filters ──────────────────────────────────────────────────────────────────
const selectedChannel = ref('consolidado')
const selectedCloser  = ref('todos')
const selectedSdr     = ref('todos')
const ALL_CHANNEL_IDS = CANAIS.map((c) => c.id)

const isConsolidado = computed(() => selectedChannel.value === 'consolidado')

// ── Data ──────────────────────────────────────────────────────────────────────
const TIER_ORDER = ['Tiny', 'Small', 'Medium', 'Large', 'Enterprise', 'Sem mapeamento', 'Total']
const toNum = (v) => (v === '' || v == null) ? null : Number(v)

function transformApiData(rawData, mesIni, mesFim, closer, sdr) {
  // API retorna { data: { kpis, funil } } ou [{ data: { kpis, funil } }]
  const source = Array.isArray(rawData) ? rawData[0]?.data : rawData?.data
  if (!source) return null

  let rawKpis = (source.kpis ?? []).filter((r) => r.mes >= mesIni && r.mes <= mesFim)
  let rawFunil = (source.funil ?? []).filter((r) => r.mes >= mesIni && r.mes <= mesFim)

  // Filter by closer if selected (case-insensitive)
  if (closer && closer !== 'todos') {
    const cl = closer.toLowerCase()
    rawKpis = rawKpis.filter((r) => r.closer?.toLowerCase() === cl)
    rawFunil = rawFunil.filter((r) => r.closer?.toLowerCase() === cl)
  }
  if (sdr && sdr !== 'todos') {
    const sd = sdr.toLowerCase()
    rawKpis = rawKpis.filter((r) => r.sdr?.toLowerCase() === sd)
    rawFunil = rawFunil.filter((r) => r.sdr?.toLowerCase() === sd)
  }
  const CANAL_LABEL = Object.fromEntries(CANAIS.map((c) => [c.id, c.label]))
  const CANAL_LABEL_TO_ID = Object.fromEntries(
    CANAIS.map(c => [c.label.toLowerCase(), c.id])
  )
  const normalizeCanal = (name) => CANAL_LABEL_TO_ID[name.toLowerCase()] ?? name

  // Group KPIs by canal, summing across months
  const kpisByCanal = {}
  for (const row of rawKpis) {
    const canal = normalizeCanal(row.canal)
    if (!kpisByCanal[canal]) {
      kpisByCanal[canal] = {
        leads_value: 0, leads_provisionado: null, leads_meta: 0,
        mql_value: 0,   mql_provisionado: null,   mql_meta: 0,
        sql_value: 0,   sql_meta: 0,
        sal_value: 0,   sal_meta: 0,
        commit_value: 0, commit_meta: 0,
        booking_value: 0, booking_meta: 0,
      }
    }
    const acc = kpisByCanal[canal]
    acc.leads_value += toNum(row.leads_value) ?? 0
    const lp = toNum(row.leads_provisionado)
    if (lp != null) acc.leads_provisionado = (acc.leads_provisionado ?? 0) + lp
    acc.leads_meta += toNum(row.leads_meta) ?? 0
    acc.mql_value += toNum(row.mql_value) ?? 0
    const mp = toNum(row.mql_provisionado)
    if (mp != null) acc.mql_provisionado = (acc.mql_provisionado ?? 0) + mp
    acc.mql_meta += toNum(row.mql_meta) ?? 0
    acc.sql_value += toNum(row.sql_value) ?? 0
    acc.sql_meta  += toNum(row.sql_meta)  ?? 0
    acc.sal_value += toNum(row.sal_value) ?? 0
    acc.sal_meta  += toNum(row.sal_meta)  ?? 0
    acc.commit_value  += toNum(row.commit_value)  ?? 0
    acc.commit_meta   += toNum(row.commit_meta)   ?? 0
    acc.booking_value += toNum(row.booking_value) ?? 0
    acc.booking_meta  += toNum(row.booking_meta)  ?? 0
  }

  // Check if funil has tier-level data (field "tier" present in rows)
  const hasTierData = rawFunil.some((r) => r.tier != null)

  // Group Funil by canal + tier (when tier data is available), or by canal only
  const funilByCanal = {}
  for (const row of rawFunil) {
    const canal = normalizeCanal(row.canal)
    if (!funilByCanal[canal]) funilByCanal[canal] = {}

    if (hasTierData) {
      // Funil sheet uses: tier, subcategoria, leads, mql, sql, sal, commit, booking, is_empty_row, is_total
      const tier      = row.tier ?? 'Sem mapeamento'
      const sub       = row.subcategoria ?? null
      const isEmpty   = !!(row.is_empty_row || row.isEmptyRow)
      const isTotalRow = !!(row.is_total || row.isTotal)
      if (!funilByCanal[canal][tier]) {
        funilByCanal[canal][tier] = {
          leads_value: 0, mql_value: 0, sql_value: 0,
          sal_value: 0, commit_value: 0, booking_value: 0,
          isEmptyRow: isEmpty,
          isTotal: isTotalRow,
          subCategories: {},
        }
      }
      const acc = funilByCanal[canal][tier]
      // Field names from Funil sheet: leads, mql, sql, sal, commit, booking
      const fLeads   = toNum(row.leads   ?? row.leads_value)   ?? 0
      const fMql     = toNum(row.mql     ?? row.mql_value)     ?? 0
      const fSql     = toNum(row.sql     ?? row.sql_value)     ?? 0
      const fSal     = toNum(row.sal     ?? row.sal_value)     ?? 0
      const fCommit  = toNum(row.commit  ?? row.commit_value)  ?? 0
      const fBooking = toNum(row.booking ?? row.booking_value) ?? 0
      if (!sub) {
        acc.leads_value   += fLeads
        acc.mql_value     += fMql
        acc.sql_value     += fSql
        acc.sal_value     += fSal
        acc.commit_value  += fCommit
        acc.booking_value += fBooking
      } else {
        if (!acc.subCategories[sub]) {
          acc.subCategories[sub] = { leads: 0, mql: 0, sql: 0, sal: 0, commit: 0, booking: 0 }
        }
        const sa = acc.subCategories[sub]
        sa.leads   += fLeads
        sa.mql     += fMql
        sa.sql     += fSql
        sa.sal     += fSal
        sa.commit  += fCommit
        sa.booking += fBooking
      }
    } else {
      // No tier data: aggregate canal totals
      if (!funilByCanal[canal].__total) {
        funilByCanal[canal].__total = {
          leads_value: 0, mql_value: 0, sql_value: 0,
          sal_value: 0, commit_value: 0, booking_value: 0,
        }
      }
      const acc = funilByCanal[canal].__total
      acc.leads_value   += toNum(row.leads_value)   ?? 0
      acc.mql_value     += toNum(row.mql_value)     ?? 0
      acc.sql_value     += toNum(row.sql_value)     ?? 0
      acc.sal_value     += toNum(row.sal_value)     ?? 0
      acc.commit_value  += toNum(row.commit_value)  ?? 0
      acc.booking_value += toNum(row.booking_value) ?? 0
    }
  }

  // Build channels map
  const channels = {}
  const allCanals = new Set([...Object.keys(kpisByCanal), ...Object.keys(funilByCanal)])

  for (const canal of allCanals) {
    const k = kpisByCanal[canal] ?? {}

    const commitVal   = k.commit_value  ?? 0
    const commitMeta  = k.commit_meta   ?? 0
    const bookingVal  = k.booking_value ?? 0
    const bookingMeta = k.booking_meta  ?? 0

    const kpis = {
      leads:   { value: k.leads_value ?? 0, provisionado: k.leads_provisionado, meta: k.leads_meta ?? 0, delta: null },
      mql:     { value: k.mql_value   ?? 0, provisionado: k.mql_provisionado,   meta: k.mql_meta   ?? 0, delta: null },
      sql:     { value: k.sql_value   ?? 0, provisionado: null, meta: k.sql_meta   ?? 0, delta: null },
      sal:     { value: k.sal_value   ?? 0, provisionado: null, meta: k.sal_meta   ?? 0, delta: null },
      commit:  { value: commitVal,          provisionado: null, meta: commitMeta,         delta: null },
      avgTicket: {
        value:        commitVal  > 0 ? Math.round(bookingVal  / commitVal)  : null,
        provisionado: null,
        meta:         commitMeta > 0 ? Math.round(bookingMeta / commitMeta) : null,
        delta: null,
      },
      booking: { value: bookingVal, provisionado: null, meta: bookingMeta, delta: null },
    }

    let tiers
    const canalFunil = funilByCanal[canal] ?? {}

    if (hasTierData) {
      // Build tier rows in order, skipping Total (recalculated)
      tiers = []
      let totLeads = 0, totMql = 0, totSql = 0, totSal = 0, totCommit = 0, totBooking = 0

      for (const tierName of TIER_ORDER) {
        if (tierName === 'Total') continue
        const t = canalFunil[tierName]
        if (!t) continue

        if (t.isEmptyRow) {
          tiers.push({ tier: tierName, leads: t.leads_value, isEmptyRow: true })
          totLeads += t.leads_value
          continue
        }

        const fl  = t.leads_value
        const fm  = t.mql_value
        const fs  = t.sql_value
        const fsal = t.sal_value
        const fc  = t.commit_value
        const fb  = t.booking_value

        const cr1v = fl   > 0 ? (fm  / fl)   * 100 : 0
        const cr2v = fm   > 0 ? (fs  / fm)   * 100 : 0
        const cr3v = fs   > 0 ? (fsal / fs)  * 100 : 0
        const cr4v = fsal > 0 ? (fc  / fsal) * 100 : 0
        const mwv  = fm   > 0 ? (fc  / fm)   * 100 : 0

        const subCategories = Object.entries(t.subCategories).map(([name, s]) => ({
          name, leads: s.leads, mql: s.mql, sql: s.sql,
          sal: s.sal, commit: s.commit, booking: s.booking,
        }))

        tiers.push({
          tier: tierName,
          leads: fl, mql: fm, sql: fs, sal: fsal, commit: fc, booking: fb,
          avgTicket: fc > 0 ? Math.round(fb / fc) : 0,
          cr1:    { val: cr1v, color: crColor(cr1v, 70, 50) },
          cr2:    { val: cr2v, color: crColor(cr2v, 25, 15) },
          cr3:    { val: cr3v, color: crColor(cr3v, 80, 65) },
          cr4:    { val: cr4v, color: crColor(cr4v, 20, 12) },
          mqlWon: { val: mwv,  color: crColor(mwv,  5,  3)  },
          subCategories,
        })

        totLeads   += fl;   totMql    += fm;   totSql  += fs
        totSal     += fsal; totCommit += fc;   totBooking += fb
      }

      // Add Total row
      const tcr1 = totLeads   > 0 ? (totMql    / totLeads)   * 100 : 0
      const tcr2 = totMql     > 0 ? (totSql    / totMql)     * 100 : 0
      const tcr3 = totSql     > 0 ? (totSal    / totSql)     * 100 : 0
      const tcr4 = totSal     > 0 ? (totCommit / totSal)     * 100 : 0
      const tmw  = totMql     > 0 ? (totCommit / totMql)     * 100 : 0
      tiers.push({
        tier: 'Total',
        leads: totLeads, mql: totMql, sql: totSql, sal: totSal,
        commit: totCommit, booking: totBooking,
        avgTicket: totCommit > 0 ? Math.round(totBooking / totCommit) : 0,
        cr1:    { val: tcr1, color: crColor(tcr1, 70, 50) },
        cr2:    { val: tcr2, color: crColor(tcr2, 25, 15) },
        cr3:    { val: tcr3, color: crColor(tcr3, 80, 65) },
        cr4:    { val: tcr4, color: crColor(tcr4, 20, 12) },
        mqlWon: { val: tmw,  color: crColor(tmw,  5,  3)  },
        isTotal: true,
      })
    } else {
      // No tier data: one aggregated row per canal (canal label as tier name)
      const f = canalFunil.__total ?? {}
      const fl  = f.leads_value   ?? 0
      const fm  = f.mql_value     ?? 0
      const fs  = f.sql_value     ?? 0
      const fsal = f.sal_value    ?? 0
      const fc  = f.commit_value  ?? 0
      const fb  = f.booking_value ?? 0

      const cr1v = fl   > 0 ? (fm  / fl)   * 100 : 0
      const cr2v = fm   > 0 ? (fs  / fm)   * 100 : 0
      const cr3v = fs   > 0 ? (fsal / fs)  * 100 : 0
      const cr4v = fsal > 0 ? (fc  / fsal) * 100 : 0
      const mwv  = fm   > 0 ? (fc  / fm)   * 100 : 0

      tiers = [{
        tier:      CANAL_LABEL[canal] ?? canal,
        leads: fl, mql: fm, sql: fs, sal: fsal, commit: fc, booking: fb,
        avgTicket: fc > 0 ? Math.round(fb / fc) : 0,
        cr1:    { val: cr1v, color: crColor(cr1v, 70, 50) },
        cr2:    { val: cr2v, color: crColor(cr2v, 25, 15) },
        cr3:    { val: cr3v, color: crColor(cr3v, 80, 65) },
        cr4:    { val: cr4v, color: crColor(cr4v, 20, 12) },
        mqlWon: { val: mwv,  color: crColor(mwv,  5,  3)  },
        isTotal: true,
      }]
    }

    channels[canal] = { kpis, tiers }
  }

  return { channels }
}

const useMockData = computed(() => {
  const params = new URLSearchParams(window.location.search)
  return params.has('mock-data')
})

// Extract unique closer values from raw API data (case-insensitive dedup)
const closerOptions = computed(() => {
  const raw = data.value
  if (!raw) return []
  const source = Array.isArray(raw) ? raw[0]?.data : raw?.data
  if (!source) return []
  const closers = new Map()
  for (const row of (source.kpis ?? [])) {
    if (row.closer) {
      const key = row.closer.trim().toLowerCase()
      if (!closers.has(key)) closers.set(key, row.closer.trim())
    }
  }
  for (const row of (source.funil ?? [])) {
    if (row.closer) {
      const key = row.closer.trim().toLowerCase()
      if (!closers.has(key)) closers.set(key, row.closer.trim())
    }
  }
  return [...closers.values()].sort()
})

const sdrOptions = computed(() => {
  const raw = data.value
  if (!raw) return []
  const source = Array.isArray(raw) ? raw[0]?.data : raw?.data
  if (!source) return []
  const sdrs = new Map()
  for (const row of [...(source.kpis ?? []), ...(source.funil ?? [])]) {
    if (row.sdr) {
      const key = row.sdr.trim().toLowerCase()
      if (!sdrs.has(key)) sdrs.set(key, row.sdr.trim())
    }
  }
  return [...sdrs.values()].sort()
})

const resolvedData = computed(() => {
  if (useMockData.value) return MOCK_DATA
  if (data.value) return transformApiData(data.value, mesInicial.value, mesFinal.value, selectedCloser.value, selectedSdr.value)
  return null
})

// Build channel dropdown options dynamically (includes API channels not in CANAIS)
const channelOptions = computed(() => {
  const source = resolvedData.value
  if (!source?.channels) return CANAIS
  const known = new Set(CANAIS.map(c => c.id))
  const extras = Object.keys(source.channels)
    .filter(id => !known.has(id))
    .map(id => ({ id, label: id }))
  return [...CANAIS, ...extras]
})

const activeChannelIds = computed(() => {
  if (!isConsolidado.value) return [selectedChannel.value]
  const source = resolvedData.value
  return source?.channels ? Object.keys(source.channels) : ALL_CHANNEL_IDS
})

function crColor(val, green, yellow) {
  return val >= green ? 'green' : val >= yellow ? 'yellow' : 'red'
}

// Aggregate KPIs from active channels
const kpis = computed(() => {
  const source = resolvedData.value
  if (!source) return {}
  const sum = {}
  for (const channelId of activeChannelIds.value) {
    const chKpis = source.channels?.[channelId]?.kpis ?? {}
    for (const [key, kpi] of Object.entries(chKpis)) {
      if (key === 'avgTicket') continue // derived from booking/commit
      if (!sum[key]) sum[key] = { value: 0, provisionado: null, meta: null, delta: null }
      sum[key].value += kpi.value ?? 0
      if (kpi.provisionado != null) sum[key].provisionado = (sum[key].provisionado ?? 0) + kpi.provisionado
      if (kpi.meta       != null) sum[key].meta          = (sum[key].meta       ?? 0) + kpi.meta
    }
  }
  // avgTicket = booking / commit (weighted average)
  const commitVal  = sum.commit?.value ?? 0
  const commitMeta = sum.commit?.meta  ?? 0
  const bookingVal = sum.booking?.value ?? 0
  const bookingMeta = sum.booking?.meta ?? 0
  sum.avgTicket = {
    value:       commitVal  > 0 ? Math.round(bookingVal  / commitVal)  : null,
    provisionado: null,
    meta:        commitMeta > 0 ? Math.round(bookingMeta / commitMeta) : null,
    delta: null,
  }
  return sum
})

// Aggregate tiers from active channels
const currentTiers = computed(() => {
  const source = resolvedData.value
  if (!source) return []
  const tierMap   = {}
  for (const channelId of activeChannelIds.value) {
    const tiers = source.channels?.[channelId]?.tiers ?? []
    for (const row of tiers) {
      if (!tierMap[row.tier]) {
        tierMap[row.tier] = { ...row }
      } else {
        const ex = tierMap[row.tier]
        if (row.isEmptyRow) {
          ex.leads = (ex.leads ?? 0) + (row.leads ?? 0)
          continue
        }
        ex.leads   = (ex.leads   ?? 0) + (row.leads   ?? 0)
        ex.mql     = (ex.mql     ?? 0) + (row.mql     ?? 0)
        ex.sql     = (ex.sql     ?? 0) + (row.sql     ?? 0)
        ex.sal     = (ex.sal     ?? 0) + (row.sal     ?? 0)
        ex.commit  = (ex.commit  ?? 0) + (row.commit  ?? 0)
        ex.booking = (ex.booking ?? 0) + (row.booking ?? 0)
        ex.avgTicket = ex.commit > 0 ? Math.round(ex.booking / ex.commit) : 0
        const cr1v = ex.leads  > 0 ? (ex.mql    / ex.leads)  * 100 : 0
        const cr2v = ex.mql    > 0 ? (ex.sql    / ex.mql)    * 100 : 0
        const cr3v = ex.sql    > 0 ? (ex.sal    / ex.sql)    * 100 : 0
        const cr4v = ex.sal    > 0 ? (ex.commit / ex.sal)    * 100 : 0
        const mwv  = ex.mql    > 0 ? (ex.commit / ex.mql)    * 100 : 0
        ex.cr1    = { val: cr1v, color: crColor(cr1v, 70, 50) }
        ex.cr2    = { val: cr2v, color: crColor(cr2v, 25, 15) }
        ex.cr3    = { val: cr3v, color: crColor(cr3v, 80, 65) }
        ex.cr4    = { val: cr4v, color: crColor(cr4v, 20, 12) }
        ex.mqlWon = { val: mwv,  color: crColor(mwv,   5,  3) }
        // Merge subCategories by name
        if (row.subCategories?.length > 0) {
          if (!ex.subCategories?.length) {
            ex.subCategories = row.subCategories.map(s => ({ ...s }))
          } else {
            for (const sub of row.subCategories) {
              const exSub = ex.subCategories.find(s => s.name === sub.name)
              if (exSub) {
                exSub.leads   = (exSub.leads   ?? 0) + (sub.leads   ?? 0)
                exSub.mql     = (exSub.mql     ?? 0) + (sub.mql     ?? 0)
                exSub.sql     = (exSub.sql     ?? 0) + (sub.sql     ?? 0)
                exSub.sal     = (exSub.sal     ?? 0) + (sub.sal     ?? 0)
                exSub.commit  = (exSub.commit  ?? 0) + (sub.commit  ?? 0)
                exSub.booking = (exSub.booking ?? 0) + (sub.booking ?? 0)
              } else {
                ex.subCategories.push({ ...sub })
              }
            }
          }
        }
      }
    }
  }
  return TIER_ORDER.filter(name => tierMap[name]).map(name => tierMap[name])
})

const tableTitle = computed(() => {
  if (isConsolidado.value) return 'Consolidado — Todos os Canais'
  return CANAIS.find((c) => c.id === selectedChannel.value)?.label ?? selectedChannel.value
})

const lastUpdateTime = ref(null)

async function handleRefresh() {
  await fetchAllData(true)
  lastUpdateTime.value = formatDateTime(new Date().toISOString())
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
}

onMounted(async () => {
  await fetchAllData()
  lastUpdateTime.value = formatDateTime(new Date().toISOString())
  await nextTick()
  if (window.lucide) window.lucide.createIcons()
})
</script>

<style scoped>
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

/* Period range */
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

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
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
  min-width: 160px;
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
  flex: 1;
  min-width: 0;
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
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 2px center;
}

.filter-select option,
.month-select option {
  background: #1a1a1a;
  color: #ccc;
  font-family: 'Ubuntu', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  font-weight: 400;
  padding: 8px 12px;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Table section */
.table-section {
  background: #141414;
  border: 1px solid #222;
  border-radius: 6px;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
</style>
