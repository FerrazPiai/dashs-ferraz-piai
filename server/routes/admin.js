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

export default router
