export function requireAuth(req, res, next) {
  // Suporta novo formato (user object) e legado (authenticated boolean)
  if (req.session?.user || req.session?.authenticated) return next()
  res.status(401).json({ error: 'Nao autenticado' })
}
