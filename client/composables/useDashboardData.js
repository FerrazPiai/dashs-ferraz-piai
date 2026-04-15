import { ref, shallowRef, computed } from 'vue'

/**
 * Composable for fetching and managing dashboard data
 * @param {string} dashboardId - Dashboard identifier
 * @returns {object} - { data, loading, error, fetchData, fromCache }
 */
export function useDashboardData(dashboardId) {
  const data = shallowRef(null)
  const loading = ref(false)
  const error = ref(null)
  const fromCache = ref(false)

  /**
   * Fetch dashboard data
   * @param {boolean} forceRefresh - Bypass cache
   * @param {object} params - Extra query params forwarded to the backend/API
   */
  const fetchData = async (forceRefresh = false, params = {}) => {
    loading.value = true
    error.value = null

    const MAX_RETRIES = 1
    const RETRY_DELAY = 1500

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const query = new URLSearchParams({ ...(forceRefresh ? { refresh: 'true' } : {}), ...params })
        const qs = query.toString()
        const url = `/api/data/${dashboardId}${qs ? `?${qs}` : ''}`
        const response = await fetch(url)

        if (response.status === 401) {
          window.location.href = '/login'
          return
        }

        if (!response.ok) {
          let msg = `Erro HTTP ${response.status}`
          try {
            const errorData = await response.json()
            msg = errorData.error?.message || msg
          } catch { /* body vazio */ }
          throw new Error(msg)
        }

        const text = await response.text()
        if (!text) throw new Error('Resposta vazia do servidor')

        let result
        try { result = JSON.parse(text) }
        catch { throw new Error('Resposta inválida do servidor') }

        data.value = result.data
        fromCache.value = result.fromCache
        error.value = null

        console.log(`[${new Date().toISOString()}] Dados carregados para ${dashboardId} (cache: ${result.fromCache})`)
        break // sucesso
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Erro ao buscar dados (tentativa ${attempt + 1}):`, err)

        if (attempt < MAX_RETRIES) {
          const isRetryable = err.message.includes('vazia') ||
            err.message.includes('inválida') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('Load failed')
          if (isRetryable) {
            await new Promise(r => setTimeout(r, RETRY_DELAY))
            continue
          }
        }
        error.value = err.message
        break
      }
    }

    loading.value = false
  }

  const hasData = computed(() => data.value !== null)

  return {
    data,
    loading,
    error,
    fetchData,
    fromCache,
    hasData
  }
}
