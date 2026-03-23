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
      data = await fetchData(apiUrl)

      // Save to cache
      await setCachedData(cacheKey, data)
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
 * GET /api/gtm-motion/trigger-update
 * Trigger N8N data extraction webhook before refreshing dashboard data.
 * The webhook returns an empty body with status 200 on success.
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
