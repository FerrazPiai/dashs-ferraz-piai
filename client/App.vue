<template>
  <template v-if="route.name === 'login' || route.name === 'home'">
    <router-view />
  </template>
  <template v-else>
    <VLayout :dashboards="dashboardsStore.list">
      <router-view v-slot="{ Component }">
        <component :is="Component" :key="route.path" />
      </router-view>
    </VLayout>
  </template>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import VLayout from './components/layout/VLayout.vue'
import { useDashboardsStore } from './stores/dashboards.js'

const route = useRoute()
const dashboardsStore = useDashboardsStore()

// Carrega dashboards ao sair do login (usuário autenticado)
watch(
  () => route.name,
  (name) => {
    if (name && name !== 'login') {
      dashboardsStore.load()
    }
  },
  { immediate: true }
)
</script>
