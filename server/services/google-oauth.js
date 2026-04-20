// server/services/google-oauth.js
// Servico de gestao de tokens OAuth Google per-user (D-01, D-04).
// Cache em memoria de access_token + refresh automatico via refresh_token encriptado.

import pool from '../lib/db.js'
import { encrypt, decrypt } from '../lib/crypto.js'

export const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/presentations.readonly'
]

const CACHE = new Map() // userId -> { access_token, expires_at_ms }

export class GoogleReauthRequiredError extends Error {
  constructor(message, { userId, reason } = {}) {
    super(message)
    this.name = 'GoogleReauthRequiredError'
    this.code = 'google_reauth_required'
    this.userId = userId
    this.reason = reason
  }
}

export async function storeTokens(userId, { refresh_token, access_token, expires_in, scopes, email }) {
  if (!userId) throw new Error('storeTokens: userId obrigatorio')
  if (!refresh_token) throw new Error('storeTokens: refresh_token obrigatorio (scope access_type=offline + prompt=consent)')

  const refresh_token_enc = encrypt(refresh_token)
  const expires_at = new Date(Date.now() + (expires_in || 3600) * 1000)

  await pool.query(`
    INSERT INTO dashboards_hub.google_oauth_tokens (user_id, refresh_token_enc, access_token, expires_at, scopes, connected_at, last_used_at, revoked_at, error_message)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NULL, NULL)
    ON CONFLICT (user_id) DO UPDATE SET
      refresh_token_enc = EXCLUDED.refresh_token_enc,
      access_token = EXCLUDED.access_token,
      expires_at = EXCLUDED.expires_at,
      scopes = EXCLUDED.scopes,
      connected_at = NOW(),
      last_used_at = NOW(),
      revoked_at = NULL,
      error_message = NULL,
      updated_at = NOW()
  `, [userId, refresh_token_enc, access_token || null, expires_at, scopes || REQUIRED_SCOPES])

  CACHE.set(userId, { access_token, expires_at_ms: expires_at.getTime() })

  if (email) {
    // Guarda email no user se a coluna existir (fallback silencioso caso nao exista)
    try {
      await pool.query('UPDATE dashboards_hub.users SET google_email = $2, updated_at = NOW() WHERE id = $1', [userId, email])
    } catch (_err) { /* coluna opcional */ }
  }
}

export async function getAccessToken(userId) {
  if (!userId) throw new GoogleReauthRequiredError('sem userId', { userId, reason: 'missing_user' })

  const cached = CACHE.get(userId)
  if (cached && cached.expires_at_ms - 60_000 > Date.now()) return cached.access_token

  const { rows } = await pool.query(
    'SELECT refresh_token_enc, revoked_at FROM dashboards_hub.google_oauth_tokens WHERE user_id = $1',
    [userId]
  )
  const row = rows[0]
  if (!row) throw new GoogleReauthRequiredError('sem token Google para este user', { userId, reason: 'missing' })
  if (row.revoked_at) throw new GoogleReauthRequiredError('token revogado', { userId, reason: 'revoked' })

  const refresh_token = decrypt(row.refresh_token_enc)

  const res = await globalThis.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token'
    })
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    await pool.query(
      'UPDATE dashboards_hub.google_oauth_tokens SET revoked_at = NOW(), error_message = $2, updated_at = NOW() WHERE user_id = $1',
      [userId, body.slice(0, 500)]
    )
    CACHE.delete(userId)
    throw new GoogleReauthRequiredError(`refresh falhou: ${res.status}`, { userId, reason: 'invalid_grant' })
  }

  const tokens = await res.json()
  const expires_at = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

  await pool.query(
    'UPDATE dashboards_hub.google_oauth_tokens SET access_token = $2, expires_at = $3, last_used_at = NOW(), error_message = NULL, updated_at = NOW() WHERE user_id = $1',
    [userId, tokens.access_token, expires_at]
  )
  CACHE.set(userId, { access_token: tokens.access_token, expires_at_ms: expires_at.getTime() })
  return tokens.access_token
}

export async function getStatus(userId) {
  if (!userId) return { connected: false }

  const { rows } = await pool.query(
    'SELECT scopes, connected_at, last_used_at, revoked_at, expires_at, error_message FROM dashboards_hub.google_oauth_tokens WHERE user_id = $1',
    [userId]
  )
  const row = rows[0]
  if (!row) return { connected: false }

  const scopes_ok = REQUIRED_SCOPES.every(s => (row.scopes || []).includes(s))
  return {
    connected: !row.revoked_at,
    scopes_ok,
    connected_at: row.connected_at,
    last_used_at: row.last_used_at,
    revoked_at: row.revoked_at,
    expires_at: row.expires_at,
    error_message: row.error_message
  }
}

export async function revokeTokens(userId) {
  if (!userId) return

  const { rows } = await pool.query(
    'SELECT refresh_token_enc FROM dashboards_hub.google_oauth_tokens WHERE user_id = $1',
    [userId]
  )

  if (rows[0]?.refresh_token_enc) {
    try {
      const refresh_token = decrypt(rows[0].refresh_token_enc)
      await globalThis.fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refresh_token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10_000)
      })
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Google revoke error:`, err.message)
    }
  }

  await pool.query(
    'UPDATE dashboards_hub.google_oauth_tokens SET revoked_at = NOW(), access_token = NULL, updated_at = NOW() WHERE user_id = $1',
    [userId]
  )
  CACHE.delete(userId)
}
