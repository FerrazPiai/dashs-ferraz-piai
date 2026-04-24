<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <h2 class="modal-title">{{ profile ? 'Editar Perfil' : 'Novo Perfil' }}</h2>
      <form @submit.prevent="save">
        <div class="fg">
          <label class="fl">Identificador (slug)</label>
          <input v-model="form.name" class="fi" type="text" placeholder="ex: marketing" :disabled="!!profile" required pattern="[a-z0-9_-]+" title="Apenas letras minúsculas, números, - e _" />
        </div>
        <div class="fg">
          <label class="fl">Nome de Exibição</label>
          <input v-model="form.label" class="fi" type="text" placeholder="ex: Marketing" required />
        </div>
        <div class="fg">
          <label class="fl">Dashboards com Acesso</label>
          <p class="fl-hint">Selecione quais dashboards este perfil pode acessar. Nenhum selecionado = acesso total.</p>
          <div class="dash-grid">
            <label v-for="d in dashboards" :key="d.id" class="dash-check" :class="{ checked: form.allowed.includes(d.id) }">
              <input type="checkbox" :value="d.id" v-model="form.allowed" class="dash-input" />
              <span class="dash-label">{{ d.title }}</span>
            </label>
          </div>
        </div>

        <div class="fg" v-if="features.length">
          <label class="fl">Funcionalidades Especiais</label>
          <p class="fl-hint">Libera recursos alem do acesso basico aos dashboards.</p>
          <div class="dash-grid">
            <label
              v-for="f in features"
              :key="f.id"
              class="dash-check"
              :class="{ checked: form.features.includes(f.id) }"
              :title="f.description || ''"
            >
              <input type="checkbox" :value="f.id" v-model="form.features" class="dash-input" />
              <span class="dash-label">
                {{ f.label }}
                <small v-if="f.description" class="dash-desc">{{ f.description }}</small>
              </span>
            </label>
          </div>
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
import { ref, reactive, watch, onMounted } from 'vue'

const props = defineProps({
  profile: { type: Object, default: null }
})
const emit = defineEmits(['close', 'saved'])

const form = reactive({ name: '', label: '', allowed: [], features: [] })
const dashboards = ref([])
const features = ref([])
const saving = ref(false)
const error = ref('')

watch(() => props.profile, (p) => {
  if (p) {
    form.name = p.name
    form.label = p.label
    form.allowed = [...(p.allowed_dashboards || [])]
    // allowed_features pode vir como array JSON ou string JSON — normalizar
    const raw = p.allowed_features
    const parsed = Array.isArray(raw) ? raw : (raw ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : [])
    form.features = [...parsed]
  } else {
    form.name = ''
    form.label = ''
    form.allowed = []
    form.features = []
  }
}, { immediate: true })

onMounted(async () => {
  try {
    const res = await fetch('/api/admin/dashboards-list')
    const data = await res.json()
    dashboards.value = data.dashboards || []
  } catch { dashboards.value = [] }
  try {
    const res = await fetch('/api/admin/features-list')
    const data = await res.json()
    features.value = data.features || []
  } catch { features.value = [] }
})

async function save() {
  error.value = ''; saving.value = true
  try {
    const body = {
      label: form.label,
      allowed_dashboards: form.allowed,
      allowed_features: form.features
    }
    if (props.profile) {
      const res = await fetch(`/api/admin/profiles/${props.profile.name}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
    } else {
      body.name = form.name
      const res = await fetch('/api/admin/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json(); if (!res.ok) throw new Error(data.error)
    }
    emit('saved'); emit('close')
  } catch (e) { error.value = e.message }
  finally { saving.value = false }
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
.modal-card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 28px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-title { font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 20px; }
.fg { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.fl { font-size: 12px; font-weight: 500; color: #ccc; text-transform: uppercase; letter-spacing: 0.04em; }
.fl-hint { font-size: 11px; color: #666; text-transform: none; letter-spacing: normal; margin: 0; }
.fi { background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 10px 12px; font-size: 14px; color: #fff; font-family: inherit; outline: none; transition: border-color 0.15s; }
.fi:focus { border-color: rgba(255,0,0,0.4); }
.fi:disabled { opacity: 0.4; cursor: not-allowed; }

.dash-grid { display: flex; flex-direction: column; gap: 6px; }
.dash-check {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #141414; border: 1px solid rgba(255,255,255,0.06); border-radius: 4px;
  cursor: pointer; transition: all 0.15s; font-size: 13px; color: #999;
}
.dash-check:hover { border-color: rgba(255,255,255,0.12); color: #ccc; }
.dash-check.checked { border-color: rgba(255,0,0,0.25); color: #fff; background: rgba(255,0,0,0.04); }
.dash-input { accent-color: #ff0000; width: 15px; height: 15px; cursor: pointer; flex-shrink: 0; }
.dash-label { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.dash-desc { font-size: 11px; color: #666; font-weight: normal; }

.fe { font-size: 13px; color: #ff4444; margin: 0; padding: 8px 10px; background: rgba(255,0,0,0.06); border: 1px solid rgba(255,0,0,0.15); border-radius: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.btn-sec { background: rgba(255,255,255,0.04); color: #ccc; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 9px 18px; font-size: 13px; font-family: inherit; cursor: pointer; }
.btn-sec:hover { background: rgba(255,255,255,0.08); }
.btn-pri { background: #ff0000; color: #fff; border: none; border-radius: 4px; padding: 9px 18px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; }
.btn-pri:hover:not(:disabled) { background: #cc0000; }
.btn-pri:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
