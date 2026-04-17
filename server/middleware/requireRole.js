/**
 * Middleware que verifica se o usuario tem uma das roles permitidas.
 * Admin sempre passa.
 * @param {string[]} allowedRoles - Roles permitidas (ex: ['board', 'operacao'])
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.session?.user?.role

    if (!role) {
      return res.status(401).json({ error: 'Nao autenticado' })
    }

    // Admin sempre tem acesso total
    if (role === 'admin') return next()

    if (allowedRoles.includes(role)) return next()

    res.status(403).json({ error: 'Acesso negado para este perfil' })
  }
}

/**
 * Email do admin-owner: unico autorizado a conceder/remover a role 'admin'
 * a outros usuarios. Configuravel via ADMIN_OWNER_EMAIL (.env) — default:
 * ferramenta.ferraz@v4company.com (dono da plataforma).
 */
export const ADMIN_OWNER_EMAIL = (
  process.env.ADMIN_OWNER_EMAIL || 'ferramenta.ferraz@v4company.com'
).toLowerCase()

/**
 * Checa se a sessao pertence ao admin-owner (usada em decisoes dentro de rotas).
 * O backdoor .env (email 'admin@local') nao e considerado owner — apenas o email real.
 */
export function requireAdminOwner(session) {
  const email = String(session?.user?.email || '').toLowerCase()
  return email === ADMIN_OWNER_EMAIL
}
