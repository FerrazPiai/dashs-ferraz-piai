import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../lib/db.js'
import { requireRole, requireAdminOwner } from '../middleware/requireRole.js'
import {
  getActiveProviderConfig,
  invalidateProviderCache,
  pingProvider,
  PROVIDER_DEFAULTS
} from '../services/ai-client.js'

const router = Router()

// Todas as rotas admin exigem role 'admin'
router.use(requireRole(['admin']))

// Roles validas (tambem usadas abaixo para validar bulk set-role e grant)
const VALID_ROLES = ['admin', 'board', 'operacao']

// Helper: quem esta logado pode conceder a role target?
// Apenas o "admin owner" (email configurado) pode conceder/remover role 'admin'.
function canAssignRole(session, targetRole, previousRole = null) {
  // Nao tocou em role: ok
  if (targetRole === undefined || targetRole === previousRole) return true
  // Role target e admin OU estamos rebaixando alguem que era admin -> precisa ser owner
  if (targetRole === 'admin' || previousRole === 'admin') {
    return requireAdminOwner(session)
  }
  return true
}

// ── GET /api/admin/users — Listar usuarios ──

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, oauth_provider, active, created_at, updated_at FROM users ORDER BY created_at DESC'
    )
    res.json({ users: result.rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin list users error:`, err.message)
    res.status(500).json({ error: 'Erro ao listar usuarios' })
  }
})

// ── POST /api/admin/users — Criar usuario ──

router.post('/users', async (req, res) => {
  const { email, name, role, password } = req.body

  if (!email || !name) {
    return res.status(400).json({ error: 'Email e nome obrigatorios' })
  }

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role invalida. Validas: ${VALID_ROLES.join(', ')}` })
  }

  // Somente o admin-owner pode criar outro user com role 'admin'
  if (role === 'admin' && !requireAdminOwner(req.session)) {
    return res.status(403).json({ error: 'Somente o admin-owner pode criar usuarios com perfil Administrador' })
  }

  try {
    let passwordHash = null
    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    const result = await pool.query(
      `INSERT INTO users (email, name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, active, created_at`,
      [email, name, role || 'operacao', passwordHash]
    )

    res.status(201).json({ user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email ja cadastrado' })
    }
    console.error(`[${new Date().toISOString()}] Admin create user error:`, err.message)
    res.status(500).json({ error: 'Erro ao criar usuario' })
  }
})

// ── PUT /api/admin/users/:id — Editar usuario ──

router.put('/users/:id', async (req, res) => {
  const { id } = req.params
  const { name, role, active, password } = req.body

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role invalida. Validas: ${VALID_ROLES.join(', ')}` })
  }

  try {
    // Checa role atual do alvo para saber se e promocao/rebaixamento de admin
    let previousRole = null
    if (role !== undefined) {
      const { rows: [existing] } = await pool.query('SELECT role, email FROM users WHERE id = $1', [id])
      if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado' })
      previousRole = existing.role
      if (!canAssignRole(req.session, role, previousRole)) {
        return res.status(403).json({
          error: 'Somente o admin-owner pode conceder ou remover o perfil Administrador'
        })
      }
    }

    // Monta SET dinamico
    const sets = []
    const values = []
    let idx = 1

    if (name !== undefined) { sets.push(`name = $${idx++}`); values.push(name) }
    if (role !== undefined) { sets.push(`role = $${idx++}`); values.push(role) }
    if (active !== undefined) { sets.push(`active = $${idx++}`); values.push(active) }
    if (password) {
      const hash = await bcrypt.hash(password, 10)
      sets.push(`password_hash = $${idx++}`)
      values.push(hash)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    sets.push(`updated_at = NOW()`)
    values.push(id)

    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role, active, updated_at`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin update user error:`, err.message)
    res.status(500).json({ error: 'Erro ao atualizar usuario' })
  }
})

// ── DELETE /api/admin/users/:id — Desativar usuario (soft delete) ──

router.delete('/users/:id', async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query(
      'UPDATE users SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id, email, name',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' })
    }

    res.json({ message: 'Usuario desativado', user: result.rows[0] })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin delete user error:`, err.message)
    res.status(500).json({ error: 'Erro ao desativar usuario' })
  }
})

// ── PROFILES ──

