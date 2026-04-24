import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDashboardsStore } from './dashboards.js'
import { flushTracker } from '../composables/useActivityTracker.js'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  const user = ref(null) // { id, email, name, role, needsPassword }

  const role = computed(() => user.value?.role || null)
  const isAdmin = computed(() => role.value === 'admin')
  const needsPassword = computed(() => !!user.value?.needsPassword)

  async function check() {
    try {
      const res = await fetch('/api/auth/check')
      const data = await res.json()
      authenticated.value = data.authenticated
      user.value = data.user || null
    } catch {
      authenticated.value = false
      user.value = null
    }
  }

  async function login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao fazer login')
    authenticated.value = true
    user.value = data.user
    // Forca recarregar lista de dashboards acessiveis para o novo usuario
    useDashboardsStore().clear()
  }

  async function setPassword(password, currentPassword) {
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, currentPassword })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao definir senha')
    if (user.value) user.value.needsPassword = false
  }

  async function logout() {
    // Flush tracker ANTES do logout (ainda temos sessao para receber o beacon)
    try { flushTracker() } catch { /* silent */ }
    await fetch('/api/auth/logout', { method: 'POST' })
    authenticated.value = false
    user.value = null
    useDashboardsStore().clear()
  }

  return { authenticated, user, role, isAdmin, needsPassword, check, login, setPassword, logout }
})
