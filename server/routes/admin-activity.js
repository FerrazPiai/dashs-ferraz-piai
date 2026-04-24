import { Router } from 'express'
import pool from '../lib/db.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

// Todas as rotas exigem role 'admin'
router.use(requireRole(['admin']))

function parseIntSafe(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

function clampDays(days) {
  return Math.max(1, Math.min(days, 365))
}

/**
 * GET /api/admin/activity/summary?days=7
 *
 * Retorna panorama geral:
 *  - totais por tipo de evento
 *  - contagem de usuarios ativos
 *  - top pages (page_view) no periodo
 *  - top usuarios (por num de page_views no periodo)
 */
router.get('/summary', async (req, res) => {
  const days = clampDays(parseIntSafe(req.query.days, 7))

  try {
    const [totals, activeUsers, topPages, topUsers] = await Promise.all([
      pool.query(
        `SELECT event_type, COUNT(*)::int AS total
           FROM dashboards_hub.user_activity_log
          WHERE created_at >= NOW() - ($1 || ' days')::interval
          GROUP BY event_type`,
        [String(days)]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS active_users
           FROM dashboards_hub.user_activity_log
          WHERE created_at >= NOW() - ($1 || ' days')::interval
            AND user_id IS NOT NULL
            AND event_type = 'page_view'`,
        [String(days)]
      ),
      pool.query(
        `SELECT COALESCE(dashboard_id, path) AS page,
                COUNT(*)::int AS views,
                COUNT(DISTINCT user_id)::int AS unique_users
           FROM dashboards_hub.user_activity_log
          WHERE created_at >= NOW() - ($1 || ' days')::interval
            AND event_type = 'page_view'
            AND (dashboard_id IS NOT NULL OR path IS NOT NULL)
          GROUP BY 1
          ORDER BY views DESC
          LIMIT 15`,
        [String(days)]
      ),
      pool.query(
        `SELECT l.user_id,
                COALESCE(u.email, l.user_email) AS email,
                u.name AS name,
                COUNT(*)::int AS views,
                COUNT(DISTINCT COALESCE(l.dashboard_id, l.path))::int AS unique_pages,
                MAX(l.created_at) AS last_activity
           FROM dashboards_hub.user_activity_log l
           LEFT JOIN dashboards_hub.users u ON u.id = l.user_id
          WHERE l.created_at >= NOW() - ($1 || ' days')::interval
            AND l.user_id IS NOT NULL
            AND l.event_type = 'page_view'
          GROUP BY l.user_id, u.email, l.user_email, u.name
          ORDER BY views DESC
          LIMIT 15`,
        [String(days)]
      )
    ])

    res.json({
      days,
      totals: totals.rows,
      active_users: activeUsers.rows[0]?.active_users || 0,
      top_pages: topPages.rows,
      top_users: topUsers.rows
    })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin activity summary error:`, err.message)
    res.status(500).json({ error: 'Erro ao gerar resumo de atividade' })
  }
})

/**
 * GET /api/admin/activity/users
 *
 * Lista de usuarios com ultima atividade (baseado em `users` + LEFT JOIN no log).
 * Sempre retorna todos os usuarios ativos, mesmo quem nunca acessou.
 */
router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id,
              u.email,
              u.name,
              u.role,
              u.active,
              u.created_at,
              (
                SELECT MAX(l.created_at)
                  FROM dashboards_hub.user_activity_log l
                 WHERE l.user_id = u.id
                   AND l.event_type IN ('login', 'page_view')
              ) AS last_activity,
              (
                SELECT MAX(l.created_at)
                  FROM dashboards_hub.user_activity_log l
                 WHERE l.user_id = u.id
                   AND l.event_type = 'login'
              ) AS last_login,
              (
                SELECT COUNT(*)::int
                  FROM dashboards_hub.user_activity_log l
                 WHERE l.user_id = u.id
                   AND l.event_type = 'page_view'
                   AND l.created_at >= NOW() - INTERVAL '7 days'
              ) AS views_7d,
              (
                SELECT COUNT(*)::int
                  FROM dashboards_hub.user_activity_log l
                 WHERE l.user_id = u.id
                   AND l.event_type = 'login'
                   AND l.created_at >= NOW() - INTERVAL '30 days'
              ) AS logins_30d
         FROM dashboards_hub.users u
        ORDER BY last_activity DESC NULLS LAST, u.email ASC`
    )

    res.json({ users: result.rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin activity users error:`, err.message)
    res.status(500).json({ error: 'Erro ao listar usuarios' })
  }
})

/**
 * GET /api/admin/activity/events?user_id=&event_type=&limit=100&offset=0
 *
 * Eventos brutos com paginacao.
 */
router.get('/events', async (req, res) => {
  const userId = req.query.user_id ? parseIntSafe(req.query.user_id, null) : null
  const eventType = typeof req.query.event_type === 'string' ? req.query.event_type.trim() : ''
  const limit = Math.min(Math.max(parseIntSafe(req.query.limit, 100), 1), 500)
  const offset = Math.max(parseIntSafe(req.query.offset, 0), 0)

  try {
    const where = []
    const params = []

    if (Number.isFinite(userId)) {
      params.push(userId)
      where.push(`l.user_id = $${params.length}`)
    }
    if (eventType) {
      params.push(eventType)
      where.push(`l.event_type = $${params.length}`)
    }

    params.push(limit)
    const limitIdx = params.length
    params.push(offset)
    const offsetIdx = params.length

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows } = await pool.query(
      `SELECT l.id,
              l.user_id,
              COALESCE(u.email, l.user_email) AS user_email,
              u.name AS user_name,
              l.event_type,
              l.path,
              l.dashboard_id,
              l.login_method,
              l.ip_address,
              l.duration_ms,
              l.meta,
              l.created_at
         FROM dashboards_hub.user_activity_log l
         LEFT JOIN dashboards_hub.users u ON u.id = l.user_id
         ${whereSql}
         ORDER BY l.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    )

    res.json({ events: rows, limit, offset })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin activity events error:`, err.message)
    res.status(500).json({ error: 'Erro ao listar eventos' })
  }
})

/**
 * GET /api/admin/activity/timeline?days=14
 *
 * Serie temporal: page_views por dia no periodo.
 */
router.get('/timeline', async (req, res) => {
  const days = clampDays(parseIntSafe(req.query.days, 14))

  try {
    const { rows } = await pool.query(
      `SELECT
         date_trunc('day', created_at) AS day,
         COUNT(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
         COUNT(*) FILTER (WHERE event_type = 'login')::int AS logins,
         COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'page_view')::int AS unique_users
        FROM dashboards_hub.user_activity_log
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY day
        ORDER BY day ASC`,
      [String(days)]
    )

    res.json({ days, timeline: rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin activity timeline error:`, err.message)
    res.status(500).json({ error: 'Erro ao gerar timeline' })
  }
})

export default router
