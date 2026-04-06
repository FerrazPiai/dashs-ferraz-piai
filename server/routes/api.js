import { Router } from 'express'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCachedData, setCachedData, getCacheStatus } from '../lib/cache-manager.js'
import { fetchData } from '../lib/api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

/**
 * Load dashboard registry
 * @returns {Promise<Array>} Array of dashboard configurations
 */
async function loadDashboardRegistry() {
  try {
    const registryPath = join(__dirname, '..', '..', 'config', 'dashboards.json')
    const registryContent = await fs.readFile(registryPath, 'utf-8')
    return JSON.parse(registryContent)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro ao carregar registry:`, error.message)
    throw new Error('Failed to load dashboard registry')
  }
}

/**
 * Find dashboard configuration by ID
 * @param {string} dashboardId - Dashboard identifier
 * @returns {Promise<object|null>} Dashboard config or null
 */
async function findDashboard(dashboardId) {
  const dashboards = await loadDashboardRegistry()
  return dashboards.find(d => d.id === dashboardId) || null
}

/**
 * GET /api/data/:dashboardId
 * Fetch dashboard data (from cache or external API)
 * Query params:
 *   - refresh=true: Bypass cache and fetch fresh data
 */
router.get('/data/:dashboardId', async (req, res, next) => {
  const { dashboardId } = req.params
  const { refresh, ...apiParams } = req.query
  const forceRefresh = refresh === 'true'

  try {
    // Find dashboard configuration
    const dashboard = await findDashboard(dashboardId)

    if (!dashboard) {
      return res.status(404).json({
        error: {
          message: `Dashboard '${dashboardId}' não encontrado`,
          status: 404
        }
      })
    }

    // Check if API endpoint is configured
    const apiEndpoint = process.env[dashboard.apiEndpoint]

    if (!apiEndpoint) {
      return res.status(500).json({
        error: {
          message: `Endpoint da API não configurado: ${dashboard.apiEndpoint}`,
          status: 500
        }
      })
    }

    // Build cache key — include extra params so each period gets its own cache
    const paramSuffix = Object.keys(apiParams).length > 0
      ? '--' + Object.values(apiParams).join('--')
      : ''
    const cacheKey = `${dashboardId}${paramSuffix}`

    // Build external API URL with params
    const qs = Object.keys(apiParams).length > 0
      ? `?${new URLSearchParams(apiParams).toString()}`
      : ''
    const apiUrl = `${apiEndpoint}${qs}`

    let data
    let fromCache = false

    // Try to get from cache (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await getCachedData(cacheKey, dashboard.cacheTTL)

      if (cachedData) {
        data = cachedData
        fromCache = true
      }
    }

    // Fetch from API if no cache or force refresh
    if (!data) {
      console.log(`[${new Date().toISOString()}] Fetching fresh data for ${cacheKey}`)

      try {
        data = await fetchData(apiUrl)
      } catch (fetchErr) {
        console.warn(`[${new Date().toISOString()}] Fresh fetch failed for ${cacheKey}:`, fetchErr.message)
        data = null
      }

      // If API returned empty/null, fallback to cache (e.g. POST trigger may have cached data)
      const isEmpty = !data || (Array.isArray(data) && data.length === 0) ||
        (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)

      // Detect null-payload responses: array with inner data object where all fields are null
      const isNullPayload = !isEmpty && Array.isArray(data) && data.length > 0 &&
        data[0]?.data && typeof data[0].data === 'object' &&
        Object.values(data[0].data).every(v => v === null)

      if (isEmpty || isNullPayload) {
        console.log(`[${new Date().toISOString()}] Fresh data ${isNullPayload ? 'has null payload' : 'empty'} for ${cacheKey}, trying cache fallback`)
        const fallback = await getCachedData(cacheKey, dashboard.cacheTTL)
        if (fallback) {
          data = fallback
          fromCache = true
        } else if (isNullPayload) {
          data = null // don't serve null-payload data
        }
      }

      // Save to cache if we got valid data (skip null payloads)
      if (data && !fromCache) {
        await setCachedData(cacheKey, data)
      }
    }

    // If no data after all attempts, return 503
    if (!data) {
      return res.status(503).json({
        error: {
          message: 'Dados não disponíveis. Clique em Atualizar para buscar dados.',
          status: 503
        }
      })
    }

    // Return data
    res.set('Cache-Control', 'no-store')
    res.json({
      data,
      fromCache,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/cache/status/:dashboardId
 * Get cache status for a dashboard
 */
router.get('/cache/status/:dashboardId', async (req, res, next) => {
  const { dashboardId } = req.params

  try {
    // Find dashboard configuration
    const dashboard = await findDashboard(dashboardId)

    if (!dashboard) {
      return res.status(404).json({
        error: {
          message: `Dashboard '${dashboardId}' não encontrado`,
          status: 404
        }
      })
    }

    // Get cache status
    const status = await getCacheStatus(dashboardId, dashboard.cacheTTL)

    res.json({
      dashboardId,
      cache: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/marketing-vendas/trigger-update
 * Trigger N8N data extraction webhook before refreshing Marketing & Vendas data.
 */
router.get('/marketing-vendas/trigger-update', async (req, res, next) => {
  const webhookUrl = 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/82892823-713e-4652-a4d2-137402cfe280'

  try {
    console.log(`[${new Date().toISOString()}] Triggering Marketing & Vendas update webhook`)

    const response = await globalThis.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(300000)
    })

    if (!response.ok) {
      throw new Error(`Webhook retornou HTTP ${response.status}`)
    }

    console.log(`[${new Date().toISOString()}] Marketing & Vendas webhook executado com sucesso`)
    res.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Marketing & Vendas webhook error:`, error.message)
    res.status(502).json({
      error: { message: 'Falha ao executar webhook de atualização', status: 502 }
    })
  }
})

