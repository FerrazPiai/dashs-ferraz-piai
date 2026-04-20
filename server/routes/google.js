// server/routes/google.js
// OAuth 2.0 per-user para leitura de Drive/Docs/Slides (D-01, D-03, D-05).
// Flow secundario — nao substitui /api/auth/google (login openid).

import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  REQUIRED_SCOPES,
  storeTokens,
  getStatus,
  revokeTokens
} from '../services/google-oauth.js'

const router = Router()

// Callback dedicado do flow Drive (distinto do login). Cai em GOOGLE_DRIVE_CALLBACK_URL,
// ou monta `${GOOGLE_CALLBACK_URL}/drive` como fallback (mantem compatibilidade com .env atual).
function getDriveCallbackUrl() {
  if (process.env.GOOGLE_DRIVE_CALLBACK_URL) return process.env.GOOGLE_DRIVE_CALLBACK_URL
  const base = process.env.GOOGLE_CALLBACK_URL
  if (!base) return null
  // Substitui o sufixo /google/callback por /google/connect-drive/callback quando possivel
  if (base.endsWith('/google/callback')) return base.replace(/\/google\/callback$/, '/google/connect-drive/callback')
  // Fallback generico: anexa /drive ao callback existente
  return `${base.replace(/\/$/, '')}/drive`
}

function isSafeResumeUrl(raw) {
  if (typeof raw !== 'string' || !raw) return false
  if (!raw.startsWith('/')) return false
  if (raw.startsWith('//')) return false
  if (raw.includes('://')) return false
  if (raw.startsWith('/\\')) return false
  return true
}

// ── POST /api/google/connect-drive/start ──
// Body opcional: { resume_url }
router.post('/connect-drive/start', requireAuth, (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const callbackUrl = getDriveCallbackUrl()

  if (!clientId || !callbackUrl) {
    console.error(`[${new Date().toISOString()}] Google Drive OAuth nao configurado (GOOGLE_CLIENT_ID / GOOGLE_DRIVE_CALLBACK_URL)`)
    return res.status(500).json({ error: 'Google Drive OAuth nao configurado' })
  }

  const state = randomBytes(16).toString('hex')
  req.session.googleOauthState = state

  const resume = req.body?.resume_url
  req.session.googleOauthResume = isSafeResumeUrl(resume) ? resume : null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: REQUIRED_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state
  })

  req.session.save(() => {
    res.json({ authorize_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
  })
})

// ── GET /api/google/connect-drive/callback?code=...&state=... ──
router.get('/connect-drive/callback', requireAuth, async (req, res) => {
  const { code, state, error: oauthError } = req.query
  const resumeUrl = req.session.googleOauthResume && isSafeResumeUrl(req.session.googleOauthResume)
    ? req.session.googleOauthResume
    : '/'

  // Limpa sessao do flow independente do resultado
  const expectedState = req.session.googleOauthState
  delete req.session.googleOauthState
  delete req.session.googleOauthResume

  if (oauthError || !code) {
    console.warn(`[${new Date().toISOString()}] Google Drive OAuth denied:`, oauthError || 'no_code')
    return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth_error=denied`))
  }

  if (!expectedState || state !== expectedState) {
    console.warn(`[${new Date().toISOString()}] Google Drive OAuth state mismatch`)
    return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth_error=state`))
  }

  const callbackUrl = getDriveCallbackUrl()

  try {
    const tokenRes = await globalThis.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error(`[${new Date().toISOString()}] Google Drive token exchange falhou:`, tokenRes.status, body.slice(0, 300))
      return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth_error=token`))
    }

    const tokens = await tokenRes.json()

    if (!tokens.refresh_token) {
      console.error(`[${new Date().toISOString()}] Google Drive callback sem refresh_token (consent nao re-solicitado)`)
      return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth_error=no_refresh_token`))
    }

    // Opcional: buscar email/userinfo para gravar junto (paridade com login)
    let email = null
    try {
      const infoRes = await globalThis.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10_000)
      })
      if (infoRes.ok) {
        const info = await infoRes.json()
        email = info?.email || null
      }
    } catch (_err) { /* silencioso */ }

    const scopesGranted = typeof tokens.scope === 'string'
      ? tokens.scope.split(/\s+/).filter(Boolean)
      : REQUIRED_SCOPES

    await storeTokens(req.session.user.id, {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      scopes: scopesGranted,
      email
    })

    return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth=connected`))
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Google Drive callback error:`, err.message)
    return req.session.save(() => res.redirect(`${resumeUrl}${resumeUrl.includes('?') ? '&' : '?'}google_oauth_error=server`))
  }
})

// ── GET /api/google/status ──
router.get('/status', requireAuth, async (req, res) => {
  try {
    const status = await getStatus(req.session.user.id)
    res.json(status)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Google status error:`, err.message)
    res.status(500).json({ error: 'Erro ao consultar status da conexao Google' })
  }
})

// ── POST /api/google/disconnect ──
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await revokeTokens(req.session.user.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Google disconnect error:`, err.message)
    res.status(500).json({ error: 'Erro ao desconectar conta Google' })
  }
})

export default router
