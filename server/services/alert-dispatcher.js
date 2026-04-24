// server/services/alert-dispatcher.js
//
// Coracao do sistema de alertas. Processa cada evento do event-bus em ordem:
//   1) kill-switch global (tc_alert_global_config, admin toggla via UI)
//   2) busca config (tc_alert_configs) -> se disabled, skip
//   3) resolve canal (tc_alert_channels)
//   4) calcula fingerprint sha256
//   5) INSERT ... ON CONFLICT DO NOTHING (dedup atomica)
//   6) rate limit por tipo (tc_alert_configs.rate_limit_per_hour)
//   7) renderiza template + envia via Google Chat
//   8) retry com backoff exp (2s, 8s, 30s). Max 3 tentativas. Depois -> status='failed', para.
//   9) marca delivered / failed / rate_limited

import crypto from 'node:crypto'
import pool from '../lib/db.js'
import bus from './event-bus.js'
import googleChat from './google-chat-client.js'
import { faseInfo } from './stage-detector.js'

const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL || 'https://edisonv4companycom.kommo.com'

// Kill-switch global vem de tc_alert_global_config (DB, singleton id=1).
// Cache de 10s evita SELECT a cada evento sem bloquear toggle rapido pelo admin.
const GLOBAL_CONFIG_TTL_MS = 10_000
let _globalCache = { enabled: false, fetchedAt: 0 }

async function isKillSwitchOn() {
  const now = Date.now()
  if (now - _globalCache.fetchedAt < GLOBAL_CONFIG_TTL_MS) {
    return _globalCache.enabled
  }
  try {
    const { rows } = await pool.query(
      `SELECT enabled FROM dashboards_hub.tc_alert_global_config WHERE id = 1`
    )
    _globalCache = { enabled: !!rows[0]?.enabled, fetchedAt: now }
  } catch (err) {
    // Tabela nao existe ainda (migration nao aplicada) — fail-safe: desliga.
    console.warn(`[${new Date().toISOString()}] [alert-dispatcher] global_config indisponivel: ${err.message} — assumindo disabled`)
    _globalCache = { enabled: false, fetchedAt: now }
  }
  return _globalCache.enabled
}

/**
 * Invalida o cache — chamar apos PUT /global-config para efeito imediato.
 */
export function invalidateGlobalConfigCache() {
  _globalCache = { enabled: false, fetchedAt: 0 }
}

function computeFingerprint({ alert_type, lead_id, fase_id, analise_id }) {
  const parts = [alert_type, lead_id ?? '', fase_id ?? '', analise_id ?? ''].join('|')
  return crypto.createHash('sha256').update(parts).digest('hex')
}

async function loadConfig(alertType) {
  const { rows } = await pool.query(
    `SELECT ac.*, ch.space_name, ch.display_name AS channel_display_name
       FROM dashboards_hub.tc_alert_configs ac
       LEFT JOIN dashboards_hub.tc_alert_channels ch ON ch.id = ac.channel_id
      WHERE ac.alert_type = $1`,
    [alertType]
  )
  return rows[0] || null
}

async function logSkipped(alertType, fingerprint, payload, reason, channelId = null) {
  try {
    await pool.query(
      `INSERT INTO dashboards_hub.tc_alert_dispatch_log
         (alert_type, fingerprint, payload, status, last_error, channel_id)
       VALUES ($1, $2, $3, 'skipped', $4, $5)
       ON CONFLICT (fingerprint) DO NOTHING`,
      [alertType, fingerprint, payload, reason, channelId]
    )
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [alert-dispatcher] logSkipped falhou:`, err.message)
  }
}

async function tryClaimDispatch(alertType, fingerprint, payload, channelId) {
  const { rows } = await pool.query(
    `INSERT INTO dashboards_hub.tc_alert_dispatch_log
       (alert_type, fingerprint, payload, status, channel_id)
     VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (fingerprint) DO NOTHING
     RETURNING id`,
    [alertType, fingerprint, payload, channelId]
  )
  return rows[0]?.id || null
}

async function isRateLimited(alertType, maxPerHour) {
  if (!maxPerHour || maxPerHour <= 0) return false
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM dashboards_hub.tc_alert_dispatch_log
      WHERE alert_type = $1
        AND status = 'delivered'
        AND created_at > NOW() - INTERVAL '1 hour'`,
    [alertType]
  )
  return (rows[0]?.n || 0) >= maxPerHour
}

function renderTemplate(template, vars) {
  if (!template) return ''
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars?.[key]
    return v == null || v === '' ? '—' : String(v)
  })
}

function fmtTimestampBr(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

async function fetchLeadContext(leadId) {
  if (!leadId) return {}
  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.company_name, l.status_id, l.responsible_user_id,
              u.name AS owner_name
         FROM dashboards_hub.tc_kommo_leads l
         LEFT JOIN dashboards_hub.tc_kommo_users u ON u.id = l.responsible_user_id
        WHERE l.id = $1`,
      [leadId]
    )
    return rows[0] || {}
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [alert-dispatcher] fetchLeadContext:`, err.message)
    return {}
  }
}

