<template>
  <div>
    <div class="tab-header">
      <h2 class="tab-title">Gerenciar Perfis</h2>
      <button class="btn-pri" @click="editProfile = null; showModal = true">+ Novo Perfil</button>
    </div>

    <div class="profiles-grid">
      <div v-for="p in profiles" :key="p.name" class="profile-card">
        <div class="pc-header">
          <div>
            <span class="pc-name">{{ p.label }}</span>
            <span class="pc-slug">{{ p.name }}</span>
          </div>
          <div class="pc-actions">
            <button class="btn-ico" title="Editar" @click="editProfile = p; showModal = true"><i data-lucide="pencil"></i></button>
            <button v-if="!isDefault(p.name)" class="btn-ico btn-ico-red" title="Deletar" @click="deleteProfile(p)"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="pc-body">
          <div v-if="advanced" class="pc-meta">
            <span>Criado: {{ fmtDate(p.created_at) }}</span>
            <span>Usuários: {{ countUsers(p.name) }}</span>
          </div>
          <div class="pc-dashboards">
            <span class="pc-dash-label">Dashboards:</span>
            <span v-if="!p.allowed_dashboards || p.allowed_dashboards.length === 0" class="pc-dash-all">Acesso total</span>
            <template v-else>
              <span v-for="did in p.allowed_dashboards" :key="did" class="pc-dash-tag">{{ dashLabel(did) }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <ProfileModal
      v-if="showModal"
      :profile="editProfile"
      @close="showModal = false"
      @saved="$emit('saved'); refreshIcons()"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import ProfileModal from './ProfileModal.vue'

const props = defineProps({
  advanced: { type: Boolean, default: false },
  profiles: { type: Array, default: () => [] }
})
defineEmits(['saved'])

const showModal = ref(false)
const editProfile = ref(null)
const dashboards = ref([])
const userCounts = ref({})

// Apenas 'admin' e imutavel. board/operacao vem pre-configurados mas sao editaveis/deletaveis.
function isDefault(name) { return name === 'admin' }

function dashLabel(id) {
  const d = dashboards.value.find(x => x.id === id)
  return d ? d.title : id
}

function countUsers(role) { return userCounts.value[role] || 0 }

function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '-' }

async function refreshIcons() { await nextTick(); if (window.lucide) lucide.createIcons() }

async function deleteProfile(p) {
  if (!confirm(`Deletar perfil "${p.label}"? Usuários com este perfil precisam ser reassociados.`)) return
  const res = await fetch(`/api/admin/profiles/${p.name}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) { alert(data.error); return }
  // eslint-disable-next-line vue/no-mutating-props
  props.profiles.splice(props.profiles.indexOf(p), 1)
}

onMounted(async () => {
  try {
    const [dashRes, usersRes] = await Promise.all([
      fetch('/api/admin/dashboards-list'),
      fetch('/api/admin/users')
    ])
    const dashData = await dashRes.json()
    dashboards.value = dashData.dashboards || []
    const usersData = await usersRes.json()
    const counts = {}
    for (const u of usersData.users || []) { counts[u.role] = (counts[u.role] || 0) + 1 }
    userCounts.value = counts
  } catch { /* silent */ }
  await refreshIcons()
})
</script>

<style scoped>
.tab-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.tab-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0; }

.profiles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

.profile-card { background: #141414; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 16px; }
.pc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.pc-name { font-size: 15px; font-weight: 600; color: #fff; }
.pc-slug { font-size: 11px; color: #555; margin-left: 8px; }
.pc-actions { display: flex; gap: 4px; }
.pc-body {}
.pc-meta { display: flex; gap: 16px; font-size: 11px; color: #555; margin-bottom: 10px; }

.pc-dashboards { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pc-dash-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
.pc-dash-all { font-size: 12px; color: #4ade80; }
.pc-dash-tag { font-size: 11px; padding: 2px 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 3px; color: #999; }

.btn-pri { background: #ff0000; color: #fff; border: none; border-radius: 4px; padding: 8px 16px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.btn-pri:hover { background: #cc0000; }

.btn-ico { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 5px; color: #999; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
.btn-ico:hover { background: rgba(255,255,255,0.08); color: #fff; }
.btn-ico svg { width: 13px; height: 13px; }
.btn-ico-red:hover { background: rgba(255,0,0,0.1); color: #ff4444; border-color: rgba(255,0,0,0.2); }
</style>
