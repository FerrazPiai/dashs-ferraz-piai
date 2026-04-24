<template>
  <aside class="sidebar" :class="{ collapsed, open: !collapsed }">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <i data-lucide="bar-chart-3" class="sidebar-logo-icon"></i>
        <span class="sidebar-label">Dashboards V4</span>
      </div>
      <button class="sidebar-toggle-btn" @click="$emit('toggle')" aria-label="Toggle sidebar">
        <i :data-lucide="collapsed ? 'chevrons-right' : 'chevrons-left'" class="sidebar-toggle-icon"></i>
      </button>
    </div>

    <nav class="sidebar-nav">
      <ul class="sidebar-nav-list">
        <li class="sidebar-nav-item">
          <router-link
            to="/"
            class="sidebar-nav-link sidebar-nav-link--home"
            active-class="active"
            :title="collapsed ? 'Início' : undefined"
          >
            <i data-lucide="home" class="sidebar-nav-icon"></i>
            <span class="sidebar-label">Início</span>
          </router-link>
        </li>
      </ul>

      <div
        v-for="cat in visibleCategories"
        :key="cat.id"
        class="sidebar-section"
      >
        <div class="sidebar-section-label">
          <span class="sidebar-label">{{ cat.label }}</span>
          <span class="sidebar-section-divider" aria-hidden="true"></span>
        </div>
        <ul class="sidebar-nav-list">
          <li
            v-for="dashboard in groupedDashboards[cat.id]"
            :key="dashboard.id"
            class="sidebar-nav-item"
          >
            <router-link
              :to="`/${dashboard.id}`"
              class="sidebar-nav-link"
              active-class="active"
              :title="collapsed ? dashboard.title : undefined"
            >
              <i :data-lucide="dashboard.icon" class="sidebar-nav-icon"></i>
              <span class="sidebar-label">{{ dashboard.title }}</span>
              <span
                v-if="dashboard.status"
                class="status-dot"
                :class="`status-dot--${dashboard.status}`"
                :title="statusLabel(dashboard.status)"
              ></span>
            </router-link>
          </li>
        </ul>
      </div>

      <ul v-if="uncategorizedDashboards.length > 0" class="sidebar-nav-list sidebar-nav-list--uncategorized">
        <li
          v-for="dashboard in uncategorizedDashboards"
          :key="dashboard.id"
          class="sidebar-nav-item"
        >
          <router-link
            :to="`/${dashboard.id}`"
            class="sidebar-nav-link"
            active-class="active"
            :title="collapsed ? dashboard.title : undefined"
          >
            <i :data-lucide="dashboard.icon" class="sidebar-nav-icon"></i>
            <span class="sidebar-label">{{ dashboard.title }}</span>
            <span
              v-if="dashboard.status"
              class="status-dot"
              :class="`status-dot--${dashboard.status}`"
              :title="statusLabel(dashboard.status)"
            ></span>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Footer: user info + admin + logout -->
    <div class="sidebar-footer">
      <router-link
        v-if="isAdmin"
        to="/admin"
        class="sidebar-footer-link sidebar-admin-link"
        active-class="active"
        :title="collapsed ? 'Admin' : undefined"
      >
        <i data-lucide="settings" class="sidebar-nav-icon"></i>
        <span class="sidebar-label">Painel Admin</span>
      </router-link>

      <div class="sidebar-user" :title="collapsed ? userName : undefined">
        <div class="sidebar-user-avatar">{{ userInitials }}</div>
        <div v-if="!collapsed" class="sidebar-user-info">
          <span class="sidebar-user-name">{{ userName }}</span>
          <span class="sidebar-user-role">{{ userRoleLabel }}</span>
        </div>
        <button
          class="sidebar-logout-btn"
          :title="collapsed ? 'Sair' : undefined"
          @click="handleLogout"
        >
          <i data-lucide="log-out" class="sidebar-logout-icon"></i>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const props = defineProps({
  dashboards: {
    type: Array,
    required: true
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const CATEGORIES = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacao', label: 'Operação' }
]

const groupedDashboards = computed(() => {
  const groups = Object.fromEntries(CATEGORIES.map((c) => [c.id, []]))
  for (const d of props.dashboards) {
    if (d.category && groups[d.category]) {
      groups[d.category].push(d)
    }
  }
  return groups
})

const visibleCategories = computed(() =>
  CATEGORIES.filter((c) => groupedDashboards.value[c.id].length > 0)
)

const uncategorizedDashboards = computed(() =>
  props.dashboards.filter((d) => !d.category || !CATEGORIES.some((c) => c.id === d.category))
)

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

const statusLabel = (status) => {
  const labels = {
    available: 'Disponível',
    development: 'Em desenvolvimento',
    maintenance: 'Em manutenção'
  }
  return labels[status] || ''
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

watch(
  () => route.path,
  () => {
    setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons()
      }
    }, 0)
  }
)
</script>

<style scoped>
.sidebar-toggle-btn {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sidebar-toggle-btn:hover {
  color: var(--text-high, #fff);
  background: var(--bg-inner, #1a1a1a);
}

.sidebar-toggle-icon {
  width: 18px;
  height: 18px;
}

.sidebar-label {
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
}

.sidebar.collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar.collapsed .status-dot {
  display: none;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-left: auto;
  flex-shrink: 0;
}

.status-dot--available {
  background-color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.status-dot--development {
  background-color: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.status-dot--maintenance {
  background-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

/* === Categorias e polimento visual === */

.sidebar-section {
  margin-top: 18px;
}

.sidebar-section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 var(--spacing-lg, 20px);
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-lowest, #666);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-section-divider {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.08), transparent);
}

.sidebar.collapsed .sidebar-section {
  margin-top: 12px;
  position: relative;
}

.sidebar.collapsed .sidebar-section-label {
  padding: 0;
  height: 1px;
  margin: 0 10px 6px;
}

.sidebar.collapsed .sidebar-section-label .sidebar-label {
  display: none;
}

.sidebar.collapsed .sidebar-section-divider {
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-nav-list--uncategorized {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

/* Home link — destaque sutil com icone em primary */
.sidebar-nav-link--home.active .sidebar-nav-icon {
  color: var(--color-primary, #ff0000);
}

/* === Sidebar Footer === */

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px;
}

.sidebar-admin-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  color: #888;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.15s;
  margin-bottom: 6px;
}

.sidebar.collapsed .sidebar-admin-link {
  justify-content: center;
  padding: var(--spacing-sm) 0;
  gap: 0;
  border-radius: 0;
  margin: 0 -8px 6px;
}

.sidebar-admin-link:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #ccc;
}

.sidebar-admin-link.active {
  background: rgba(255, 0, 0, 0.08);
  color: #ff4444;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.02);
}

.sidebar.collapsed .sidebar-user {
  justify-content: center;
  padding: 8px 4px;
}

.sidebar-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.12);
  color: #ff4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.sidebar-user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-role {
  font-size: 11px;
  color: #666;
}

.sidebar-logout-btn {
  background: none;
  border: none;
  color: #555;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sidebar.collapsed .sidebar-logout-btn {
  display: none;
}

.sidebar-logout-btn:hover {
  color: #ff4444;
  background: rgba(255, 0, 0, 0.08);
}

.sidebar-logout-icon {
  width: 16px;
  height: 16px;
}
</style>
