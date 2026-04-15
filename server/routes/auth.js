import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../lib/db.js'

const router = Router()

// ── Login email/senha (DB) + backdoor admin (.env) ──

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Email e senha obrigatorios' })
  }

  // 1. Backdoor admin via .env (mantido para emergencia)
  const envUser = process.env.USER_NAME
  const envPass = process.env.USER_PASSWORD
  if (envUser && envPass && username === envUser && password === envPass) {
    req.session.user = { id: 0, email: 'admin@local', name: 'Admin', role: 'admin' }
    return res.json({ authenticated: true, user: req.session.user })
  }

  // 2. Login via Postgres
  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1 AND active = true',
      [username]
    )
    const user = result.rows[0]

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email ou senha invalidos' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha invalidos' })
    }

    req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role, needsPassword: false }
    res.json({ authenticated: true, user: req.session.user })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Login DB error:`, err.message)
    res.status(500).json({ error: 'Erro interno ao autenticar' })
  }
})

// ── Google OAuth ──

router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    return res.status(500).json({ error: 'Google OAuth nao configurado' })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

router.get('/google/callback', async (req, res) => {
  const { code, error: oauthError } = req.query

  if (oauthError || !code) {
    return res.redirect('/login?error=oauth_denied')
  }

  try {
    // Trocar code por tokens
    const tokenRes = await globalThis.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenRes.ok) {
      console.error(`[${new Date().toISOString()}] Google token error:`, await tokenRes.text())
      return res.redirect('/login?error=oauth_token')
    }

    const tokens = await tokenRes.json()

    // Buscar info do usuario
    const userInfoRes = await globalThis.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    if (!userInfoRes.ok) {
      return res.redirect('/login?error=oauth_userinfo')
    }

    const googleUser = await userInfoRes.json()

    // Buscar usuario no banco
    const result = await pool.query(
      'SELECT id, email, name, role, password_hash, oauth_id FROM users WHERE email = $1 AND active = true',
      [googleUser.email]
    )
    let dbUser = result.rows[0]

    // Bloquear dominios nao permitidos antes de auto-criar
    const allowedDomains = (process.env.GOOGLE_ALLOWED_DOMAINS || 'v4company.com').split(',').map(d => d.trim().toLowerCase())
    const emailDomain = googleUser.email.split('@')[1]?.toLowerCase()
    if (!dbUser && !allowedDomains.includes(emailDomain)) {
      console.warn(`[${new Date().toISOString()}] OAuth bloqueado: ${googleUser.email} (dominio nao permitido)`)
      return res.redirect('/login?error=domain_not_allowed')
    }

    // Auto-criar como 'operacao' se nao existe no banco
    if (!dbUser) {
      const insertResult = await pool.query(
        `INSERT INTO users (email, name, role, oauth_provider, oauth_id)
         VALUES ($1, $2, 'operacao', 'google', $3)
         RETURNING id, email, name, role, password_hash`,
        [googleUser.email, googleUser.name || googleUser.email.split('@')[0], googleUser.id]
      )
      dbUser = insertResult.rows[0]
      console.log(`[${new Date().toISOString()}] Auto-created user: ${dbUser.email} (operacao)`)
    } else if (!dbUser.oauth_id) {
      // Atualizar oauth_provider/oauth_id se ainda nao tem
      await pool.query(
        'UPDATE users SET oauth_provider = $1, oauth_id = $2, updated_at = NOW() WHERE id = $3',
        ['google', googleUser.id, dbUser.id]
      )
    }

    const needsPassword = !dbUser.password_hash
    req.session.user = { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role, needsPassword }
    res.redirect(needsPassword ? '/criar-senha' : '/')
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Google OAuth error:`, err.message)
    res.redirect('/login?error=oauth_server')
  }
})

// ── Perfil do usuario logado ──

router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ authenticated: false })
  }
  res.json({ authenticated: true, user: req.session.user })
})

// ── Check (backward-compatible) ──

router.get('/check', async (req, res) => {
  const user = req.session?.user
  if (!user) return res.json({ authenticated: false, user: null })

  // Revalidar needsPassword contra o banco (senha pode ter sido definida em outra aba)
  if (user.id > 0) {
    try {
      const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id])
      user.needsPassword = !result.rows[0]?.password_hash
    } catch { /* mantém valor da sessão */ }
  }

  res.json({ authenticated: true, user })
})

// ── Criar/Alterar senha ──

router.post('/set-password', async (req, res) => {
  const user = req.session?.user
  if (!user) {
    return res.status(401).json({ error: 'Nao autenticado' })
  }

  const { password, currentPassword } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no minimo 6 caracteres' })
  }

  try {
    // Se usuario ja tem senha, exigir senha atual para alterar
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user.id])
    const dbUser = result.rows[0]

    if (dbUser?.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Senha atual obrigatoria para alterar senha' })
      }
      const valid = await bcrypt.compare(currentPassword, dbUser.password_hash)
      if (!valid) {
        return res.status(401).json({ error: 'Senha atual incorreta' })
      }
    }

    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, user.id])

    // Atualizar sessao
    req.session.user.needsPassword = false

    res.json({ ok: true, message: 'Senha definida com sucesso' })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Set password error:`, err.message)
    res.status(500).json({ error: 'Erro interno ao definir senha' })
  }
})

// ── Logout ──

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao encerrar sessao' })
    }
    res.clearCookie('connect.sid')
    res.json({ authenticated: false })
  })
})

export default router