/**
 * GET /api/gtm-motion/trigger-update
 * Trigger N8N data extraction webhook before refreshing dashboard data.
 * The webhook may return the refreshed data in its response body — if so,
 * we cache it so the subsequent GET /api/data/gtm-motion finds it.
 */
router.get('/gtm-motion/trigger-update', async (req, res, next) => {
  const webhookUrl = 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/82892823-713e-4652-a4d2-137402cfe280'

  try {
    console.log(`[${new Date().toISOString()}] Triggering GTM Motion update webhook`)

    const response = await globalThis.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(300000)
    })

    if (!response.ok) {
      throw new Error(`Webhook retornou HTTP ${response.status}`)
    }

    // Try to capture response data and cache it for the subsequent GET
    try {
      const responseData = await response.json()
      if (responseData && (Array.isArray(responseData) ? responseData.length > 0 : Object.keys(responseData).length > 0)) {
        await setCachedData('gtm-motion', responseData)
        console.log(`[${new Date().toISOString()}] GTM Motion webhook data cached successfully`)
      }
    } catch {
      // Webhook may return empty body — that's ok
      console.log(`[${new Date().toISOString()}] GTM Motion webhook returned no parseable body`)
    }

    console.log(`[${new Date().toISOString()}] GTM Motion webhook executado com sucesso`)
    res.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] GTM Motion webhook error:`, error.message, error.stack)
    res.status(502).json({
      error: { message: 'Falha ao executar webhook de atualização', status: 502 }
    })
  }
})

/**
 * GET /api/tx-conv-saber-monetizacao/trigger-update
 * Trigger N8N data extraction webhook before refreshing dashboard data.
 * Same pattern as GTM Motion: POST to update webhook, cache response if available.
 */
router.get('/tx-conv-saber-monetizacao/trigger-update', async (req, res, next) => {
  const webhookUrl = 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/atualizar-cache-dash-conv-saber-para-monetizacao'

  try {
    console.log(`[${new Date().toISOString()}] Triggering Tx Conv Saber Monetização update webhook`)

    const response = await globalThis.fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(300000)
    })

    if (!response.ok) {
      throw new Error(`Webhook retornou HTTP ${response.status}`)
    }

    // Try to capture response data and cache it for the subsequent GET
    try {
      const responseData = await response.json()
      if (responseData && (Array.isArray(responseData) ? responseData.length > 0 : Object.keys(responseData).length > 0)) {
        await setCachedData('tx-conv-saber-monetizacao', responseData)
        console.log(`[${new Date().toISOString()}] Tx Conv Saber Monetização webhook data cached successfully`)
      }
    } catch {
      console.log(`[${new Date().toISOString()}] Tx Conv Saber Monetização webhook returned no parseable body`)
    }

    console.log(`[${new Date().toISOString()}] Tx Conv Saber Monetização webhook executado com sucesso`)
    res.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Tx Conv Saber Monetização webhook error:`, error.message, error.stack)
    res.status(502).json({
      error: { message: 'Falha ao executar webhook de atualização', status: 502 }
    })
  }
})

/**
 * GET /api/dashboards
 * Get list of all available dashboards
 */
router.get('/dashboards', async (req, res, next) => {
  try {
    const dashboards = await loadDashboardRegistry()

    res.json({
      dashboards: dashboards.filter(d => !d.hidden).map(d => ({
        id: d.id,
        title: d.title,
        icon: d.icon,
        status: d.status,
        statusMessage: d.statusMessage
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
})

export default router
