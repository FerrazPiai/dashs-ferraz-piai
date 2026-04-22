import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useDashboardsStore } from '../stores/dashboards.js'
import { initActivityTracker, trackPageView } from '../composables/useActivityTracker.js'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/Home.vue'

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
    isDashboard: true
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

    // Home — Central de Dashboards (renderiza, nao redireciona)
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Central de Dashboards' }
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

  // Admin: libera tudo, sem checks extras
  if (auth.isAdmin) {
    if (to.meta.title) document.title = `${to.meta.title} - Dashboards V4`
    else document.title = 'Dashboards V4'
    return true
  }

  // Bloquear rotas admin-only
  if (to.meta.requireAdmin) {
    return { name: 'home' }
  }

  // Checagem de acesso para dashboards especificos (home e sempre acessivel)
  if (to.meta.isDashboard) {
    const dashboards = useDashboardsStore()
    await dashboards.load()
    const accessibleIds = dashboards.list.map((d) => d.id)
    if (!accessibleIds.includes(to.name)) {
      return { name: 'home' }
    }
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

// Tracker de atividade (sendBeacon, nao-bloqueante)
initActivityTracker()
router.afterEach((to) => {
  // So traqueia rotas com usuario autenticado (auth guard ja rodou no beforeEach)
  const auth = useAuthStore()
  if (!auth.authenticated) return
  if (to.name === 'login' || to.name === 'set-password' || to.name === 'access-denied') return

  trackPageView({
    path: to.path,
    dashboardId: to.meta?.isDashboard ? (to.name || null) : null,
    meta: to.meta?.title ? { title: to.meta.title } : null
  })
})

export default router
