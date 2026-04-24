<template>
  <div class="alertas-tab">
    <div class="sub-tabs">
      <button class="sub-tab" :class="{ active: sub === 'configs' }" @click="sub = 'configs'">
        <i data-lucide="bell" class="tab-icon"></i> Alertas
      </button>
      <button class="sub-tab" :class="{ active: sub === 'channels' }" @click="sub = 'channels'">
        <i data-lucide="message-square" class="tab-icon"></i> Canais
      </button>
      <button class="sub-tab" :class="{ active: sub === 'log' }" @click="sub = 'log'">
        <i data-lucide="list" class="tab-icon"></i> Log
      </button>
      <button class="kill-switch-btn" :class="killSwitchCls" :disabled="savingKillSwitch" @click="toggleGlobalKillSwitch">
        <i :data-lucide="killSwitch ? 'power' : 'power-off'"></i>
        <span>{{ savingKillSwitch ? '...' : (killSwitch ? 'Alertas ON' : 'Alertas OFF') }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <!-- ABA CONFIGS -->
    <div v-show="sub === 'configs' && !loading" class="cards">
      <div v-for="c in configs" :key="c.alert_type" class="card">
        <div class="card-head">
          <div>
            <div class="card-title">{{ c.alert_type }}</div>
            <div class="card-notes">{{ c.notes || '—' }}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" :checked="c.enabled" @change="toggleConfig(c, $event.target.checked)" />
            <span>{{ c.enabled ? 'Ativo' : 'Desativado' }}</span>
          </label>
        </div>
        <div class="card-row">
          <label>Canal</label>
          <select :value="c.channel_id || ''" @change="updateConfig(c, { channel_id: $event.target.value ? Number($event.target.value) : null })">
            <option value="">— sem canal —</option>
            <option v-for="ch in channels" :key="ch.id" :value="ch.id">
              {{ ch.display_name || ch.space_name }}
            </option>
          </select>
        </div>
        <div class="card-row">
          <label>Rate limit (por hora)</label>
          <input type="number" :value="c.rate_limit_per_hour" min="0"
                 @change="updateConfig(c, { rate_limit_per_hour: Number($event.target.value) })" />
        </div>
        <details class="card-details">
          <summary>Template de mensagem</summary>
          <textarea :value="c.message_template || ''" rows="8"
                    @blur="updateConfig(c, { message_template: $event.target.value })"></textarea>
        </details>
      </div>
    </div>

    <!-- ABA CANAIS -->
    <div v-show="sub === 'channels' && !loading" class="panel">
      <div class="panel-actions">
        <button class="btn" @click="refreshSpaces" :disabled="loadingSpaces">
          <i data-lucide="refresh-cw"></i> {{ loadingSpaces ? 'Atualizando...' : 'Atualizar lista (Google API)' }}
        </button>
      </div>
      <div v-if="availableSpaces.length" class="spaces-select">
        <label>Adicionar space:</label>
        <select v-model="selectedSpace">
          <option value="">— selecione —</option>
          <option v-for="s in availableSpaces" :key="s.name" :value="s.name">
            {{ s.displayName }} ({{ s.type }})
          </option>
        </select>
        <button class="btn btn-primary" :disabled="!selectedSpace" @click="addChannel">Cadastrar</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>Nome</th><th>Space</th><th>Provider</th><th>Criado em</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="ch in channels" :key="ch.id">
            <td>{{ ch.display_name || '—' }}</td>
            <td><code>{{ ch.space_name }}</code></td>
            <td>{{ ch.provider }}</td>
            <td>{{ fmtDate(ch.created_at) }}</td>
            <td>
              <button class="btn btn-ghost" @click="testChannel(ch)">Testar</button>
              <button class="btn btn-danger" @click="deleteChannel(ch)">Remover</button>
            </td>
          </tr>
          <tr v-if="!channels.length"><td colspan="5" class="empty">Nenhum canal cadastrado</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ABA LOG -->
    <div v-show="sub === 'log' && !loading" class="panel">
      <div class="panel-actions">
        <select v-model="logFilter.status" @change="fetchEventos">
          <option value="">Todos status</option>
          <option value="delivered">delivered</option>
          <option value="failed">failed</option>
          <option value="skipped">skipped</option>
          <option value="rate_limited">rate_limited</option>
          <option value="pending">pending</option>
        </select>
        <button class="btn" @click="fetchEventos"><i data-lucide="refresh-cw"></i> Atualizar</button>
      </div>
      <table class="table">
        <thead>
          <tr><th>Quando</th><th>Tipo</th><th>Status</th><th>Tentativas</th><th>Erro</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in eventos" :key="e.id" :class="'row-' + e.status">
            <td>{{ fmtDate(e.created_at) }}</td>
            <td><code>{{ e.alert_type }}</code></td>
            <td><span class="status-badge" :class="'status-' + e.status">{{ e.status }}</span></td>
            <td>{{ e.attempts }}</td>
            <td class="truncate">{{ e.last_error || '—' }}</td>
          </tr>
          <tr v-if="!eventos.length"><td colspan="5" class="empty">Nenhum evento</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const sub = ref('configs')
const loading = ref(true)
const error = ref('')

const configs = ref([])
const channels = ref([])
const eventos = ref([])
const killSwitch = ref(false)
const savingKillSwitch = ref(false)
const availableSpaces = ref([])
const selectedSpace = ref('')
const loadingSpaces = ref(false)
const logFilter = ref({ status: '' })

const killSwitchCls = computed(() => ({ 'ks-on': killSwitch.value, 'ks-off': !killSwitch.value }))

async function toggleGlobalKillSwitch() {
  const next = !killSwitch.value
  const msg = next
    ? 'Ativar envio GLOBAL de alertas para o Google Chat?\n\nIsto permitira envios reais a partir de agora.'
    : 'Desativar envio global de alertas?'
  if (!confirm(msg)) return
  savingKillSwitch.value = true
  try {
    const res = await fetch('/api/admin/alertas/global-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'falha')
    killSwitch.value = !!data.enabled
  } catch (err) {
    alert('Erro: ' + err.message)
  } finally {
    savingKillSwitch.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }
  catch { return iso }
}

async function fetchAll() {
  loading.value = true
  error.value = ''
  try {
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/alertas/configs').then((r) => r.json()),
      fetch('/api/admin/alertas/channels').then((r) => r.json())
    ])
    configs.value = r1.configs || []
    killSwitch.value = !!r1.kill_switch
    channels.value = r2.channels || []
  } catch (err) {
    error.value = err.message || 'erro ao carregar'
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

async function fetchEventos() {
  try {
    const qs = new URLSearchParams()
    if (logFilter.value.status) qs.set('status', logFilter.value.status)
    const res = await fetch('/api/admin/alertas/eventos?' + qs.toString())
    const data = await res.json()
    eventos.value = data.eventos || []
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  } catch (err) {
    error.value = err.message
  }
}

async function updateConfig(c, patch) {
  try {
    const res = await fetch(`/api/admin/alertas/configs/${encodeURIComponent(c.alert_type)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw new Error((await res.json()).error || 'falha')
    await fetchAll()
  } catch (err) { alert('Erro: ' + err.message) }
}

function toggleConfig(c, enabled) {
  updateConfig(c, { enabled })
}

async function refreshSpaces() {
  loadingSpaces.value = true
  try {
    const res = await fetch('/api/admin/alertas/spaces')
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error || 'falha')
    availableSpaces.value = data.spaces || []
  } catch (err) {
    alert('Erro ao listar spaces: ' + err.message + '\n\nVerifique se o bot esta adicionado em algum space do Google Chat.')
  } finally {
    loadingSpaces.value = false
    await nextTick()
    if (window.lucide) window.lucide.createIcons()
  }
}

async function addChannel() {
  const space = availableSpaces.value.find((s) => s.name === selectedSpace.value)
  if (!space) return
  try {
    const res = await fetch('/api/admin/alertas/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ space_name: space.name, display_name: space.displayName })
    })
    if (!res.ok) throw new Error((await res.json()).error || 'falha')
    selectedSpace.value = ''
    await fetchAll()
  } catch (err) { alert('Erro: ' + err.message) }
}

async function deleteChannel(ch) {
  if (!confirm(`Remover canal "${ch.display_name || ch.space_name}"?`)) return
  try {
    const res = await fetch(`/api/admin/alertas/channels/${ch.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('falha')
    await fetchAll()
  } catch (err) { alert('Erro: ' + err.message) }
}

async function testChannel(ch) {
  try {
    const res = await fetch('/api/admin/alertas/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id: ch.id })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || data.error || 'falha')
    alert('Mensagem de teste enviada!')
  } catch (err) { alert('Erro ao enviar teste: ' + err.message) }
}

onMounted(async () => {
  await fetchAll()
  await fetchEventos()
})
</script>

<style scoped>
.alertas-tab { padding: 0; }

.sub-tabs {
  display: flex; gap: 4px; align-items: center;
  margin-bottom: 20px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sub-tab {
  background: transparent; color: #999; border: none; padding: 8px 14px;
  border-radius: 4px; cursor: pointer; font-size: 13px;
  display: inline-flex; align-items: center; gap: 6px;
}
.sub-tab:hover { background: rgba(255,255,255,0.04); color: #fff; }
.sub-tab.active { background: #1a1a1a; color: #fff; }
.tab-icon { width: 14px; height: 14px; }

.kill-switch-btn {
  margin-left: auto; font-size: 12px; padding: 6px 14px; border-radius: 4px;
  display: inline-flex; align-items: center; gap: 6px; font-weight: 500;
  cursor: pointer; border: 1px solid transparent; transition: all 0.15s;
}
.kill-switch-btn:hover:not(:disabled) { transform: translateY(-1px); }
.kill-switch-btn:disabled { opacity: 0.6; cursor: wait; }
.kill-switch-btn.ks-on  {
  background: rgba(34,197,94,0.15); color: #4ade80;
  border-color: rgba(34,197,94,0.3);
}
.kill-switch-btn.ks-on:hover:not(:disabled)  { background: rgba(34,197,94,0.22); }
.kill-switch-btn.ks-off {
  background: rgba(239,68,68,0.15); color: #f87171;
  border-color: rgba(239,68,68,0.3);
}
.kill-switch-btn.ks-off:hover:not(:disabled) { background: rgba(239,68,68,0.22); }
.kill-switch-btn i { width: 12px; height: 12px; }

.loading, .error, .empty { padding: 20px; color: #888; text-align: center; }
.error { color: #f87171; }

.cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
.card {
  background: #141414; border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px; padding: 16px;
}
.card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
.card-title { font-weight: 500; color: #fff; font-family: 'Courier New', monospace; font-size: 13px; }
.card-notes { color: #888; font-size: 12px; margin-top: 4px; }
.card-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 13px; }
.card-row label { color: #999; min-width: 130px; }
.card-row select, .card-row input, .card-details textarea {
  flex: 1; background: #0d0d0d; color: #fff; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 4px; padding: 6px 10px; font-size: 13px;
}
.card-details { margin-top: 8px; }
.card-details summary { color: #999; cursor: pointer; font-size: 12px; padding: 4px 0; }
.card-details textarea { width: 100%; font-family: 'Courier New', monospace; font-size: 12px; margin-top: 6px; }

.toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: #ccc; }
.toggle input { width: 16px; height: 16px; accent-color: #ff0000; }

.panel { background: #141414; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px; }
.panel-actions { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }

.btn {
  background: #1a1a1a; color: #ccc; border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover:not(:disabled) { background: #222; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #ff0000; color: #fff; border-color: transparent; }
.btn-primary:hover:not(:disabled) { background: #cc0000; }
.btn-ghost { background: transparent; }
.btn-danger { color: #f87171; }
.btn-danger:hover { background: rgba(239,68,68,0.1); }
.btn i { width: 12px; height: 12px; }

.spaces-select { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.spaces-select select { flex: 1; min-width: 200px; background: #0d0d0d; color: #fff; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 6px 10px; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.04); }
.table th { color: #888; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.table td { color: #ccc; }
.table code { font-family: 'Courier New', monospace; font-size: 11px; color: #aaa; }
.truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500; text-transform: uppercase; }
.status-delivered    { background: rgba(34,197,94,0.15);  color: #4ade80; }
.status-failed       { background: rgba(239,68,68,0.15);  color: #f87171; }
.status-skipped      { background: rgba(156,163,175,0.15);color: #9ca3af; }
.status-rate_limited { background: rgba(234,179,8,0.15);  color: #facc15; }
.status-pending      { background: rgba(59,130,246,0.15); color: #60a5fa; }
</style>
