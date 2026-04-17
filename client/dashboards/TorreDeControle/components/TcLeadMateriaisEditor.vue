<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const props = defineProps({
  cliente: { type: Object, required: true },
  leadId: { type: String, required: true }
})
const emit = defineEmits(['close', 'updated'])

const tc = useTorreControle()

// Agrupamento de campos conforme print — cada entry e um custom field editavel
const GRUPOS = [
  {
    id: 'documentos',
    titulo: 'Documentos Gerais',
    campos: [
      { id: 1990387, label: 'Link da Pasta do Cliente' },
      { id: 1990385, label: 'Reuniao de Kick-off' }
    ]
  },
  {
    id: 'fase-1',
    titulo: 'Fase 1',
    campos: [
      { id: 1990357, label: 'Link Google Slides' },
      { id: 1990611, label: 'Transcricao' }
    ]
  },
  {
    id: 'fase-2',
    titulo: 'Fase 2',
    campos: [
      { id: 1990679, label: 'Link Google Slides' },
      { id: 1990369, label: 'Link da Reuniao' },
      { id: 1990613, label: 'Transcricao' }
    ]
  },
  {
    id: 'fase-3',
    titulo: 'Fase 3',
    campos: [
      { id: 1990681, label: 'Link Google Slides' },
      { id: 1990373, label: 'Link da Reuniao' },
      { id: 1990615, label: 'Transcricao' },
      { id: 1990781, label: 'Link Figma' },
      { id: 1990783, label: 'Link Miro' }
    ]
  },
  {
    id: 'fase-4',
    titulo: 'Fase 4',
    campos: [
      { id: 1990683, label: 'Link Google Slides' },
      { id: 1990377, label: 'Link da Reuniao' },
      { id: 1990617, label: 'Transcricao' }
    ]
  },
  {
    id: 'fase-5',
    titulo: 'Fase 5',
    campos: [
      { id: 1990685, label: 'Link Google Slides' },
      { id: 1990381, label: 'Link da Reuniao' },
      { id: 1990619, label: 'Transcricao' },
      { id: 1990789, label: 'Link Figma' },
      { id: 1990791, label: 'Link Miro' }
    ]
  }
]

// Abre o grupo da fase atual do lead por padrao
const faseAtualOrdem = Number(props.cliente?.fase_atual_ordem || 0)
const faseAtualSlug = props.cliente?.fase_atual_slug || null
const expandidos = ref(new Set([
  'documentos',
  faseAtualOrdem === 1 || faseAtualSlug === 'kickoff' ? 'fase-1' : `fase-${faseAtualOrdem}`
]))

function toggleGrupo(id) {
  const s = new Set(expandidos.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandidos.value = s
}

// Valor atual de cada campo (do lead origem)
function valorAtual(fieldId) {
  const f = (props.cliente?.custom_fields || []).find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value || ''
}

// State de edicao por campo { [fieldId]: { editando, valor, salvando, savedAt } }
const estado = ref({})
for (const grupo of GRUPOS) {
  for (const c of grupo.campos) {
    estado.value[c.id] = {
      editando: false,
      valor: valorAtual(c.id),
      salvando: false,
      savedAt: null
    }
  }
}

function startEdit(fieldId) {
  estado.value[fieldId] = {
    ...estado.value[fieldId],
    editando: true,
    valor: valorAtual(fieldId)
  }
}

function cancelEdit(fieldId) {
  estado.value[fieldId] = {
    ...estado.value[fieldId],
    editando: false,
    valor: valorAtual(fieldId)
  }
}

async function saveEdit(fieldId, label) {
  const novo = String(estado.value[fieldId].valor || '').trim()
  const antigo = valorAtual(fieldId)
  if (novo === antigo) {
    cancelEdit(fieldId)
    return
  }
  const ok = confirm(`Confirmar alteracao de "${label}"?\n\nNovo valor:\n${novo || '(vazio)'}`)
  if (!ok) return
  estado.value[fieldId] = { ...estado.value[fieldId], salvando: true }
  try {
    await tc.atualizarCustomFieldLead(props.leadId, fieldId, novo)
    // Atualiza o valor local em cliente.custom_fields (reativo — mas o obj veio como prop)
    const cf = props.cliente.custom_fields || []
    const existing = cf.find(x => x.field_id === fieldId)
    if (existing) existing.values = [{ value: novo }]
    else cf.push({ field_id: fieldId, values: [{ value: novo }] })
    estado.value[fieldId] = {
      editando: false,
      valor: novo,
      salvando: false,
      savedAt: Date.now()
    }
    setTimeout(() => {
      if (estado.value[fieldId]?.savedAt) {
        estado.value[fieldId] = { ...estado.value[fieldId], savedAt: null }
      }
    }, 2000)
    emit('updated', { fieldId, value: novo })
  } catch (err) {
    alert('Erro ao atualizar campo no Kommo: ' + (err?.message || err))
    estado.value[fieldId] = { ...estado.value[fieldId], salvando: false }
  }
}

function isUrl(v) {
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim())
}

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => window.lucide && window.lucide.createIcons())
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="lme-overlay" @click.self="emit('close')">
    <div class="lme-modal" role="dialog" aria-modal="true">
      <header class="lme-header">
        <div>
          <h2>Editar materiais do lead</h2>
          <p class="lme-sub">Alteracoes sao aplicadas no Kommo ao confirmar.</p>
        </div>
        <button class="lme-close" @click="emit('close')" aria-label="Fechar">&times;</button>
      </header>

      <div class="lme-body">
        <section v-for="grupo in GRUPOS" :key="grupo.id" class="lme-grupo" :class="{ 'is-open': expandidos.has(grupo.id) }">
          <button class="lme-grupo-head" @click="toggleGrupo(grupo.id)">
            <span class="lme-grupo-titulo">{{ grupo.titulo }}</span>
            <span class="lme-grupo-count">{{ grupo.campos.length }} campos</span>
            <i :data-lucide="expandidos.has(grupo.id) ? 'chevron-up' : 'chevron-down'" class="lme-chevron"></i>
          </button>

          <div v-if="expandidos.has(grupo.id)" class="lme-grupo-body">
            <div v-for="c in grupo.campos" :key="c.id" class="lme-linha">
              <div class="lme-linha-label">{{ c.label }}</div>

              <div class="lme-linha-valor">
                <template v-if="estado[c.id].editando">
                  <input
                    v-model="estado[c.id].valor"
                    type="url"
                    class="lme-input"
                    placeholder="https://..."
                    :disabled="estado[c.id].salvando"
                    @keydown.enter="saveEdit(c.id, c.label)"
                    @keydown.esc="cancelEdit(c.id)"
                  />
                  <div class="lme-acoes">
                    <button class="lme-btn lme-btn--ghost" @click="cancelEdit(c.id)" :disabled="estado[c.id].salvando">
                      Cancelar
                    </button>
                    <button class="lme-btn lme-btn--primary" @click="saveEdit(c.id, c.label)" :disabled="estado[c.id].salvando">
                      {{ estado[c.id].salvando ? 'Salvando...' : 'Salvar' }}
                    </button>
                  </div>
                </template>

                <template v-else>
                  <a v-if="isUrl(valorAtual(c.id))" :href="valorAtual(c.id)" target="_blank" rel="noopener" class="lme-link">
                    {{ valorAtual(c.id) }}
                    <i data-lucide="external-link" class="lme-link-icon"></i>
                  </a>
                  <span v-else-if="valorAtual(c.id)" class="lme-valor-texto">{{ valorAtual(c.id) }}</span>
                  <span v-else class="lme-vazio">Nao preenchido</span>

                  <span v-if="estado[c.id].savedAt" class="lme-saved">
                    <i data-lucide="check" class="lme-check-icon"></i>
                    salvo
                  </span>

                  <button v-else class="lme-btn lme-btn--edit" @click="startEdit(c.id)">
                    <i data-lucide="edit-3" class="lme-edit-icon"></i>
                    {{ valorAtual(c.id) ? 'Editar' : 'Adicionar' }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="lme-footer">
        <span class="lme-help">Lead #{{ leadId }} · Kommo</span>
        <button class="lme-btn lme-btn--ghost" @click="emit('close')">Fechar</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.lme-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: lme-fade 150ms ease-out;
}
@keyframes lme-fade { from { opacity: 0; } to { opacity: 1; } }

