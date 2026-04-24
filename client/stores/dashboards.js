import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store dos dashboards acessiveis para o usuario logado.
 * Unica fonte de verdade — consome /api/dashboards que ja aplica
 * filtro de perfil (DB profiles.allowed_dashboards) + flag hidden.
 */
export const useDashboardsStore = defineStore('dashboards', () => {
  const list = ref([])
  let loadingPromise = null

  async function load(force = false) {
    if (!force && list.value.length > 0) return list.value
    if (loadingPromise) return loadingPromise

    loadingPromise = fetch('/api/dashboards')
      .then((r) => (r.ok ? r.json() : { dashboards: [] }))
      .then((data) => {
        list.value = data.dashboards || []
        return list.value
      })
      .catch(() => {
        list.value = []
        return list.value
      })
      .finally(() => {
        loadingPromise = null
      })

    return loadingPromise
  }

  function clear() {
    list.value = []
    loadingPromise = null
  }

  return { list, load, clear }
})
