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
        <li
          v-for="dashboard in dashboards"
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
  </aside>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'

defineProps({
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

const statusLabel = (status) => {
  const labels = {
    available: 'Disponível',
    development: 'Em desenvolvimento',
    maintenance: 'Em manutenção'
  }
  return labels[status] || ''
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
</style>
