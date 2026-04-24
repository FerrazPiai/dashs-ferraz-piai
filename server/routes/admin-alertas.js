// server/routes/admin-alertas.js
// Rotas admin para gestao do sistema de alertas (/api/admin/alertas/*).
// Todas exigem role 'admin' via middleware em admin.js (montado no index.js).

import { Router } from 'express'
import pool from '../lib/db.js'
import googleChat from '../services/google-chat-client.js'
import { dispatch, invalidateGlobalConfigCache } from '../services/alert-dispatcher.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()
router.use(requireRole(['admin']))

// ============ CANAIS ============

// GET /api/admin/alertas/channels -- lista canais cadastrados
router.get('/channels', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, provider, space_name, display_name, created_at
         FROM dashboards_hub.tc_alert_channels
        ORDER BY created_at DESC`
    )
    res.json({ channels: rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] GET /channels:`, err.message)
    res.status(500).json({ error: 'falha ao listar canais' })
  }
})

// POST /api/admin/alertas/channels -- cadastra um canal
router.post('/channels', async (req, res) => {
  const { space_name, display_name, provider } = req.body || {}
  if (!space_name || typeof space_name !== 'string') {
    return res.status(400).json({ error: 'space_name obrigatorio' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO dashboards_hub.tc_alert_channels (provider, space_name, display_name, created_by)
       VALUES (COALESCE($1, 'google_chat'), $2, $3, $4)
       ON CONFLICT (provider, space_name) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, provider, space_name, display_name, created_at`,
      [provider || null, space_name.trim(), display_name || null, req.session.user.id]
    )
    res.status(201).json({ channel: rows[0] })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] POST /channels:`, err.message)
    res.status(500).json({ error: 'falha ao cadastrar canal' })
  }
})

// DELETE /api/admin/alertas/channels/:id
router.delete('/channels/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id invalido' })
  try {
    await pool.query(`DELETE FROM dashboards_hub.tc_alert_channels WHERE id = $1`, [id])
    res.json({ ok: true })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] DELETE /channels/:id:`, err.message)
    res.status(500).json({ error: 'falha ao remover canal' })
  }
})

// GET /api/admin/alertas/spaces -- lista spaces via Google Chat API
router.get('/spaces', async (req, res) => {
  try {
    const spaces = await googleChat.listSpaces()
    res.json({ spaces })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] GET /spaces:`, err.message)
    res.status(502).json({ error: 'falha ao listar spaces', detail: err.message })
  }
})

// ============ CONFIGS (tipos de alerta) ============

// GET /api/admin/alertas/configs
router.get('/configs', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ac.alert_type, ac.enabled, ac.channel_id, ac.rate_limit_per_hour,
              ac.message_template, ac.notes, ac.updated_at,
              ch.space_name AS channel_space_name,
              ch.display_name AS channel_display_name
         FROM dashboards_hub.tc_alert_configs ac
         LEFT JOIN dashboards_hub.tc_alert_channels ch ON ch.id = ac.channel_id
        ORDER BY ac.alert_type`
    )
    // Le kill-switch do DB (tc_alert_global_config) em vez de env
    let killSwitch = false
    let killSwitchUpdatedAt = null
    try {
      const r = await pool.query(
        `SELECT enabled, updated_at FROM dashboards_hub.tc_alert_global_config WHERE id = 1`
      )
      killSwitch = !!r.rows[0]?.enabled
      killSwitchUpdatedAt = r.rows[0]?.updated_at || null
    } catch { /* tabela pode nao existir se migration 016 nao foi aplicada */ }
    res.json({
      configs: rows,
      kill_switch: killSwitch,
      kill_switch_updated_at: killSwitchUpdatedAt
    })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] GET /configs:`, err.message)
    res.status(500).json({ error: 'falha ao listar configs' })
  }
})

