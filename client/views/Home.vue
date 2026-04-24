<template>
  <div class="home-view">
    <HomeUserMenu />

    <main class="home-container">
      <HomeHeader :count="totalCount" />

      <div v-if="loading && totalCount === 0" class="home-empty">
        <p>Carregando dashboards…</p>
      </div>

      <div v-else-if="totalCount === 0" class="home-empty">
        <i data-lucide="inbox" class="home-empty-icon"></i>
        <p>Você não tem acesso a nenhum dashboard. Contate o administrador.</p>
      </div>

      <template v-else>
        <HomeCategoryRow
          v-for="cat in visibleCategories"
          :key="cat.id"
          :label="cat.label"
          :dashboards="groupedDashboards[cat.id]"
          @open="openDashboard"
          @docs="openDocs"
        />
      </template>
    </main>

    <HomeDocsModal
      :dashboard="docsFor"
      @close="docsFor = null"
      @open="openDashboardFromDocs"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardsStore } from '../stores/dashboards.js'
import HomeHeader from '../components/home/HomeHeader.vue'
import HomeUserMenu from '../components/home/HomeUserMenu.vue'
import HomeCategoryRow from '../components/home/HomeCategoryRow.vue'
import HomeDocsModal from '../components/home/HomeDocsModal.vue'

const router = useRouter()
const dashboardsStore = useDashboardsStore()

const CATEGORIES = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacao', label: 'Operação' }
]

const loading = ref(false)
const docsFor = ref(null)

const list = computed(() => dashboardsStore.list)
const totalCount = computed(() => list.value.length)

const groupedDashboards = computed(() => {
  const groups = Object.fromEntries(CATEGORIES.map((c) => [c.id, []]))
  for (const d of list.value) {
    if (d.category && groups[d.category]) {
      groups[d.category].push(d)
    } else if (d.category) {
      if (import.meta.env.DEV) {
        console.warn(`[Home] Dashboard "${d.id}" tem category="${d.category}" sem mapeamento em CATEGORIES`)
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[Home] Dashboard "${d.id}" sem campo category — não aparecerá na home`)
      }
    }
  }
  return groups
})

const visibleCategories = computed(() =>
  CATEGORIES.filter((c) => groupedDashboards.value[c.id].length > 0)
)

function openDashboard(dashboard) {
  router.push(`/${dashboard.id}`)
}

function openDocs(dashboard) {
  docsFor.value = dashboard
}

function openDashboardFromDocs(dashboard) {
  docsFor.value = null
  router.push(`/${dashboard.id}`)
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await dashboardsStore.load()
  } finally {
    loading.value = false
    renderIcons()
  }
})

watch(list, renderIcons, { deep: true })
</script>

<style scoped>
.home-view {
  position: relative;
  min-height: 100vh;
  background: var(--bg-body, #0d0d0d);
  color: var(--text-high, #fff);
  font-family: var(--font-family, 'Ubuntu', sans-serif);
}

.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 32px 64px;
}

.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  color: var(--text-low, #999);
  font-size: 14px;
  gap: 12px;
}

.home-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--text-muted, #888);
  stroke-width: 1.5;
}

@media (max-width: 640px) {
  .home-container {
    padding: 72px 20px 64px;
  }
}
</style>
