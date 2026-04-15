<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <i data-lucide="lock"></i>
        </div>
        <h1 class="login-title">{{ isFirstTime ? 'Criar Senha' : 'Alterar Senha' }}</h1>
        <p class="login-subtitle">
          {{ isFirstTime
            ? 'Crie uma senha para acessar também por email e senha.'
            : 'Digite sua senha atual e a nova senha.' }}
        </p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div v-if="!isFirstTime" class="form-group">
          <label class="form-label" for="currentPassword">Senha Atual</label>
          <input
            id="currentPassword"
            v-model="currentPassword"
            class="form-input"
            type="password"
            autocomplete="current-password"
            placeholder="Digite sua senha atual"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="newPassword">Nova Senha</label>
          <input
            id="newPassword"
            v-model="newPassword"
            class="form-input"
            type="password"
            autocomplete="new-password"
            placeholder="Mínimo 6 caracteres"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="confirmPassword">Confirmar Senha</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            class="form-input"
            type="password"
            autocomplete="new-password"
            placeholder="Repita a nova senha"
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>
        <p v-if="success" class="login-success">{{ success }}</p>

        <button class="login-btn" type="submit" :disabled="loading">
          <span v-if="loading">Salvando...</span>
          <span v-else>{{ isFirstTime ? 'Criar Senha' : 'Alterar Senha' }}</span>
        </button>

        <button v-if="isFirstTime" class="skip-btn" type="button" @click="skipForNow" :disabled="loading">
          Pular por agora
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const isFirstTime = computed(() => auth.needsPassword)

onMounted(() => {
  if (window.lucide) lucide.createIcons()
})

async function handleSubmit() {
  error.value = ''
  success.value = ''

  if (newPassword.value.length < 6) {
    error.value = 'Senha deve ter no mínimo 6 caracteres'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'As senhas não conferem'
    return
  }

  loading.value = true
  try {
    await auth.setPassword(newPassword.value, currentPassword.value || undefined)
    success.value = 'Senha definida com sucesso!'
    setTimeout(() => router.push('/'), 1000)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function skipForNow() {
  // Marca localmente para nao redirecionar nesta sessao
  if (auth.user) auth.user.needsPassword = false
  router.push('/')
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
  font-size: 13px;
  color: #999;
  margin: 0;
  line-height: 1.4;
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

.login-success {
  font-size: 13px;
  color: #4ade80;
  margin: 0;
  padding: 10px 12px;
  background: rgba(74, 222, 128, 0.06);
  border: 1px solid rgba(74, 222, 128, 0.15);
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

.skip-btn {
  background: transparent;
  color: #666;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 10px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.skip-btn:hover:not(:disabled) {
  color: #999;
  border-color: rgba(255, 255, 255, 0.15);
}

.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
