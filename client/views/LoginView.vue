<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <i data-lucide="bar-chart-3"></i>
        </div>
        <h1 class="login-title">Dashboard Gestão</h1>
        <p class="login-subtitle">Ferraz Piai</p>
      </div>

      <!-- OAuth error messages -->
      <p v-if="oauthError" class="login-error">{{ oauthError }}</p>

      <!-- Google OAuth button -->
      <a href="/api/auth/google" class="google-btn">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </a>

      <div class="divider">
        <span class="divider-text">ou</span>
      </div>

      <!-- Email/senha form -->
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="username">Email</label>
          <input
            id="username"
            v-model="username"
            class="form-input"
            type="text"
            autocomplete="username"
            placeholder="seu.email@v4company.com"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Senha</label>
          <input
            id="password"
            v-model="password"
            class="form-input"
            type="password"
            autocomplete="current-password"
            placeholder="Digite sua senha"
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button class="login-btn" type="submit" :disabled="loading">
          <span v-if="loading">Entrando...</span>
          <span v-else>Entrar</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const oauthErrorMessages = {
  oauth_denied: 'Login com Google cancelado.',
  oauth_token: 'Erro ao autenticar com Google. Tente novamente.',
  oauth_userinfo: 'Erro ao obter dados do Google. Tente novamente.',
  oauth_server: 'Erro interno na autenticacao. Tente novamente.'
}

const oauthError = computed(() => {
  const err = route.query.error
  return err ? (oauthErrorMessages[err] || 'Erro na autenticacao.') : ''
})

onMounted(() => {
  if (window.lucide) lucide.createIcons()
})

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}

.login-card {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 40px 36px;
  width: 100%;
  max-width: 380px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  color: #ff0000;
}

.login-logo svg {
  width: 24px;
  height: 24px;
}

.login-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0 0 12px;
}

.login-badge {
  display: inline-block;
  font-size: 11px;
  color: #888;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 3px 8px;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 11px;
  background: #fff;
  color: #333;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
  margin-bottom: 0;
}

.google-btn:hover {
  background: #f0f0f0;
}

.google-icon {
  flex-shrink: 0;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.divider-text {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-input {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
  color: #fff;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.form-input::placeholder {
  color: #555;
}

.form-input:focus {
  border-color: rgba(255, 0, 0, 0.4);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-error {
  font-size: 13px;
  color: #ff4444;
  margin: 0;
  padding: 10px 12px;
  background: rgba(255, 0, 0, 0.06);
  border: 1px solid rgba(255, 0, 0, 0.15);
  border-radius: 4px;
}

.login-btn {
  background: #ff0000;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 11px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}

.login-btn:hover:not(:disabled) {
  background: #cc0000;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
