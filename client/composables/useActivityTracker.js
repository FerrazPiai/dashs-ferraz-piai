/**
 * useActivityTracker — envia eventos de navegacao para /api/activity/track
 * usando navigator.sendBeacon (nao-bloqueante, confiavel ate mesmo no unload).
 *
 * Design:
 * - Debounce: mesma rota em < DEBOUNCE_MS e' ignorada (evita duplicidade do router)
 * - Batch em memoria: eventos sao acumulados e flushed a cada FLUSH_MS
 * - flush() usa sendBeacon (retorna imediatamente); fallback fetch(keepalive)
 * - page_leave: disparado em visibilitychange/pagehide com duracao na pagina
 * - Falha silenciosa: nunca lanca, nunca bloqueia UI
 */

const ENDPOINT = '/api/activity/track'
const DEBOUNCE_MS = 1500
const FLUSH_MS = 3000
const MAX_BATCH = 20

let queue = []
let flushTimer = null
let lastPath = null
let lastPathAt = 0

// Estado para medir duracao em pagina
let currentPath = null
let currentDashboardId = null
let currentEnteredAt = 0

let initialized = false

function send(payload) {
  try {
    const body = JSON.stringify(payload)
    // sendBeacon: envio assincrono garantido pelo navegador ate durante unload
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // Usa Blob com text/plain para ficar dentro da policy de sendBeacon sem CORS preflight
      const blob = new Blob([body], { type: 'text/plain' })
      const ok = navigator.sendBeacon(ENDPOINT, blob)
      if (ok) return true
    }
    // fallback: fetch com keepalive (tambem sobrevive ao unload)
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      keepalive: true,
      credentials: 'same-origin'
    }).catch(() => {})
    return true
  } catch {
    return false
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, FLUSH_MS)
}

function flush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  if (queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  send(batch.length === 1 ? batch[0] : batch)
}

function enqueue(event) {
  queue.push(event)
  if (queue.length >= MAX_BATCH) flush()
  else scheduleFlush()
}

/**
 * Registra um page_view. Chamar apos cada navegacao completada.
 */
export function trackPageView({ path, dashboardId = null, meta = null }) {
  if (!path) return

  // Fecha a pagina anterior (registra duracao)
  if (currentPath && currentPath !== path) {
    const duration = Date.now() - currentEnteredAt
    if (duration > 0 && duration < 24 * 60 * 60 * 1000) {
      enqueue({
        eventType: 'page_leave',
        path: currentPath,
        dashboardId: currentDashboardId,
        durationMs: duration
      })
    }
  }

  // Dedup: mesma rota em < DEBOUNCE_MS nao gera page_view duplicado
  const now = Date.now()
  if (path === lastPath && (now - lastPathAt) < DEBOUNCE_MS) return
  lastPath = path
  lastPathAt = now

  currentPath = path
  currentDashboardId = dashboardId
  currentEnteredAt = now

  enqueue({
    eventType: 'page_view',
    path,
    dashboardId,
    meta
  })
}

/**
 * Flush imediato + page_leave final. Chamar em logout/unload.
 */
export function flushTracker() {
  if (currentPath) {
    const duration = Date.now() - currentEnteredAt
    if (duration > 0 && duration < 24 * 60 * 60 * 1000) {
      enqueue({
        eventType: 'page_leave',
        path: currentPath,
        dashboardId: currentDashboardId,
        durationMs: duration
      })
    }
    currentPath = null
    currentDashboardId = null
    currentEnteredAt = 0
  }
  flush()
}

/**
 * Setup one-time: visibilitychange + pagehide flush.
 * Idempotente — chamar 1x no boot da app.
 */
export function initActivityTracker() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // Flush quando aba vai para background ou fecha
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushTracker()
  })
  window.addEventListener('pagehide', () => { flushTracker() })
  window.addEventListener('beforeunload', () => { flushTracker() })
}
