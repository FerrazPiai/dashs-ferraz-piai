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
      </div>
      <button class="mode-toggle" @click="advanced = !advanced" :title="advanced ? 'Modo Básico' : 'Modo Avançado'">
        <i :data-lucide="advanced ? 'eye-off' : 'eye'" class="mode-icon"></i>
        <span>{{ advanced ? 'Básico' : 'Avançado' }}</span>
      </button>
    </div>

    <UsersTab v-if="tab === 'users'" :advanced="advanced" :profiles="profiles" @refresh-profiles="fetchProfiles" />
    <ProfilesTab v-else :advanced="advanced" :profiles="profiles" @saved="fetchProfiles" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import UsersTab from './components/UsersTab.vue'
import ProfilesTab from './components/ProfilesTab.vue'

const tab = ref('users')
const advanced = ref(false)
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

.mode-toggle {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06); border-radius: 4px;
  color: #666; font-size: 12px; font-family: inherit; cursor: pointer;
  transition: all 0.15s;
}
.mode-toggle:hover { color: #999; background: rgba(255,255,255,0.06); }
.mode-icon { width: 14px; height: 14px; }
</style>
