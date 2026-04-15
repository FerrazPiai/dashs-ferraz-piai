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
