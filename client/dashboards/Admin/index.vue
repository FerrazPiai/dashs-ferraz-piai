<template>
  <div class="admin-page">
    <div class="admin-top">
      <div class="admin-tabs">
        <button class="tab" :class="{ active: tab === 'users' }" @click="tab = 'users'">
          <i data-lucide="users" class="tab-icon"></i> Usuários
        </button>
        <button class="tab" :class="{ active: tab === 'profiles' }" @click="tab = 'profiles'">
          <i data-lucide="shield" class="tab-icon"></i> Perfis
        </button>
        <button class="tab" :class="{ active: tab === 'ai' }" @click="tab = 'ai'">
          <i data-lucide="sparkles" class="tab-icon"></i> IA
        </button>
        <button class="tab" :class="{ active: tab === 'alertas' }" @click="tab = 'alertas'">
          <i data-lucide="bell" class="tab-icon"></i> Alertas
        </button>
        <button class="tab" :class="{ active: tab === 'activity' }" @click="tab = 'activity'">
          <i data-lucide="activity" class="tab-icon"></i> Atividade
        </button>
      </div>
    </div>

    <UsersTab v-if="tab === 'users'" :advanced="true" :profiles="profiles" @refresh-profiles="fetchProfiles" />
    <ProfilesTab v-else-if="tab === 'profiles'" :advanced="true" :profiles="profiles" @saved="fetchProfiles" />
    <AiProviderTab v-else-if="tab === 'ai'" />
    <AlertasTab v-else-if="tab === 'alertas'" />
    <UserActivityTab v-else-if="tab === 'activity'" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import UsersTab from './components/UsersTab.vue'
import ProfilesTab from './components/ProfilesTab.vue'
import AiProviderTab from './components/AiProviderTab.vue'
import AlertasTab from './components/AlertasTab.vue'
import UserActivityTab from './components/UserActivityTab.vue'

const tab = ref('users')
const profiles = ref([])

async function fetchProfiles() {
  try {
    const res = await fetch('/api/admin/profiles')
    const data = await res.json()
    profiles.value = data.profiles || []
  } catch { profiles.value = [] }
}

onMounted(async () => {
  await fetchProfiles()
  await nextTick()
  if (window.lucide) lucide.createIcons()
})
</script>

<style scoped>
.admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }

.admin-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
}

.admin-tabs { display: flex; gap: 4px; }

.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 4px;
  color: #888; font-size: 13px; font-weight: 500; font-family: inherit;
  cursor: pointer; transition: all 0.15s;
}
.tab:hover { color: #ccc; background: rgba(255,255,255,0.06); }
.tab.active { color: #fff; background: rgba(255,0,0,0.08); border-color: rgba(255,0,0,0.2); }
.tab-icon { width: 15px; height: 15px; }
</style>
