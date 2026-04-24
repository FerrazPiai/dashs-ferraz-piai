import pool from '../lib/db.js'

// Buffer em memoria + flush periodico para nao sobrecarregar o Postgres.
// 1 INSERT batch (via unnest) em vez de N inserts; fire-and-forget no hot path.

const BUFFER_FLUSH_MS = 5000         // flush a cada 5s
const BUFFER_MAX_SIZE = 50           // flush imediato se >= 50 eventos
const BUFFER_HARD_CAP = 500          // dropa os mais antigos se algo der muito errado
const USER_AGENT_MAX = 1000          // trunca user agent

let buffer = []
let flushTimer = null
let flushing = false

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush().catch(() => { /* silenciado: logado no pool.on('error') */ })
  }, BUFFER_FLUSH_MS)
}

function clip(value, max) {
  if (value == null) return null
  const s = String(value)
  return s.length > max ? s.slice(0, max) : s
}

function getIp(req) {
  if (!req) return null
  const fwd = req.headers?.['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim().slice(0, 64)
  return clip(req.ip, 64)
}

/**
 * Enfileira um evento de atividade. Sincrono, nunca await. Nunca lanca.
 *
 * @param {object} params
 * @param {number|null} params.userId
 * @param {string|null} params.userEmail
 * @param {string}  params.eventType   login|logout|login_failed|page_view|page_leave|session_check|password_change
 * @param {string|null} params.path
 * @param {string|null} params.dashboardId
 * @param {string|null} params.loginMethod
 * @param {number|null} params.durationMs
 * @param {object|null} params.meta
 * @param {import('express').Request|null} params.req
 */
export function trackActivity({
  userId = null,
  userEmail = null,
  eventType,
  path = null,
  dashboardId = null,
  loginMethod = null,
  durationMs = null,
  meta = null,
  req = null
}) {
  if (!eventType) return

  if (buffer.length >= BUFFER_HARD_CAP) {
    // protecao anti-memory-leak: dropa o mais antigo se algo travou o flush
    buffer.shift()
  }

  buffer.push({
    user_id: Number.isFinite(userId) && userId > 0 ? userId : null,
    user_email: clip(userEmail, 255),
    event_type: clip(eventType, 32),
    path: clip(path, 500),
    dashboard_id: clip(dashboardId, 100),
    login_method: clip(loginMethod, 20),
    ip_address: req ? getIp(req) : null,
    user_agent: req ? clip(req.get?.('user-agent'), USER_AGENT_MAX) : null,
    duration_ms: Number.isFinite(durationMs) ? Math.max(0, Math.min(durationMs, 2_147_483_647)) : null,
    meta: meta && typeof meta === 'object' ? meta : null
  })

  if (buffer.length >= BUFFER_MAX_SIZE) {
    flush().catch(() => { /* silent */ })
  } else {
    scheduleFlush()
  }
}

async function flush() {
  if (flushing) return
  if (buffer.length === 0) return

  flushing = true
  const batch = buffer.splice(0, buffer.length)

  try {
    // unnest() permite 1 INSERT com N linhas — pg faz prepared statement uma vez so
    await pool.query(
      `INSERT INTO dashboards_hub.user_activity_log
         (user_id, user_email, event_type, path, dashboard_id, login_method,
          ip_address, user_agent, duration_ms, meta)
       SELECT * FROM UNNEST(
         $1::int[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[],
         $6::varchar[], $7::varchar[], $8::text[], $9::int[], $10::jsonb[]
       )`,
      [
        batch.map(e => e.user_id),
        batch.map(e => e.user_email),
        batch.map(e => e.event_type),
        batch.map(e => e.path),
        batch.map(e => e.dashboard_id),
        batch.map(e => e.login_method),
        batch.map(e => e.ip_address),
        batch.map(e => e.user_agent),
        batch.map(e => e.duration_ms),
        batch.map(e => (e.meta ? JSON.stringify(e.meta) : null))
      ]
    )
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [activity-logger] flush falhou:`, err.message)
    // Nao re-enfileira: evita loop infinito se a tabela estiver quebrada.
    // Perdemos um batch de eventos, nao vale a pena parar a app por isso.
  } finally {
    flushing = false
    if (buffer.length > 0) scheduleFlush()
  }
}

/**
 * Flush forcado (usado em shutdown gracioso).
 */
export async function flushActivity() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  await flush()
}

// Flush em shutdown
process.on('SIGTERM', () => { flushActivity().catch(() => {}) })
process.on('beforeExit', () => { flushActivity().catch(() => {}) })
