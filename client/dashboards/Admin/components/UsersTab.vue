<template>
  <div>
    <div class="tab-header">
      <h2 class="tab-title">Gerenciar Usuários</h2>
      <div class="tab-actions">
        <template v-if="selected.length > 0">
          <span class="sel-count">{{ selected.length }} selecionado(s)</span>
          <select v-model="bulkRole" class="bulk-select">
            <option value="">Alterar perfil...</option>
            <option v-for="p in profiles" :key="p.name" :value="p.name">{{ p.label }}</option>
          </select>
          <button v-if="bulkRole" class="btn-sm btn-pri" @click="bulkSetRole">Aplicar</button>
          <button class="btn-sm btn-green" @click="bulkActivate">Ativar</button>
          <button class="btn-sm btn-red" @click="bulkDeactivate">Desativar</button>
          <button class="btn-sm btn-ghost" @click="clearSelection">Limpar</button>
        </template>
        <button class="btn-pri" @click="showModal = true; editUser = null">+ Novo Usuário</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>

    <div v-else class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th class="th-check"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>Nome</th>
            <th>Email</th>
            <th>Perfil</th>
            <th v-if="advanced">Login</th>
            <th>Status</th>
            <th v-if="advanced">Criado</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" :class="{ inactive: !u.active }">
            <td class="td-check"><input type="checkbox" :value="u.id" v-model="selected" /></td>
            <td class="td-name">{{ u.name }}</td>
            <td class="td-email">{{ u.email }}</td>
            <td><span class="badge" :class="'b-' + u.role">{{ profileLabel(u.role) }}</span></td>
            <td v-if="advanced">{{ u.oauth_provider || 'senha' }}</td>
            <td>
              <span class="dot" :class="u.active ? 'dot-on' : 'dot-off'"></span>
              {{ u.active ? 'Ativo' : 'Inativo' }}
            </td>
            <td v-if="advanced">{{ fmtDate(u.created_at) }}</td>
            <td class="td-act">
              <button class="btn-ico" title="Editar" @click="editUser = u; showModal = true"><i data-lucide="pencil"></i></button>
              <button v-if="u.active" class="btn-ico btn-ico-red" title="Desativar" @click="deactivate(u)"><i data-lucide="user-x"></i></button>
              <button v-else class="btn-ico btn-ico-green" title="Reativar" @click="reactivate(u)"><i data-lucide="user-check"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UserModal
      v-if="showModal"
      :user="editUser"
      :profiles="profiles"
      :advanced="advanced"
      @close="showModal = false"
      @saved="reload"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import UserModal from './UserModal.vue'

const props = defineProps({
  advanced: { type: Boolean, default: false },
  profiles: { type: Array, default: () => [] }
})

const users = ref([])
const loading = ref(true)
const selected = ref([])
const bulkRole = ref('')
const showModal = ref(false)
const editUser = ref(null)

const allSelected = computed(() => users.value.length > 0 && selected.value.length === users.value.length)

function profileLabel(role) {
  const p = props.profiles.find(pr => pr.name === role)
  return p ? p.label : role
}

function toggleAll(e) {
  selected.value = e.target.checked ? users.value.map(u => u.id) : []
}
function clearSelection() { selected.value = []; bulkRole.value = '' }

async function fetchUsers() {
  loading.value = true
  try {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    users.value = data.users || []
  } catch { users.value = [] }
  finally { loading.value = false; await nextTick(); if (window.lucide) lucide.createIcons() }
}

async function reload() { await fetchUsers(); clearSelection() }

async function bulkAction(action, extra) {
  const body = { action, userIds: selected.value, ...extra }
  await fetch('/api/admin/users/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  await reload()
}

function bulkActivate() { bulkAction('activate') }
function bulkDeactivate() { bulkAction('deactivate') }
function bulkSetRole() { if (bulkRole.value) bulkAction('set-role', { role: bulkRole.value }) }

async function deactivate(u) {
  if (!confirm(`Desativar ${u.name}?`)) return
  await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
  await reload()
}
async function reactivate(u) {
  await fetch(`/api/admin/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) })
  await reload()
}

function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '-' }

onMounted(fetchUsers)
</script>

<style scoped>
.tab-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.tab-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0; }
.tab-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sel-count { font-size: 12px; color: #888; }

.loading { color: #888; font-size: 14px; padding: 32px 0; text-align: center; }
.table-wrap { overflow-x: auto; }

.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px 12px; color: #888; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.06); }
.tbl td { padding: 11px 12px; color: #ccc; border-bottom: 1px solid rgba(255,255,255,0.04); }
.th-check, .td-check { width: 36px; text-align: center; }
.td-check input, .th-check input { accent-color: #ff0000; cursor: pointer; }
.td-name { font-weight: 500; color: #eee; }
.td-email { color: #888; font-size: 12px; }
.inactive td { opacity: 0.4; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.b-admin { background: rgba(255,0,0,0.12); color: #ff4444; }
.b-board { background: rgba(74,222,128,0.1); color: #4ade80; }
.b-operacao { background: rgba(255,255,255,0.06); color: #999; }

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.dot-on { background: #4ade80; }
.dot-off { background: #555; }

.td-act { display: flex; gap: 6px; }
.btn-ico { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 6px; color: #999; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
.btn-ico:hover { background: rgba(255,255,255,0.08); color: #fff; }
.btn-ico svg { width: 14px; height: 14px; }
.btn-ico-red:hover { background: rgba(255,0,0,0.1); color: #ff4444; border-color: rgba(255,0,0,0.2); }
.btn-ico-green:hover { background: rgba(74,222,128,0.1); color: #4ade80; border-color: rgba(74,222,128,0.2); }

.btn-pri { background: #ff0000; color: #fff; border: none; border-radius: 4px; padding: 8px 16px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.btn-pri:hover { background: #cc0000; }

.btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 3px; font-family: inherit; cursor: pointer; border: none; }
.btn-red { background: rgba(255,0,0,0.12); color: #ff4444; }
.btn-red:hover { background: rgba(255,0,0,0.2); }
.btn-green { background: rgba(74,222,128,0.1); color: #4ade80; }
.btn-green:hover { background: rgba(74,222,128,0.18); }
.btn-ghost { background: rgba(255,255,255,0.04); color: #888; }
.btn-ghost:hover { background: rgba(255,255,255,0.08); color: #ccc; }

.bulk-select { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 3px; padding: 5px 8px; font-size: 12px; color: #ccc; font-family: inherit; outline: none; }
.bulk-select option { background: #141414; color: #fff; }
</style>
