<template>
  <div>
    <div class="tab-header">
      <h2 class="tab-title">Atividade dos Usuários</h2>
      <div class="tab-actions">
        <div class="subtabs">
          <button class="subtab" :class="{ active: view === 'overview' }" @click="view = 'overview'">
            <i data-lucide="layout-dashboard"></i> Visão Geral
          </button>
          <button class="subtab" :class="{ active: view === 'users' }" @click="view = 'users'">
            <i data-lucide="users"></i> Por Usuário
          </button>
          <button class="subtab" :class="{ active: view === 'events' }" @click="view = 'events'">
            <i data-lucide="list"></i> Eventos
          </button>
        </div>
        <select v-if="view !== 'events'" v-model.number="days" @change="loadCurrent" class="select">
          <option :value="1">Últimas 24h</option>
          <option :value="7">Últimos 7 dias</option>
          <option :value="14">Últimos 14 dias</option>
          <option :value="30">Últimos 30 dias</option>
          <option :value="90">Últimos 90 dias</option>
        </select>
        <button class="btn-ghost" @click="loadCurrent" :disabled="loading" :title="'Atualizar'">
          <i data-lucide="refresh-cw"></i>
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>

    <!-- VISÃO GERAL -->
    <div v-else-if="view === 'overview'" class="overview">
      <div class="scorecards">
        <div class="sc">
          <div class="sc-label">Usuários Ativos</div>
          <div class="sc-value">{{ summary.active_users || 0 }}</div>
          <div class="sc-sub">nos últimos {{ days }}d</div>
        </div>
        <div class="sc">
          <div class="sc-label">Page Views</div>
          <div class="sc-value">{{ fmt(getTotal('page_view')) }}</div>
        </div>
        <div class="sc">
          <div class="sc-label">Logins</div>
          <div class="sc-value">{{ fmt(getTotal('login')) }}</div>
        </div>
        <div class="sc">
          <div class="sc-label">Login Falhados</div>
          <div class="sc-value" :class="{ warn: getTotal('login_failed') > 0 }">{{ fmt(getTotal('login_failed')) }}</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <i data-lucide="trending-up"></i>
            <span>Top Páginas</span>
          </div>
          <div v-if="summary.top_pages?.length" class="card-body">
            <div v-for="p in summary.top_pages" :key="p.page" class="row">
              <div class="row-main">
                <code class="page-code">{{ p.page }}</code>
                <span class="row-sub">{{ p.unique_users }} usuários</span>
              </div>
              <div class="row-val">{{ fmt(p.views) }}</div>
            </div>
          </div>
          <div v-else class="empty">Nenhum dado no período</div>
        </div>

        <div class="card">
          <div class="card-head">
            <i data-lucide="user-check"></i>
            <span>Usuários Mais Ativos</span>
          </div>
          <div v-if="summary.top_users?.length" class="card-body">
            <div v-for="u in summary.top_users" :key="u.user_id" class="row">
              <div class="row-main">
                <strong class="row-name">{{ u.name || u.email }}</strong>
                <span class="row-sub">{{ u.email }} · {{ u.unique_pages }} páginas</span>
              </div>
              <div class="row-val">{{ fmt(u.views) }}</div>
            </div>
          </div>
          <div v-else class="empty">Nenhum dado no período</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <i data-lucide="calendar"></i>
          <span>Atividade Diária</span>
        </div>
        <div v-if="timeline.length" class="card-body">
          <div class="timeline">
            <div v-for="d in timeline" :key="d.day" class="tl-day">
              <div class="tl-bar-wrap">
                <div class="tl-bar" :style="{ height: barHeight(d.page_views) + '%' }" :title="`${d.page_views} views`"></div>
              </div>
              <div class="tl-label">{{ fmtDay(d.day) }}</div>
              <div class="tl-val">{{ fmt(d.page_views) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty">Sem dados no período</div>
      </div>
    </div>

    <!-- POR USUÁRIO -->
    <div v-else-if="view === 'users'" class="users-view">
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Último Acesso</th>
              <th class="num">Views (7d)</th>
              <th class="num">Logins (30d)</th>
              <th>Status</th>
              <th class="act">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" :class="{ inactive: !u.active }">
              <td>
                <div class="td-user">
                  <strong>{{ u.name }}</strong>
                  <span class="td-email">{{ u.email }}</span>
                </div>
              </td>
              <td><span class="badge" :class="'b-' + u.role">{{ u.role }}</span></td>
              <td :class="{ muted: !u.last_activity }">{{ fmtRelative(u.last_activity) }}</td>
              <td class="num">{{ fmt(u.views_7d) }}</td>
              <td class="num">{{ fmt(u.logins_30d) }}</td>
              <td>
                <span class="dot" :class="u.active ? 'dot-on' : 'dot-off'"></span>
                {{ u.active ? 'Ativo' : 'Inativo' }}
              </td>
              <td class="act">
                <button class="btn-ico" title="Ver eventos" @click="viewUserEvents(u)">
                  <i data-lucide="search"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!users.length">
              <td colspan="7" class="empty">Nenhum usuário</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- EVENTOS -->
    <div v-else-if="view === 'events'" class="events-view">
      <div class="filters">
        <select v-model="eventFilter" @change="loadEvents(0)" class="select">
          <option value="">Todos os eventos</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="login_failed">Login Falhado</option>
          <option value="page_view">Page View</option>
          <option value="page_leave">Page Leave</option>
          <option value="password_change">Alteração de Senha</option>
        </select>
        <input v-model="userIdFilter" @keyup.enter="loadEvents(0)" placeholder="User ID..." class="input" type="number" />
        <button class="btn-sm btn-ghost" @click="loadEvents(0)">Filtrar</button>
        <button v-if="userIdFilter || eventFilter" class="btn-sm btn-ghost" @click="clearFilters">Limpar</button>
      </div>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Evento</th>
              <th>Rota</th>
              <th>IP</th>
              <th class="num">Duração</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td class="nowrap">{{ fmtDateTime(e.created_at) }}</td>
              <td>
                <div class="td-user">
                  <strong v-if="e.user_name">{{ e.user_name }}</strong>
                  <span class="td-email">{{ e.user_email || '—' }}</span>
                </div>
              </td>
              <td><span class="ev-badge" :class="'ev-' + e.event_type">{{ e.event_type }}</span></td>
              <td><code class="page-code">{{ e.dashboard_id || e.path || '—' }}</code></td>
              <td class="muted">{{ e.ip_address || '—' }}</td>
              <td class="num">{{ fmtDuration(e.duration_ms) }}</td>
            </tr>
            <tr v-if="!events.length">
              <td colspan="6" class="empty">Nenhum evento</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button class="btn-sm btn-ghost" :disabled="eventsOffset === 0" @click="loadEvents(eventsOffset - eventsLimit)">
          ← Anterior
        </button>
        <span class="page-info">Mostrando {{ eventsOffset + 1 }}–{{ eventsOffset + events.length }}</span>
        <button class="btn-sm btn-ghost" :disabled="events.length < eventsLimit" @click="loadEvents(eventsOffset + eventsLimit)">
          Próximo →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'

const view = ref('overview')
const days = ref(7)
const loading = ref(false)

const summary = ref({ totals: [], top_pages: [], top_users: [], active_users: 0 })
const timeline = ref([])
const users = ref([])
const events = ref([])
const eventsLimit = 50
const eventsOffset = ref(0)
const eventFilter = ref('')
const userIdFilter = ref('')

function getTotal(type) {
  const row = summary.value.totals?.find(t => t.event_type === type)
  return row?.total || 0
}

function fmt(n) {
  return new Intl.NumberFormat('pt-BR').format(n || 0)
}

function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function fmtRelative(iso) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d atrás`
  return fmtDateTime(iso).split(',')[0]
}

function fmtDuration(ms) {
  if (!ms || ms < 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const min = Math.floor(ms / 60_000)
  const s = Math.round((ms % 60_000) / 1000)
  return `${min}m ${s}s`
}

const maxTimelineViews = computed(() => {
  const vals = timeline.value.map(d => d.page_views || 0)
  return Math.max(1, ...vals)
})

function barHeight(views) {
  return Math.max(4, Math.round(((views || 0) / maxTimelineViews.value) * 100))
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function loadOverview() {
  loading.value = true
  try {
    const [sum, tl] = await Promise.all([
      fetchJSON(`/api/admin/activity/summary?days=${days.value}`),
      fetchJSON(`/api/admin/activity/timeline?days=${days.value}`)
    ])
    summary.value = sum || { totals: [], top_pages: [], top_users: [], active_users: 0 }
    timeline.value = tl?.timeline || []
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const data = await fetchJSON(`/api/admin/activity/users`)
    users.value = data?.users || []
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

async function loadEvents(offset = 0) {
  loading.value = true
  eventsOffset.value = Math.max(0, offset)
  const params = new URLSearchParams()
  params.set('limit', String(eventsLimit))
  params.set('offset', String(eventsOffset.value))
  if (eventFilter.value) params.set('event_type', eventFilter.value)
  if (userIdFilter.value) params.set('user_id', String(userIdFilter.value))
  try {
    const data = await fetchJSON(`/api/admin/activity/events?${params}`)
    events.value = data?.events || []
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

function loadCurrent() {
  if (view.value === 'overview') loadOverview()
  else if (view.value === 'users') loadUsers()
  else if (view.value === 'events') loadEvents(eventsOffset.value)
}

function viewUserEvents(u) {
  userIdFilter.value = String(u.id)
  eventFilter.value = ''
  view.value = 'events'
  loadEvents(0)
}

function clearFilters() {
  userIdFilter.value = ''
  eventFilter.value = ''
  loadEvents(0)
}

watch(view, (v) => {
  if (v === 'overview') loadOverview()
  else if (v === 'users') loadUsers()
  else if (v === 'events') loadEvents(0)
})

// Auto-refresh da visão geral a cada 30s (usuario percebe atualização em "tempo real")
let pollTimer = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return
    if (view.value === 'overview') loadOverview()
    else if (view.value === 'users') loadUsers()
  }, 30_000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

onMounted(() => {
  loadOverview()
  startPolling()
})

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(stopPolling)
</script>

<style scoped>
.tab-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.tab-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0; }
.tab-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.subtabs { display: flex; gap: 4px; }
.subtab {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 4px;
  color: #888; font-size: 12px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.subtab svg { width: 13px; height: 13px; }
.subtab:hover { color: #ccc; background: rgba(255,255,255,0.06); }
.subtab.active { color: #fff; background: rgba(255,0,0,0.08); border-color: rgba(255,0,0,0.2); }

.loading, .empty { color: #666; font-size: 13px; padding: 32px 0; text-align: center; }
.empty { padding: 20px; }

.select, .input {
  background: #141414; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px; padding: 6px 10px; font-size: 12px;
  color: #ccc; font-family: inherit; outline: none;
}
.select option { background: #141414; }
.input { width: 120px; }

.btn-ghost {
  background: rgba(255,255,255,0.04); color: #888;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 4px;
  padding: 6px 10px; font-size: 12px; font-family: inherit;
  cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 4px;
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); color: #ccc; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost svg { width: 13px; height: 13px; }

.btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 3px; font-family: inherit; cursor: pointer; }

.btn-ico {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px; padding: 6px; color: #999; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.btn-ico:hover { background: rgba(255,255,255,0.08); color: #fff; }
.btn-ico svg { width: 14px; height: 14px; }

/* Scorecards */
.scorecards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.sc {
  background: #141414; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 5px; padding: 16px;
}
.sc-label { color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; }
.sc-value { color: #fff; font-size: 26px; font-weight: 700; line-height: 1; }
.sc-value.warn { color: #ff4444; }
.sc-sub { color: #666; font-size: 11px; margin-top: 6px; }

/* Grid 2-col */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
@media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }

/* Card */
.card { background: #141414; border: 1px solid rgba(255,255,255,0.06); border-radius: 5px; }
.card-head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
  color: #ccc; font-size: 13px; font-weight: 600;
}
.card-head svg { width: 14px; height: 14px; color: #ff4444; }
.card-body { padding: 8px 16px 12px; }

.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  gap: 12px;
}
.row:last-child { border-bottom: none; }
.row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-name { color: #eee; font-size: 13px; font-weight: 500; }
.row-sub { color: #666; font-size: 11px; }
.row-val { color: #ff4444; font-size: 14px; font-weight: 600; }
.page-code { color: #ccc; font-size: 12px; background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 3px; font-family: 'Consolas', monospace; }

/* Timeline bars */
.timeline {
  display: flex; gap: 6px; align-items: flex-end;
  padding: 16px 0 0; min-height: 140px;
}
.tl-day { flex: 1; min-width: 30px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.tl-bar-wrap { width: 100%; height: 80px; display: flex; align-items: flex-end; }
.tl-bar {
  width: 100%; background: linear-gradient(180deg, rgba(255,0,0,0.8), rgba(255,0,0,0.3));
  border-radius: 2px 2px 0 0; transition: height 0.3s; min-height: 4px;
}
.tl-label { color: #666; font-size: 10px; }
.tl-val { color: #999; font-size: 10px; font-weight: 600; }

/* Tabela */
.table-wrap { overflow-x: auto; background: #141414; border: 1px solid rgba(255,255,255,0.06); border-radius: 5px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px 12px; color: #888; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.06); }
.tbl td { padding: 10px 12px; color: #ccc; border-bottom: 1px solid rgba(255,255,255,0.04); }
.tbl tr:last-child td { border-bottom: none; }
.tbl .num { text-align: right; }
.tbl .act { text-align: right; width: 60px; }
.tbl td.muted { color: #666; }
.tbl td.nowrap { white-space: nowrap; }
.inactive td { opacity: 0.45; }

.td-user { display: flex; flex-direction: column; gap: 2px; }
.td-user strong { color: #eee; font-size: 13px; font-weight: 500; }
.td-email { color: #888; font-size: 11px; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.b-admin { background: rgba(255,0,0,0.12); color: #ff4444; }
.b-board { background: rgba(74,222,128,0.1); color: #4ade80; }
.b-operacao { background: rgba(255,255,255,0.06); color: #999; }

.ev-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.02em; }
.ev-login { background: rgba(74,222,128,0.1); color: #4ade80; }
.ev-logout { background: rgba(255,255,255,0.06); color: #999; }
.ev-login_failed { background: rgba(255,0,0,0.12); color: #ff4444; }
.ev-page_view { background: rgba(255,165,0,0.1); color: #ffa94d; }
.ev-page_leave { background: rgba(255,255,255,0.04); color: #777; }
.ev-password_change { background: rgba(150,100,255,0.1); color: #b799ff; }

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.dot-on { background: #4ade80; }
.dot-off { background: #555; }

.filters {
  display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;
}

.pagination {
  display: flex; justify-content: center; align-items: center; gap: 16px;
  margin-top: 16px; padding: 12px;
}
.page-info { color: #888; font-size: 12px; }
</style>
