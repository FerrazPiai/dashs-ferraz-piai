<template>
  <div class="home-user-menu" ref="rootRef">
    <button
      class="home-user-avatar"
      :title="userName"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      {{ userInitials }}
    </button>

    <Transition name="home-dropdown">
      <div v-if="open" class="home-dropdown" role="menu">
        <div class="home-dropdown-header">
          <span class="home-dropdown-name">{{ userName }}</span>
          <span class="home-dropdown-role">{{ userRoleLabel }}</span>
        </div>

        <div class="home-dropdown-body">
          <router-link
            v-if="isAdmin"
            to="/admin"
            class="home-dropdown-item"
            role="menuitem"
            @click="close"
          >
            <i data-lucide="settings"></i>
            <span>Painel Admin</span>
          </router-link>

          <button
            class="home-dropdown-item home-dropdown-item--logout"
            role="menuitem"
            @click="handleLogout"
          >
            <i data-lucide="log-out"></i>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const router = useRouter()
const auth = useAuthStore()

const open = ref(false)
const rootRef = ref(null)

const isAdmin = computed(() => auth.isAdmin)
const userName = computed(() => auth.user?.name || 'Usuário')
const userInitials = computed(() => {
  const name = auth.user?.name || ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name[0] || 'U').toUpperCase()
})
const userRoleLabel = computed(() => {
  const labels = { admin: 'Administrador', board: 'Board', operacao: 'Operação' }
  return labels[auth.role] || auth.role || ''
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

async function handleLogout() {
  close()
  await auth.logout()
  router.push('/login')
}

function onDocClick(e) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target)) close()
}
function onKey(e) {
  if (e.key === 'Escape') close()
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
watch(open, (v) => {
  if (v) renderIcons()
})
</script>

<style scoped>
.home-user-menu {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 50;
}

.home-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.12);
  color: #ff4444;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
}
.home-user-avatar:hover { background: rgba(255, 0, 0, 0.18); }
.home-user-avatar:active { transform: scale(0.96); }

.home-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.home-dropdown-header {
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.home-dropdown-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium, #ccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.home-dropdown-role {
  font-size: 11px;
  color: var(--text-lowest, #666);
}

.home-dropdown-body {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-low, #999);
  text-decoration: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  text-align: left;
  width: 100%;
}
.home-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-medium, #ccc);
}
.home-dropdown-item :deep(svg) {
  width: 15px;
  height: 15px;
  stroke-width: 2;
}
.home-dropdown-item--logout:hover {
  color: #ff4444;
  background: rgba(255, 0, 0, 0.08);
}

.home-dropdown-enter-active,
.home-dropdown-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.home-dropdown-enter-from,
.home-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
