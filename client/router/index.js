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
    title: dashboard.title
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

    // Redirect root to raio-x financeiro
    {
      path: '/',
      redirect: '/raio-x-financeiro'
    },

    // Dashboard routes (auto-generated)
    ...dashboardRoutes,

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
  if (to.name === 'login') return true

  const auth = useAuthStore()
  await auth.check()

  if (!auth.authenticated) return { name: 'login' }

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
