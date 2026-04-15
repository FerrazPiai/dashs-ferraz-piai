import { Router } from 'express'
import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCachedData, setCachedData, getCacheStatus } from '../lib/cache-manager.js'
import { fetchData } from '../lib/api-client.js'
import pool from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

/**
 * N8N-based execution check — shared across all dashboards.
 * Sends workflowId in POST body so N8N can check the specific workflow.
 */
const N8N_CHECK_STATUS_URL = process.env.N8N_CHECK_STATUS_URL || 'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/check-execution-status'

async function isN8nWorkflowRunning(workflowId) {
  if (!workflowId) return false
  try {
    const res = await globalThis.fetch(N8N_CHECK_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId }),
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return false
    const data = await res.json()
    return !!data.updating
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] N8N status check failed:`, err.message)
    return false
  }
}

/**
 * File-based update lock — fast local check for all dashboards.
 * Auto-expires after LOCK_TTL_MS (10 minutes).
 */
const LOCK_TTL_MS = 10 * 60 * 1000 // 10 minutos

function getLockPath(dashboardId) {
  return join(__dirname, '..', '..', 'dashboards-data', dashboardId, 'update.lock')
}

async function isUpdateLocked(dashboardId) {
  const lockPath = getLockPath(dashboardId)
  try {
    const content = await fs.readFile(lockPath, 'utf-8')
    const lock = JSON.parse(content)
    if (Date.now() - lock.lockedAt > LOCK_TTL_MS) {
      await fs.unlink(lockPath).catch(() => {})
      console.log(`[${new Date().toISOString()}] Update lock expired for ${dashboardId}`)
      return null
    }
    return lock
  } catch {
    return null
  }
}

async function setUpdateLock(dashboardId) {
  const lockPath = getLockPath(dashboardId)
  const lockDir = dirname(lockPath)
  await fs.mkdir(lockDir, { recursive: true })
  const lock = { lockedAt: Date.now() }
  await fs.writeFile(lockPath, JSON.stringify(lock), 'utf-8')
  console.log(`[${new Date().toISOString()}] Update lock SET for ${dashboardId}`)
}

async function clearUpdateLock(dashboardId) {
  const lockPath = getLockPath(dashboardId)
  await fs.unlink(lockPath).catch(() => {})
  console.log(`[${new Date().toISOString()}] Update lock CLEARED for ${dashboardId}`)
}

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

    // Verificar permissao de acesso
    const userRole = req.session?.user?.role || (req.session?.authenticated ? 'admin' : null)
    if (!(await canAccessDashboard(dashboard, userRole))) {
      return res.status(403).json({
        error: {
          message: 'Acesso negado a este dashboard',
          status: 403
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
 * GET /api/update-status/:dashboardId
 * Check if an update is currently in progress for the given dashboard.
 * Checks file lock first (fast), then N8N workflow status (authoritative).
 */
router.get('/update-status/:dashboardId', async (req, res) => {
  const { dashboardId } = req.params

  // Check file lock (fast)
  const lock = await isUpdateLocked(dashboardId)
  if (lock) {
    const elapsed = Date.now() - lock.lockedAt
    return res.json({
      updating: true,
      elapsedMs: elapsed,
      elapsedMinutes: Math.round(elapsed / 60000)
    })
  }

  // Check N8N workflow (authoritative)
  const dashboard = await findDashboard(dashboardId)
  if (dashboard?.workflowId && await isN8nWorkflowRunning(dashboard.workflowId)) {
    return res.json({ updating: true })
  }

  res.json({ updating: false })
})

/**
 * GET /api/:dashboardId/trigger-update
 * Generic trigger-update route for all dashboards.
 * Checks file lock + N8N workflow, then POSTs to the dashboard's webhook.
 * Caches response data if available.
 */
router.get('/:dashboardId/trigger-update', requireAuth, async (req, res, next) => {
  const { dashboardId } = req.params

  const dashboard = await findDashboard(dashboardId)
  if (!dashboard) {
    return res.status(404).json({
      error: { message: `Dashboard '${dashboardId}' não encontrado`, status: 404 }
    })
  }

  // Check file lock first (fast), then N8N workflow (authoritative)
  if (await isUpdateLocked(dashboardId)) {
    return res.status(409).json({
      error: { message: 'Já existe uma atualização em andamento para este dashboard.', status: 409, updating: true }
    })
  }
  if (dashboard.workflowId && await isN8nWorkflowRunning(dashboard.workflowId)) {
    return res.status(409).json({
      error: { message: 'O workflow de atualização já está em execução no N8N.', status: 409, updating: true }
    })
  }

  const webhookUrl = process.env[dashboard.webhookEndpoint]
  if (!webhookUrl) {
    return res.status(500).json({
      error: { message: `${dashboard.webhookEndpoint} não configurado no .env`, status: 500 }
    })
  }

  await setUpdateLock(dashboardId)
  try {
    console.log(`[${new Date().toISOString()}] Triggering ${dashboard.title} update webhook`)

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
        await setCachedData(dashboardId, responseData)
        console.log(`[${new Date().toISOString()}] ${dashboard.title} webhook data cached successfully`)
      }
    } catch {
      console.log(`[${new Date().toISOString()}] ${dashboard.title} webhook returned no parseable body`)
    }

    console.log(`[${new Date().toISOString()}] ${dashboard.title} webhook executado com sucesso`)
    res.json({ ok: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${dashboard.title} webhook error:`, error.message, error.stack)
    res.status(502).json({
      error: { message: 'Falha ao executar webhook de atualização', status: 502 }
    })
  } finally {
    await clearUpdateLock(dashboardId)
  }
})

/**
 * Verifica se o role do usuario pode acessar o dashboard.
 * Consulta tabela profiles no DB. Fallback para allowedRoles do JSON se DB falhar.
 * Admin sempre pode. allowed_dashboards vazio = acesso total.
 */
let _profilesCache = null
let _profilesCacheTime = 0
const PROFILES_CACHE_TTL = 30000 // 30s

async function getProfiles() {
  if (_profilesCache && Date.now() - _profilesCacheTime < PROFILES_CACHE_TTL) return _profilesCache
  try {
    const result = await pool.query('SELECT name, allowed_dashboards FROM profiles')
    _profilesCache = result.rows
    _profilesCacheTime = Date.now()
    return _profilesCache
  } catch {
    return null // fallback
  }
}

async function canAccessDashboard(dashboard, userRole) {
  if (!userRole) return false
  if (userRole === 'admin') return true

  const profiles = await getProfiles()
  if (profiles) {
    const profile = profiles.find(p => p.name === userRole)
    if (profile) {
      if (!profile.allowed_dashboards || profile.allowed_dashboards.length === 0) return true
      return profile.allowed_dashboards.includes(dashboard.id)
    }
  }

  // Fallback: allowedRoles do dashboards.json
  if (!dashboard.allowedRoles) return true
  return dashboard.allowedRoles.includes(userRole)
}

/**
 * GET /api/dashboards
 * Get list of all available dashboards (filtered by user role)
 */
router.get('/dashboards', async (req, res, next) => {
  try {
    const dashboards = await loadDashboardRegistry()
    const userRole = req.session?.user?.role || (req.session?.authenticated ? 'admin' : null)

    const filtered = []
    for (const d of dashboards) {
      if (!d.hidden && (await canAccessDashboard(d, userRole))) {
        filtered.push({ id: d.id, title: d.title, icon: d.icon, status: d.status, statusMessage: d.statusMessage })
      }
    }

    res.json({ dashboards: filtered, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

export default router
