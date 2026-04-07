<template>
  <template v-if="route.name !== 'login'">
    <VLayout :dashboards="dashboards">
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="route.path" />
      </router-view>
    </VLayout>
  </template>
  <template v-else>
    <router-view />
  </template>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VLayout from './components/layout/VLayout.vue'

const route = useRoute()
const dashboards = ref([])

const loadDashboards = async () => {
  try {
    const response = await fetch('/api/dashboards')
    if (!response.ok) return
    const data = await response.json()
    dashboards.value = data.dashboards
  } catch (error) {
    console.error('Error loading dashboards:', error)
  }
}

// Carrega dashboards ao sair do login (usuário autenticado)
watch(
  () => route.name,
  (name) => {
    if (name !== 'login' && dashboards.value.length === 0) {
      loadDashboards()
    }
  }
)
</script>
