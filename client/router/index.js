import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import LoginView from '../views/LoginView.vue'

// Import dashboards registry
// In production, this should be loaded from API, but for routing we need it statically
import dashboardsConfig from '../../config/dashboards.json'

/**
 * Generate routes from dashboards configuration
 */
const dashboardRoutes = dashboardsConfig.map((dashboard) => ({
  path: `/${dashboard.id}`,
  name: dashboard.id,
  component: () => import(`../dashboards/${dashboard.componentPath}/index.vue`),
  meta: {
    title: dashboard.title,
    allowedRoles: dashboard.allowedRoles || null
  }
}))

/**
 * Router configuration
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Login (open)
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },

    // Redirect root — resolvido no beforeEach baseado no role
    {
      path: '/',
      name: 'home',
      redirect: '/raio-x-financeiro'
    },

    // Dashboard routes (auto-generated)
    ...dashboardRoutes,

    // Admin panel (only admin role)
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../dashboards/Admin/index.vue'),
      meta: { title: 'Admin', requireAdmin: true }
    },

    // Set password (first login or change)
    {
      path: '/criar-senha',
      name: 'set-password',
      component: () => import('../views/SetPassword.vue'),
      meta: { title: 'Criar Senha' }
    },

    // Access denied
    {
      path: '/acesso-negado',
      name: 'access-denied',
      component: () => import('../views/AccessDenied.vue'),
      meta: { title: 'Acesso Negado' }
    },

    // 404 Not Found
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue')
    }
  ]
})

// Auth guard
router.beforeEach(async (to) => {
  if (to.name === 'login' || to.name === 'access-denied') return true

  const auth = useAuthStore()
  await auth.check()

  if (!auth.authenticated) return { name: 'login' }

  // Forcar criacao de senha no primeiro login OAuth
  if (auth.needsPassword && to.name !== 'set-password') {
    return { name: 'set-password' }
  }

  // Redirect root baseado no role do usuario
  if (to.name === 'home') {
    const role = auth.role
    if (role === 'admin' || role === 'board') return { path: '/raio-x-financeiro' }
    if (role === 'operacao') return { path: '/nps-satisfacao' }
    return { path: '/raio-x-financeiro' }
  }

  // Check admin-only routes
  if (to.meta.requireAdmin && !auth.isAdmin) {
    return { name: 'access-denied' }
  }

  // Check role-based dashboard access
  const allowedRoles = to.meta.allowedRoles
  if (allowedRoles && auth.role !== 'admin' && !allowedRoles.includes(auth.role)) {
    return { name: 'access-denied' }
  }

  // Update page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - Dashboards V4`
  } else {
    document.title = 'Dashboards V4'
  }
})

// Log route changes in development
if (import.meta.env.DEV) {
  router.afterEach((to) => {
    console.log('[Router] Navigated to:', to.path)
  })
}

export default router
