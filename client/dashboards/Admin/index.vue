<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1 class="admin-title">Gerenciar Usuários</h1>
      <button class="btn-primary" @click="openCreateModal">+ Novo Usuário</button>
    </div>

    <div v-if="loading" class="admin-loading">Carregando...</div>

    <div v-else class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Perfil</th>
            <th>Login</th>
            <th>Status</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" :class="{ 'row-inactive': !u.active }">
            <td>{{ u.name }}</td>
            <td class="td-email">{{ u.email }}</td>
            <td><span class="role-badge" :class="'role-' + u.role">{{ u.role }}</span></td>
            <td>{{ u.oauth_provider || 'senha' }}</td>
            <td>
              <span class="status-dot" :class="u.active ? 'status-active' : 'status-inactive'"></span>
              {{ u.active ? 'Ativo' : 'Inativo' }}
            </td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td class="td-actions">
              <button class="btn-icon" title="Editar" @click="openEditModal(u)">
                <i data-lucide="pencil"></i>
              </button>
              <button v-if="u.active" class="btn-icon btn-danger" title="Desativar" @click="deactivateUser(u)">
                <i data-lucide="user-x"></i>
              </button>
              <button v-else class="btn-icon btn-success" title="Reativar" @click="reactivateUser(u)">
                <i data-lucide="user-check"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Criar/Editar -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h2 class="modal-title">{{ editing ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input v-model="form.name" class="form-input" type="text" placeholder="Nome completo" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="form.email" class="form-input" type="email" placeholder="email@v4company.com" :disabled="editing" required />
          </div>
          <div class="form-group">
            <label class="form-label">Perfil</label>
            <select v-model="form.role" class="form-input">
              <option value="operacao">Operação</option>
              <option value="board">Board</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha (opcional)' }}</label>
            <input v-model="form.password" class="form-input" type="password" placeholder="Mínimo 6 caracteres" />
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const users = ref([])
const loading = ref(true)
const showModal = ref(false)
const editing = ref(null) // user id or null
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', email: '', role: 'operacao', password: '' })

onMounted(async () => {
  await fetchUsers()
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    users.value = data.users || []
  } catch {
    users.value = []
  } finally {
    loading.value = false
    await nextTick()
    if (window.lucide) lucide.createIcons()
  }
}

function openCreateModal() {
  editing.value = null
  form.value = { name: '', email: '', role: 'operacao', password: '' }
  formError.value = ''
  showModal.value = true
}

function openEditModal(u) {
  editing.value = u.id
  form.value = { name: u.name, email: u.email, role: u.role, password: '' }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveUser() {
  formError.value = ''
  saving.value = true

  try {
    if (editing.value) {
      const body = { name: form.value.name, role: form.value.role }
      if (form.value.password) body.password = form.value.password
      const res = await fetch(`/api/admin/users/${editing.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
    } else {
      const body = { name: form.value.name, email: form.value.email, role: form.value.role }
      if (form.value.password) body.password = form.value.password
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
    }

    closeModal()
    await fetchUsers()
  } catch (err) {
    formError.value = err.message
  } finally {
    saving.value = false
  }
}

async function deactivateUser(u) {
  if (!confirm(`Desativar ${u.name} (${u.email})?`)) return
  await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
  await fetchUsers()
}

async function reactivateUser(u) {
  await fetch(`/api/admin/users/${u.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: true })
  })
  await fetchUsers()
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.admin-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.admin-loading {
  color: #888;
  font-size: 14px;
  padding: 32px 0;
  text-align: center;
}

.admin-table-wrapper {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.admin-table th {
  text-align: left;
  padding: 10px 12px;
  color: #888;
  font-weight: 500;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.admin-table td {
  padding: 12px;
  color: #ccc;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.td-email {
  color: #999;
  font-size: 12px;
}

.row-inactive td {
  opacity: 0.45;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.role-admin {
  background: rgba(255, 0, 0, 0.12);
  color: #ff4444;
}

.role-board {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
}

.role-operacao {
  background: rgba(255, 255, 255, 0.06);
  color: #999;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-active {
  background: #4ade80;
}

.status-inactive {
  background: #666;
}

.td-actions {
  display: flex;
  gap: 6px;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 6px;
  color: #999;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.btn-icon svg {
  width: 14px;
  height: 14px;
}

.btn-danger:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
  border-color: rgba(255, 0, 0, 0.2);
}

.btn-success:hover {
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.2);
}

.btn-primary {
  background: #ff0000;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background: #cc0000;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 9px 18px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-card {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 28px;
  width: 100%;
  max-width: 420px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-input {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
  color: #fff;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: rgba(255, 0, 0, 0.4);
}

.form-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-input option {
  background: #141414;
  color: #fff;
}

.form-error {
  font-size: 13px;
  color: #ff4444;
  margin: 0;
  padding: 8px 10px;
  background: rgba(255, 0, 0, 0.06);
  border: 1px solid rgba(255, 0, 0, 0.15);
  border-radius: 4px;
}
</style>