.lme-modal {
  background: #141414;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  width: min(720px, 100%);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: lme-in 180ms ease-out;
}
@keyframes lme-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.lme-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.lme-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}
.lme-sub {
  font-size: 12px;
  color: #888;
  margin: 4px 0 0;
}
.lme-close {
  background: transparent;
  border: none;
  color: #666;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color 120ms;
}
.lme-close:hover { color: #fff; }

.lme-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lme-body::-webkit-scrollbar { width: 6px; }
.lme-body::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }

.lme-grupo {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  overflow: hidden;
}
.lme-grupo.is-open {
  border-color: rgba(255, 255, 255, 0.08);
}
.lme-grupo-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: #ddd;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 120ms;
}
.lme-grupo-head:hover {
  background: rgba(255, 255, 255, 0.03);
}
.lme-grupo-titulo {
  text-align: left;
  flex: 1;
}
.lme-grupo-count {
  font-size: 11px;
  font-weight: 400;
  color: #666;
}
.lme-chevron { width: 14px; height: 14px; color: #888; flex-shrink: 0; }

.lme-grupo-body {
  padding: 4px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lme-linha {
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  gap: 14px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}
.lme-linha:first-child { border-top: none; }

.lme-linha-label {
  font-size: 12.5px;
  color: #aaa;
  line-height: 1.4;
}

.lme-linha-valor {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.lme-link {
  color: #4aa3ff;
  font-size: 12.5px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lme-link:hover { text-decoration: underline; }
.lme-link-icon { width: 11px; height: 11px; flex-shrink: 0; }

.lme-valor-texto {
  font-size: 12.5px;
  color: #ddd;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lme-vazio {
  font-size: 12px;
  color: #555;
  font-style: italic;
  flex: 1;
}

.lme-input {
  flex: 1;
  min-width: 0;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  color: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 120ms;
}
.lme-input:focus { border-color: #ff0000; }

.lme-acoes {
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
}

.lme-btn {
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.lme-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.lme-btn--edit {
  color: #888;
}
.lme-btn--edit:hover:not(:disabled) {
  color: #fff;
  border-color: #333;
  background: rgba(255, 255, 255, 0.03);
}
.lme-edit-icon { width: 11px; height: 11px; }

.lme-btn--ghost:hover:not(:disabled) {
  background: #2a2a2a;
  color: #fff;
}
.lme-btn--primary {
  background: #ff0000;
  border-color: #ff0000;
  color: #fff;
}
.lme-btn--primary:hover:not(:disabled) {
  background: #cc0000;
  border-color: #cc0000;
}

.lme-saved {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: #22c55e;
  font-weight: 500;
  animation: lme-fade 150ms ease-out;
}
.lme-check-icon { width: 12px; height: 12px; }

.lme-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.lme-help {
  font-size: 11.5px;
  color: #666;
  letter-spacing: 0.3px;
}

@media (max-width: 640px) {
  .lme-linha {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
