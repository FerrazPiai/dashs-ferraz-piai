import { Router } from 'express'
import { trackActivity } from '../services/activity-logger.js'

const router = Router()

// Lista branca de eventos que o frontend pode postar (qualquer outro e' ignorado).
const ALLOWED_CLIENT_EVENTS = new Set(['page_view', 'page_leave'])

// Aceita JSON padrao E text/plain (navigator.sendBeacon envia como text/plain por padrao).
// Usa raw body + JSON.parse manual para suportar ambos.
function parseBody(req) {
  // Se o middleware express.json() ja parseou (application/json), usa direto
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string' && req.body.length > 0) {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return null
}

/**
 * POST /api/activity/track
 *
 * Recebe eventos de navegacao do frontend (via navigator.sendBeacon).
 * Resposta imediata (204) — o logger faz batch em background.
 * Silent-fail: se o payload for invalido, apenas ignora.
 */
router.post('/track', (req, res) => {
  // Responde IMEDIATAMENTE — sendBeacon nao espera a resposta mesmo
  res.status(204).end()

  try {
    const body = parseBody(req)
    if (!body) return

    const sessionUser = req.session?.user
    // Sem sessao: ignora silenciosamente (nao faz sentido logar anonimo aqui)
    if (!sessionUser) return

    // Suporta payload unico ou array (beacon pode enviar em batch via keepalive)
    const events = Array.isArray(body) ? body : [body]

    for (const evt of events) {
      if (!evt || typeof evt !== 'object') continue
      const eventType = String(evt.eventType || '').slice(0, 32)
      if (!ALLOWED_CLIENT_EVENTS.has(eventType)) continue

      trackActivity({
        userId: sessionUser.id,
        userEmail: sessionUser.email,
        eventType,
        path: typeof evt.path === 'string' ? evt.path : null,
        dashboardId: typeof evt.dashboardId === 'string' ? evt.dashboardId : null,
        durationMs: Number.isFinite(evt.durationMs) ? evt.durationMs : null,
        meta: evt.meta && typeof evt.meta === 'object' ? evt.meta : null,
        req
      })
    }
  } catch {
    // nunca falha: mesmo que body malformado, nao quebra fluxo
  }
})

export default router