function buildVars(alertType, payload, leadCtx) {
  const fase = payload.faseSlug
    ? faseInfo(Object.keys({ [payload.newStatusId || '']: 1 })[0])
    : null
  return {
    empresa: leadCtx.company_name || leadCtx.name || '—',
    lead_id: payload.leadId || leadCtx.id || '—',
    owner_name: leadCtx.owner_name || '—',
    fase_nome: payload.faseNome || payload.faseSlug || '—',
    fase_anterior: payload.faseAnterior || '—',
    fase_nova: payload.faseNova || '—',
    motivo_curto: payload.motivo || '—',
    lista_materiais: Array.isArray(payload.missing) && payload.missing.length
      ? payload.missing.join(', ')
      : '—',
    kommo_url: payload.leadId ? `${KOMMO_BASE_URL}/leads/detail/${payload.leadId}` : KOMMO_BASE_URL,
    timestamp_br: fmtTimestampBr()
  }
}

async function sendWithRetry(dispatchId, spaceName, text) {
  const delays = [2000, 8000, 30000]
  let lastErr = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await googleChat.sendTextMessage(spaceName, text)
      await pool.query(
        `UPDATE dashboards_hub.tc_alert_dispatch_log
            SET status='delivered', attempts=$1, delivered_at=NOW()
          WHERE id=$2`,
        [attempt, dispatchId]
      )
      return { ok: true, attempts: attempt }
    } catch (err) {
      lastErr = err
      console.error(`[${new Date().toISOString()}] [alert-dispatcher] tentativa ${attempt}/3 falhou: ${err.message}`)
      if (attempt < 3) await new Promise((r) => setTimeout(r, delays[attempt - 1]))
    }
  }
  // Esgotou — marcar failed e NAO tentar mais
  await pool.query(
    `UPDATE dashboards_hub.tc_alert_dispatch_log
        SET status='failed', attempts=3, last_error=$1
      WHERE id=$2`,
    [lastErr?.message?.slice(0, 1000) || 'unknown', dispatchId]
  )
  return { ok: false, error: lastErr?.message }
}

/**
 * Processa um evento emitido no bus. Ponto de entrada unico.
 * @param {string} alertType
 * @param {object} payload
 */
async function dispatch(alertType, payload = {}) {
  const fingerprint = computeFingerprint({
    alert_type: alertType,
    lead_id: payload.leadId,
    fase_id: payload.faseSlug || payload.newStatusId || payload.oldStatusId,
    analise_id: payload.analiseId
  })

  // 1) Kill-switch global (DB, singleton tc_alert_global_config)
  if (!(await isKillSwitchOn())) {
    await logSkipped(alertType, fingerprint, payload, 'kill_switch global OFF')
    return { skipped: 'kill_switch' }
  }

  // 2) Config existe e habilitado?
  const config = await loadConfig(alertType)
  if (!config) {
    await logSkipped(alertType, fingerprint, payload, 'config inexistente')
    return { skipped: 'no_config' }
  }
  if (!config.enabled) {
    await logSkipped(alertType, fingerprint, payload, 'alert_type desabilitado', config.channel_id)
    return { skipped: 'disabled' }
  }

  // 3) Canal resolvido?
  if (!config.channel_id || !config.space_name) {
    await logSkipped(alertType, fingerprint, payload, 'sem canal configurado', config.channel_id)
    return { skipped: 'no_channel' }
  }

  // 4+5) Insert com UNIQUE - duplicata silenciosa
  const dispatchId = await tryClaimDispatch(alertType, fingerprint, payload, config.channel_id)
  if (!dispatchId) {
    console.log(`[${new Date().toISOString()}] [alert-dispatcher] dedup hit: ${alertType} / ${fingerprint.slice(0, 12)}...`)
    return { skipped: 'dedup' }
  }

  // 6) Rate limit
  if (await isRateLimited(alertType, config.rate_limit_per_hour)) {
    await pool.query(
      `UPDATE dashboards_hub.tc_alert_dispatch_log
          SET status='rate_limited', last_error='rate_limit_per_hour excedido'
        WHERE id=$1`,
      [dispatchId]
    )
    return { skipped: 'rate_limited' }
  }

  // 7) Render + 8) Send com retry
  const leadCtx = await fetchLeadContext(payload.leadId)
  const vars = buildVars(alertType, payload, leadCtx)
  const text = renderTemplate(config.message_template || '(sem template configurado)', vars)

  const result = await sendWithRetry(dispatchId, config.space_name, text)
  return { dispatchId, ...result }
}

let _started = false

/**
 * Conecta os listeners ao event-bus. Chamar 1x no server/index.js.
 */
export function startAlertDispatcher() {
  if (_started) return
  _started = true

  bus.on('analysis.bad_quality', (p) => dispatch('analysis.bad_quality', p).catch((e) =>
    console.error(`[${new Date().toISOString()}] [alert-dispatcher] bad_quality erro:`, e.message)))

  bus.on('analysis.skipped_no_transcription', (p) => dispatch('analysis.skipped_no_transcription', p).catch((e) =>
    console.error(`[${new Date().toISOString()}] [alert-dispatcher] skipped_no_transcription erro:`, e.message)))

  bus.on('lead.stage_regressed', (p) => dispatch('lead.stage_regressed', p).catch((e) =>
    console.error(`[${new Date().toISOString()}] [alert-dispatcher] stage_regressed erro:`, e.message)))

  console.log(`[${new Date().toISOString()}] [alert-dispatcher] iniciado (kill-switch em tc_alert_global_config)`)
}

export { dispatch, computeFingerprint }
export default { startAlertDispatcher, dispatch, computeFingerprint }
