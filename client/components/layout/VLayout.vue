<template>
  <div class="app-layout">
    <VSidebar
      :dashboards="dashboards"
      :collapsed="sidebarCollapsed"
      @toggle="toggleSidebar"
    />

    <div
      class="sidebar-overlay"
      :class="{ visible: !sidebarCollapsed && isMobile }"
      @click="toggleSidebar"
    ></div>

    <button
      class="sidebar-toggle"
      @click="toggleSidebar"
      aria-label="Toggle sidebar"
    >
      <i :data-lucide="sidebarCollapsed ? 'menu' : 'x'"></i>
    </button>

    <main class="main-content" :class="{ expanded: sidebarCollapsed }">
      <slot></slot>
    </main>

    <VStatusModal
      :visible="statusModal.visible"
      :status="statusModal.status"
      :dashboard-title="statusModal.title"
      :message="statusModal.message"
      @close="statusModal.visible = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import VSidebar from './VSidebar.vue'
import VStatusModal from '../ui/VStatusModal.vue'

const props = defineProps({
  dashboards: {
    type: Array,
    required: true
  }
})

const sidebarCollapsed = ref(false)
const isMobile = ref(false)
const route = useRoute()

const statusModal = reactive({
  visible: false,
  status: '',
  title: '',
  message: ''
})

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const showStatusIfNeeded = (dashboards, path) => {
  const id = path.replace('/', '')
  const dashboard = dashboards.find(d => d.id === id)
  if (dashboard && dashboard.status && dashboard.status !== 'available' && dashboard.statusMessage) {
    statusModal.status = dashboard.status
    statusModal.title = dashboard.title
    statusModal.message = dashboard.statusMessage
    statusModal.visible = true
  }
}

watch(
  () => route.path,
  (path) => {
    showStatusIfNeeded(props.dashboards, path)

    setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons()
      }
    }, 0)
  }
)

watch(
  () => props.dashboards,
  (dashboards) => {
    if (dashboards.length) {
      showStatusIfNeeded(dashboards, route.path)
    }
  }
)

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  if (window.lucide) {
    window.lucide.createIcons()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>