// GET /api/admin/profiles — Listar perfis
router.get('/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profiles ORDER BY name')
    res.json({ profiles: result.rows })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin list profiles error:`, err.message)
    res.status(500).json({ error: 'Erro ao listar perfis' })
  }
})

// POST /api/admin/profiles — Criar perfil
router.post('/profiles', async (req, res) => {
  const { name, label, allowed_dashboards } = req.body
  if (!name || !label) {
    return res.status(400).json({ error: 'Nome e label obrigatorios' })
  }
  if (!/^[a-z0-9_-]+$/.test(name)) {
    return res.status(400).json({ error: 'Nome deve conter apenas letras minusculas, numeros, - e _' })
  }
  try {
    const result = await pool.query(
      'INSERT INTO profiles (name, label, allowed_dashboards) VALUES ($1, $2, $3) RETURNING *',
      [name, label, allowed_dashboards || []]
    )
    res.status(201).json({ profile: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Perfil ja existe' })
    console.error(`[${new Date().toISOString()}] Admin create profile error:`, err.message)
    res.status(500).json({ error: 'Erro ao criar perfil' })
  }
})

// PUT /api/admin/profiles/:name — Editar perfil
router.put('/profiles/:name', async (req, res) => {
  const { name } = req.params
  const { label, allowed_dashboards } = req.body
  try {
    const sets = []
    const values = []
    let idx = 1
    if (label !== undefined) { sets.push(`label = $${idx++}`); values.push(label) }
    if (allowed_dashboards !== undefined) { sets.push(`allowed_dashboards = $${idx++}`); values.push(allowed_dashboards) }
    if (sets.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    sets.push('updated_at = NOW()')
    values.push(name)
    const result = await pool.query(
      `UPDATE profiles SET ${sets.join(', ')} WHERE name = $${idx} RETURNING *`,
      values
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil nao encontrado' })
    res.json({ profile: result.rows[0] })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin update profile error:`, err.message)
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// DELETE /api/admin/profiles/:name — Deletar perfil
router.delete('/profiles/:name', async (req, res) => {
  const { name } = req.params
  if (['admin', 'board', 'operacao'].includes(name)) {
    return res.status(403).json({ error: 'Perfis padrao nao podem ser deletados' })
  }
  try {
    // Verificar se ha usuarios com este perfil
    const usersCheck = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', [name])
    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(409).json({ error: 'Existem usuarios com este perfil. Reassocie-os antes de deletar.' })
    }
    const result = await pool.query('DELETE FROM profiles WHERE name = $1 RETURNING name', [name])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil nao encontrado' })
    res.json({ message: 'Perfil deletado', name })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin delete profile error:`, err.message)
    res.status(500).json({ error: 'Erro ao deletar perfil' })
  }
})

// ── BULK ACTIONS ──

// POST /api/admin/users/bulk — Acoes em massa
router.post('/users/bulk', async (req, res) => {
  const { action, userIds } = req.body
  if (!action || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Acao e lista de IDs obrigatorios' })
  }
  try {
    let result
    switch (action) {
      case 'activate':
        result = await pool.query('UPDATE users SET active = true, updated_at = NOW() WHERE id = ANY($1) RETURNING id', [userIds])
        break
      case 'deactivate':
        result = await pool.query('UPDATE users SET active = false, updated_at = NOW() WHERE id = ANY($1) RETURNING id', [userIds])
        break
      case 'set-role': {
        const { role } = req.body
        if (!role) return res.status(400).json({ error: 'Role obrigatoria para set-role' })
        if (!VALID_ROLES.includes(role)) {
          return res.status(400).json({ error: `Role invalida. Validas: ${VALID_ROLES.join(', ')}` })
        }
        // Gate 1: target = admin -> so owner
        if (role === 'admin' && !requireAdminOwner(req.session)) {
          return res.status(403).json({
            error: 'Somente o admin-owner pode promover usuarios ao perfil Administrador'
          })
        }
        // Gate 2: algum dos selecionados ja e admin -> so owner pode rebaixar
        const { rows: currentlyAdmin } = await pool.query(
          'SELECT id FROM users WHERE id = ANY($1) AND role = $2',
          [userIds, 'admin']
        )
        if (currentlyAdmin.length > 0 && !requireAdminOwner(req.session)) {
          return res.status(403).json({
            error: 'Alguns usuarios selecionados sao admins — somente o admin-owner pode alterar'
          })
        }
        result = await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id', [role, userIds])
        break
      }
      case 'delete':
        result = await pool.query('UPDATE users SET active = false, updated_at = NOW() WHERE id = ANY($1) RETURNING id', [userIds])
        break
      default:
        return res.status(400).json({ error: `Acao desconhecida: ${action}` })
    }
    res.json({ affected: result.rows.length })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin bulk action error:`, err.message)
    res.status(500).json({ error: 'Erro na acao em massa' })
  }
})