// PUT /api/admin/alertas/configs/:alertType
router.put('/configs/:alertType', async (req, res) => {
  const alertType = req.params.alertType
  const { enabled, channel_id, rate_limit_per_hour, message_template, notes } = req.body || {}
  try {
    const { rows } = await pool.query(
      `UPDATE dashboards_hub.tc_alert_configs
          SET enabled = COALESCE($2, enabled),
              channel_id = $3,
              rate_limit_per_hour = COALESCE($4, rate_limit_per_hour),
              message_template = COALESCE($5, message_template),
              notes = COALESCE($6, notes),
              updated_by = $7,
              updated_at = NOW()
        WHERE alert_type = $1
        RETURNING alert_type, enabled, channel_id, rate_limit_per_hour, message_template, notes, updated_at`,
      [
        alertType,
        typeof enabled === 'boolean' ? enabled : null,
        channel_id === undefined ? null : (channel_id || null),
        Number.isFinite(rate_limit_per_hour) ? rate_limit_per_hour : null,
        typeof message_template === 'string' ? message_template : null,
        typeof notes === 'string' ? notes : null,
        req.session.user.id
      ]
    )
    if (!rows[0]) return res.status(404).json({ error: 'alert_type nao encontrado' })
    res.json({ config: rows[0] })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] PUT /configs:`, err.message)
    res.status(500).json({ error: 'falha ao atualizar config' })
  }
})

// POST /api/admin/alertas/test -- envia mensagem de teste num canal
router.post('/test', async (req, res) => {
  const { channel_id, message } = req.body || {}
  if (!channel_id) return res.status(400).json({ error: 'channel_id obrigatorio' })
  try {
    const { rows } = await pool.query(
      `SELECT space_name FROM dashboards_hub.tc_alert_channels WHERE id = $1`,
      [channel_id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'canal nao encontrado' })
    const text = (message && typeof message === 'string')
      ? message
      : `🧪 *Teste de alerta*\nEnviado em ${new Date().toLocaleString('pt-BR')} por ${req.session.user.email}`
    await googleChat.sendTextMessage(rows[0].space_name, text)
    res.json({ ok: true })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] POST /test:`, err.message)
    res.status(502).json({ error: 'falha ao enviar teste', detail: err.message })
  }
})

// ============ LOG DE EVENTOS ============

// GET /api/admin/alertas/eventos?status=&alert_type=&limit=100
router.get('/eventos', async (req, res) => {
  const status = (req.query.status || '').trim()
  const alertType = (req.query.alert_type || '').trim()
  const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500)
  try {
    const where = []
    const params = []
    if (status) { params.push(status); where.push(`status = $${params.length}`) }
    if (alertType) { params.push(alertType); where.push(`alert_type = $${params.length}`) }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    params.push(limit)
    const { rows } = await pool.query(
      `SELECT id, alert_type, fingerprint, payload, status, attempts, last_error,
              channel_id, created_at, delivered_at
         FROM dashboards_hub.tc_alert_dispatch_log
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
      params
    )
    res.json({ eventos: rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] GET /eventos:`, err.message)
    res.status(500).json({ error: 'falha ao listar eventos' })
  }
})

// ============ KILL-SWITCH GLOBAL (singleton) ============

// GET /api/admin/alertas/global-config
router.get('/global-config', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gc.enabled, gc.updated_at, u.email AS updated_by_email
         FROM dashboards_hub.tc_alert_global_config gc
         LEFT JOIN dashboards_hub.users u ON u.id = gc.updated_by
        WHERE gc.id = 1`
    )
    res.json(rows[0] || { enabled: false, updated_at: null, updated_by_email: null })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] GET /global-config:`, err.message)
    res.status(500).json({ error: 'falha ao ler global-config (migration 016 aplicada?)' })
  }
})

// PUT /api/admin/alertas/global-config { enabled: boolean }
router.put('/global-config', async (req, res) => {
  const { enabled } = req.body || {}
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled deve ser boolean' })
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO dashboards_hub.tc_alert_global_config (id, enabled, updated_by, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING enabled, updated_at`,
      [enabled, req.session.user.id]
    )
    // Invalida cache pra o dispatcher pegar o novo valor imediatamente
    invalidateGlobalConfigCache()
    console.log(`[${new Date().toISOString()}] [admin-alertas] kill-switch global -> ${enabled} (por user ${req.session.user.email})`)
    res.json(rows[0])
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [admin-alertas] PUT /global-config:`, err.message)
    res.status(500).json({ error: 'falha ao atualizar global-config' })
  }
})

export default router
