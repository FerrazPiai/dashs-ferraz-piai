import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../lib/db.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

// Todas as rotas admin exigem role 'admin'
router.use(requireRole(['admin']))

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

  const validRoles = ['admin', 'board', 'operacao']
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Role invalida. Validas: ${validRoles.join(', ')}` })
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

  const validRoles = ['admin', 'board', 'operacao']
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Role invalida. Validas: ${validRoles.join(', ')}` })
  }

  try {
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
