<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <h2 class="modal-title">{{ user ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
      <form @submit.prevent="save">
        <div class="fg">
          <label class="fl">Nome</label>
          <input v-model="form.name" class="fi" type="text" placeholder="Nome completo" required />
        </div>
        <div class="fg">
          <label class="fl">Email</label>
          <input v-model="form.email" class="fi" type="email" placeholder="email@v4company.com" :disabled="!!user" required />
        </div>
        <div class="fg">
          <label class="fl">Perfil</label>
          <select v-model="form.role" class="fi" :disabled="!canEditRole">
            <option
              v-for="p in profiles"
              :key="p.name"
              :value="p.name"
              :disabled="p.name === 'admin' && !canGrantAdmin"
            >
              {{ p.label }}{{ p.name === 'admin' && !canGrantAdmin ? ' (restrito ao owner)' : '' }}
            </option>
          </select>
          <small v-if="!canGrantAdmin" class="fh">
            Apenas o admin-owner pode conceder o perfil Administrador.
          </small>
        </div>
        <div v-if="advanced" class="fg">
          <label class="fl">Status</label>
          <select v-model="form.active" class="fi">
            <option :value="true">Ativo</option>
            <option :value="false">Inativo</option>
          </select>
        </div>
        <div class="fg">
          <label class="fl">{{ user ? 'Nova Senha (vazio = manter)' : 'Senha (opcional)' }}</label>
          <input v-model="form.password" class="fi" type="password" placeholder="Mínimo 6 caracteres" />
        </div>
        <div v-if="advanced && user" class="meta">
          <span>ID: {{ user.id }}</span>
          <span>Login: {{ user.oauth_provider || 'senha' }}</span>
          <span>Criado: {{ fmtDate(user.created_at) }}</span>
          <span>Atualizado: {{ fmtDate(user.updated_at) }}</span>
        </div>
        <p v-if="error" class="fe">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" class="btn-sec" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="btn-pri" :disabled="saving">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useAuthStore } from '../../../stores/auth.js'

const ADMIN_OWNER_EMAIL = 'ferramenta.ferraz@v4company.com'

const props = defineProps({
  user: { type: Object, default: null },
  profiles: { type: Array, default: () => [] },
  advanced: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'saved'])

const auth = useAuthStore()
const currentEmail = computed(() => String(auth.user?.email || '').toLowerCase())
const isOwner = computed(() => currentEmail.value === ADMIN_OWNER_EMAIL)
// Pode conceder admin? So o owner. Se esta editando alguem que ja e admin e quem edita nao e owner -> nao pode mexer no role.
const canGrantAdmin = computed(() => isOwner.value)
const canEditRole = computed(() => {
  if (isOwner.value) return true
  // Nao-owner: nao pode editar role de admin existente
  return props.user?.role !== 'admin'
})

const form = reactive({ name: '', email: '', role: 'operacao', password: '', active: true })
const saving = ref(false)
const error = ref('')

watch(() => props.user, (u) => {
  if (u) { form.name = u.name; form.email = u.email; form.role = u.role; form.active = u.active; form.password = '' }
  else { form.name = ''; form.email = ''; form.role = 'operacao'; form.password = ''; form.active = true }
}, { immediate: true })

async function save() {
  error.value = ''; saving.value = true
  try {
    if (props.user) {
      const body = { name: form.name, role: form.role, active: form.active }
      if (form.password) body.password = form.password
      const res = await fetch(`/api/admin/users/${props.user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
    } else {
      const body = { name: form.name, email: form.email, role: form.role }
      if (form.password) body.password = form.password
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
    }
    emit('saved'); emit('close')
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}

function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '-' }
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
.modal-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 28px; width: 100%; max-width: 440px; }
.modal-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 20px; }
.fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.fl { font-size: 12px; font-weight: 500; color: #ccc; text-transform: uppercase; letter-spacing: 0.04em; }
.fi { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px 12px; font-size: 14px; color: #fff; font-family: inherit; outline: none; transition: border-color 0.15s; }
.fi:focus { border-color: rgba(255,0,0,0.4); }
.fi:disabled { opacity: 0.4; cursor: not-allowed; }
.fi option { background: #141414; color: #fff; }
.fe { font-size: 13px; color: #ff4444; margin: 0; padding: 8px 10px; background: rgba(255,0,0,0.06); border: 1px solid rgba(255,0,0,0.15); border-radius: 4px; }
.fh { display: block; margin-top: 6px; font-size: 11px; color: #888; line-height: 1.4; }
.meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; font-size: 11px; color: #555; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-sec { background: rgba(255,255,255,0.04); color: #ccc; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 9px 18px; font-size: 13px; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.btn-sec:hover { background: rgba(255,255,255,0.08); }
.btn-pri { background: #ff0000; color: #fff; border: none; border-radius: 4px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
.btn-pri:hover:not(:disabled) { background: #cc0000; }
.btn-pri:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