// ──────────────────────────────────────────────────────────
// AI PROVIDER — Configuracao do provedor de IA (admin-only)
// ──────────────────────────────────────────────────────────

// GET /api/admin/ai-provider — le config ativa + defaults por provider
router.get('/ai-provider', async (req, res) => {
  try {
    const current = await getActiveProviderConfig()
    const { rows: [meta] } = await pool.query(
      `SELECT c.notes, c.updated_at, u.name AS updated_by_name, u.email AS updated_by_email
       FROM tc_ai_provider_config c
       LEFT JOIN users u ON u.id = c.updated_by
       WHERE c.id = 1`
    ).catch(() => ({ rows: [] }))
    res.json({
      config: {
        ...current,
        notes: meta?.notes || null,
        updated_at: meta?.updated_at || null,
        updated_by_name: meta?.updated_by_name || null,
        updated_by_email: meta?.updated_by_email || null
      },
      providers: Object.keys(PROVIDER_DEFAULTS),
      defaults: PROVIDER_DEFAULTS,
      is_owner: requireAdminOwner(req.session)
    })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin get ai-provider error:`, err.message)
    res.status(500).json({ error: 'Erro ao ler configuracao de IA' })
  }
})

// PUT /api/admin/ai-provider — altera provider/modelos ativos (apenas admin-owner)
router.put('/ai-provider', async (req, res) => {
  if (!requireAdminOwner(req.session)) {
    return res.status(403).json({
      error: 'Somente o admin-owner pode alterar a configuracao de IA'
    })
  }
  const {
    provider,
    model_analysis,
    model_note,
    model_coordinator,
    price_in_per_mtok,
    price_out_per_mtok,
    notes
  } = req.body || {}

  if (provider && !Object.keys(PROVIDER_DEFAULTS).includes(provider)) {
    return res.status(400).json({
      error: `Provider invalido. Validos: ${Object.keys(PROVIDER_DEFAULTS).join(', ')}`
    })
  }

  try {
    const sets = []
    const values = []
    let idx = 1
    if (provider !== undefined)          { sets.push(`provider = $${idx++}`);          values.push(provider) }
    if (model_analysis !== undefined)    { sets.push(`model_analysis = $${idx++}`);    values.push(model_analysis) }
    if (model_note !== undefined)        { sets.push(`model_note = $${idx++}`);        values.push(model_note) }
    if (model_coordinator !== undefined) { sets.push(`model_coordinator = $${idx++}`); values.push(model_coordinator) }
    if (price_in_per_mtok !== undefined) { sets.push(`price_in_per_mtok = $${idx++}`); values.push(price_in_per_mtok) }
    if (price_out_per_mtok !== undefined){ sets.push(`price_out_per_mtok = $${idx++}`);values.push(price_out_per_mtok) }
    if (notes !== undefined)             { sets.push(`notes = $${idx++}`);             values.push(notes) }

    if (sets.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' })

    sets.push(`updated_by = $${idx++}`); values.push(req.session.user.id || null)
    sets.push('updated_at = NOW()')

    await pool.query(
      `UPDATE tc_ai_provider_config SET ${sets.join(', ')} WHERE id = 1`,
      values
    )
    invalidateProviderCache()
    const updated = await getActiveProviderConfig()
    res.json({ config: updated })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin update ai-provider error:`, err.message)
    res.status(500).json({ error: 'Erro ao atualizar configuracao de IA' })
  }
})

// POST /api/admin/ai-provider/ping — testa conexao com provider+modelo
router.post('/ai-provider/ping', async (req, res) => {
  const { provider, model } = req.body || {}
  if (!provider || !model) {
    return res.status(400).json({ error: 'provider e model obrigatorios' })
  }
  try {
    const result = await pingProvider(provider, model)
    res.json(result)
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message,
      status: err.status || 502
    })
  }
})

// GET /api/admin/dashboards-list — Lista de dashboards disponiveis (para seletor de perfis)
router.get('/dashboards-list', async (req, res) => {
  try {
    const { promises: fs } = await import('node:fs')
    const { join, dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const registryPath = join(__dirname, '..', '..', 'config', 'dashboards.json')
    const content = await fs.readFile(registryPath, 'utf-8')
    const dashboards = JSON.parse(content)
    res.json({ dashboards: dashboards.map(d => ({ id: d.id, title: d.title })) })
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Admin dashboards-list error:`, err.message)
    res.status(500).json({ error: 'Erro ao listar dashboards' })
  }
})

export default router
