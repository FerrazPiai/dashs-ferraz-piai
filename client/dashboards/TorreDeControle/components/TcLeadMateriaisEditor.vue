<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const props = defineProps({
  cliente: { type: Object, required: true },
  leadId: { type: String, required: true }
})
const emit = defineEmits(['close', 'updated'])

const tc = useTorreControle()

// Box 1: Dados principais do lead (sempre visivel, campos curtos em grid)
// Esses sao campos unicos do lead, nao fazem parte dos grupos Fase N
const DADOS_PRINCIPAIS = [
  { id: 1990229, label: 'Account', tipo: 'texto' },
  { id: 1990267, label: 'Coordenador', tipo: 'texto' },
  { id: 1989938, label: 'Squad', tipo: 'texto' }
]

// Box 2: Materiais por fase (accordion — so 1 grupo aberto por vez)
// 'multiline: true' renderiza textarea (textos longos); default e input de URL
const GRUPOS = [
  {
    id: 'contexto',
    titulo: 'Contexto do Cliente',
    campos: [
      { id: 1989878, label: 'Descricao da Empresa', multiline: true },
      { id: 1989880, label: 'Objetivo da Empresa', multiline: true },
      { id: 1989898, label: 'Dores do Negocio', multiline: true },
      { id: 1989904, label: 'Stack de Ferramentas', multiline: true },
      { id: 1989914, label: 'Participantes', multiline: true },
      { id: 1989922, label: 'Perfil DISC', multiline: true },
      { id: 1989890, label: 'Cenario do Marketing', multiline: true },
      { id: 1989892, label: 'Consciencia das Metricas', multiline: true }
    ]
  },
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

// Acordeao: apenas 1 grupo aberto por vez. Default: grupo da fase atual ou Contexto.
const faseAtualOrdem = Number(props.cliente?.fase_atual_ordem || 0)
const faseAtualSlug = props.cliente?.fase_atual_slug || null
const grupoDefault = faseAtualOrdem >= 1 && faseAtualOrdem <= 5
  ? `fase-${faseAtualOrdem}`
  : (faseAtualSlug === 'kickoff' ? 'fase-1' : 'contexto')
const grupoAberto = ref(grupoDefault)

function isAberto(id) {
  return grupoAberto.value === id
}

function toggleGrupo(id) {
  grupoAberto.value = grupoAberto.value === id ? null : id
  nextTick(() => window.lucide && window.lucide.createIcons())
}

// Valor atual de cada campo (do lead origem)
function valorAtual(fieldId) {
  const f = (props.cliente?.custom_fields || []).find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value || ''
}

// State de edicao por campo { [fieldId]: { editando, valor, salvando, savedAt } }
const estado = ref({})
function inicializarCampo(fieldId, novoMap) {
  const atual = estado.value[fieldId]
  if (atual?.editando) {
    novoMap[fieldId] = atual
  } else {
    novoMap[fieldId] = {
      editando: false,
      valor: valorAtual(fieldId),
      salvando: false,
      savedAt: null
    }
  }
}
function inicializarEstado() {
  const novo = {}
  for (const c of DADOS_PRINCIPAIS) inicializarCampo(c.id, novo)
  for (const grupo of GRUPOS) {
    for (const c of grupo.campos) inicializarCampo(c.id, novo)
  }
  estado.value = novo
}
inicializarEstado()

// Ressincroniza quando custom_fields do lead forem atualizados via API
watch(() => props.cliente?.custom_fields, () => {
  inicializarEstado()
  nextTick(() => window.lucide && window.lucide.createIcons())
}, { deep: true })

function startEdit(fieldId) {
  estado.value[fieldId] = {
    ...estado.value[fieldId],
    editando: true,
    valor: valorAtual(fieldId)
  }
  nextTick(() => window.lucide && window.lucide.createIcons())
}

function cancelEdit(fieldId) {
  estado.value[fieldId] = {
    ...estado.value[fieldId],
    editando: false,
    valor: valorAtual(fieldId)
  }
  nextTick(() => window.lucide && window.lucide.createIcons())
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

// Verifica se existe alguma edicao em curso com valor diferente do salvo
function temAlteracoesPendentes() {
  for (const fieldId in estado.value) {
    const e = estado.value[fieldId]
    if (e?.editando) {
      const valorDigitado = String(e.valor ?? '').trim()
      const valorSalvo = String(valorAtual(Number(fieldId)) ?? '').trim()
      if (valorDigitado !== valorSalvo) return true
    }
  }
  return false
}

function tentarFechar() {
  if (temAlteracoesPendentes()) {
    const ok = confirm('Voce tem alteracoes nao salvas.\n\nDeseja sair sem salvar?')
    if (!ok) return
  }
  emit('close')
}

function handleKeydown(e) {
  if (e.key === 'Escape') tentarFechar()
}

// Metadata dos custom fields (type + enums) — carregada ao montar
const fieldsMeta = ref({})
function fieldMeta(fieldId) {
  return fieldsMeta.value[fieldId] || null
}
function isSelect(fieldId) {
  const m = fieldMeta(fieldId)
  return !!(m && (m.type === 'select' || m.type === 'multiselect'))
}
function opcoesSelect(fieldId) {
  const m = fieldMeta(fieldId)
  return Array.isArray(m?.enums) ? m.enums : []
}

// Scroll lock: trava scroll da pagina de fundo enquanto o modal esta aberto
let prevBodyOverflow = ''
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  prevBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  nextTick(() => window.lucide && window.lucide.createIcons())
  try {
    const meta = await tc.carregarCustomFieldsMetadata()
    fieldsMeta.value = meta || {}
  } catch (err) {
    console.warn('[LME] falha ao carregar metadata de custom fields:', err?.message || err)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = prevBodyOverflow
})
</script>

<template>
  <Teleport to="body">
    <div class="lme-overlay" @click.self="tentarFechar">
      <div class="lme-modal" role="dialog" aria-modal="true">
        <header class="lme-header">
          <div>
            <h2>Editar materiais do lead</h2>
            <p class="lme-sub">Alteracoes sao aplicadas no Kommo ao confirmar.</p>
          </div>
          <button class="lme-close" @click="tentarFechar" aria-label="Fechar">&times;</button>
        </header>

        <div class="lme-body">
          <!-- Box 1: Dados Principais (sempre visivel, grid horizontal) -->
          <section class="lme-box lme-box--principais">
            <header class="lme-box-head">
              <span class="lme-box-titulo">Dados Principais</span>
              <span class="lme-box-sub">Campos unicos do lead</span>
            </header>
            <div class="lme-principais-grid">
              <div
                v-for="c in DADOS_PRINCIPAIS"
                :key="c.id"
                class="lme-principal-campo"
                :class="{ 'is-editando': estado[c.id]?.editando }"
              >
                <label class="lme-principal-label">{{ c.label }}</label>

                <template v-if="estado[c.id]?.editando">
                  <select
                    v-if="isSelect(c.id)"
                    v-model="estado[c.id].valor"
                    class="lme-input"
                    :disabled="estado[c.id].salvando"
                    @keydown.esc="cancelEdit(c.id)"
                  >
                    <option value="">(vazio)</option>
                    <option v-for="op in opcoesSelect(c.id)" :key="op.id" :value="op.value">
                      {{ op.value }}
                    </option>
                  </select>
                  <input
                    v-else
                    v-model="estado[c.id].valor"
                    type="text"
                    class="lme-input"
                    :placeholder="c.label"
                    :disabled="estado[c.id].salvando"
                    @keydown.enter="saveEdit(c.id, c.label)"
                    @keydown.esc="cancelEdit(c.id)"
                  />
                  <div class="lme-acoes lme-acoes--inline">
                    <button type="button" class="lme-btn lme-btn--ghost" @click="cancelEdit(c.id)" :disabled="estado[c.id].salvando">
                      Cancelar
                    </button>
                    <button type="button" class="lme-btn lme-btn--primary" @click="saveEdit(c.id, c.label)" :disabled="estado[c.id].salvando">
                      {{ estado[c.id].salvando ? 'Salvando...' : 'Salvar' }}
                    </button>
                  </div>
                </template>

                <template v-else>
                  <div class="lme-principal-valor-row">
                    <span v-if="valorAtual(c.id)" class="lme-principal-valor">{{ valorAtual(c.id) }}</span>
                    <span v-else class="lme-vazio">Nao preenchido</span>

                    <span v-if="estado[c.id]?.savedAt" class="lme-saved">
                      <i data-lucide="check" class="lme-check-icon"></i>
                      salvo
                    </span>
                    <button v-else type="button" class="lme-btn lme-btn--edit" @click="startEdit(c.id)">
                      <i data-lucide="edit-3" class="lme-edit-icon"></i>
                      {{ valorAtual(c.id) ? 'Editar' : 'Adicionar' }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </section>

          <!-- Box 2: Materiais por fase (accordion) -->
          <section class="lme-box lme-box--fases">
            <header class="lme-box-head">
              <span class="lme-box-titulo">Materiais e Contexto</span>
              <span class="lme-box-sub">Abrir 1 secao por vez</span>
            </header>
            <section v-for="grupo in GRUPOS" :key="grupo.id" class="lme-grupo" :class="{ 'is-open': isAberto(grupo.id) }">
            <button class="lme-grupo-head" @click="toggleGrupo(grupo.id)">
              <span class="lme-grupo-titulo">{{ grupo.titulo }}</span>
              <span class="lme-grupo-count">{{ grupo.campos.length }} campos</span>
              <i :data-lucide="isAberto(grupo.id) ? 'chevron-up' : 'chevron-down'" class="lme-chevron"></i>
            </button>

            <div v-if="isAberto(grupo.id)" class="lme-grupo-body">
              <div
                v-for="c in grupo.campos"
                :key="c.id"
                class="lme-linha"
                :class="{ 'lme-linha--multiline': c.multiline, 'lme-linha--editando': estado[c.id]?.editando }"
              >
                <div class="lme-linha-label">{{ c.label }}</div>

                <div class="lme-linha-valor">
                  <template v-if="estado[c.id]?.editando">
                    <select
                      v-if="isSelect(c.id)"
                      v-model="estado[c.id].valor"
                      class="lme-input"
                      :disabled="estado[c.id].salvando"
                      @keydown.esc="cancelEdit(c.id)"
                    >
                      <option value="">(vazio)</option>
                      <option v-for="op in opcoesSelect(c.id)" :key="op.id" :value="op.value">
                        {{ op.value }}
                      </option>
                    </select>
                    <textarea
                      v-else-if="c.multiline"
                      v-model="estado[c.id].valor"
                      class="lme-input lme-textarea"
                      rows="4"
                      placeholder="Texto livre..."
                      :disabled="estado[c.id].salvando"
                      @keydown.esc="cancelEdit(c.id)"
                    />
                    <input
                      v-else
                      v-model="estado[c.id].valor"
                      type="url"
                      class="lme-input"
                      placeholder="https://..."
                      :disabled="estado[c.id].salvando"
                      @keydown.enter="saveEdit(c.id, c.label)"
                      @keydown.esc="cancelEdit(c.id)"
                    />
                    <div class="lme-acoes">
                      <button type="button" class="lme-btn lme-btn--ghost" @click="cancelEdit(c.id)" :disabled="estado[c.id].salvando">
                        Cancelar
                      </button>
                      <button type="button" class="lme-btn lme-btn--primary" @click="saveEdit(c.id, c.label)" :disabled="estado[c.id].salvando">
                        {{ estado[c.id].salvando ? 'Salvando...' : 'Salvar' }}
                      </button>
                    </div>
                  </template>

                  <template v-else>
                    <a v-if="!c.multiline && isUrl(valorAtual(c.id))" :href="valorAtual(c.id)" target="_blank" rel="noopener" class="lme-link">
                      {{ valorAtual(c.id) }}
                      <i data-lucide="external-link" class="lme-link-icon"></i>
                    </a>
                    <span v-else-if="valorAtual(c.id)" class="lme-valor-texto" :class="{ 'lme-valor-texto--multiline': c.multiline }">{{ valorAtual(c.id) }}</span>
                    <span v-else class="lme-vazio">Nao preenchido</span>

                    <span v-if="estado[c.id]?.savedAt" class="lme-saved">
                      <i data-lucide="check" class="lme-check-icon"></i>
                      salvo
                    </span>

                    <button v-else type="button" class="lme-btn lme-btn--edit" @click="startEdit(c.id)">
                      <i data-lucide="edit-3" class="lme-edit-icon"></i>
                      {{ valorAtual(c.id) ? 'Editar' : 'Adicionar' }}
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </section>
          </section>
        </div>

        <footer class="lme-footer">
          <span class="lme-help">Lead #{{ leadId }} · Kommo</span>
          <button type="button" class="lme-btn lme-btn--ghost" @click="tentarFechar">Fechar</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lme-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: lme-fade 150ms ease-out;
  /* Bloqueia scroll do fundo quando sobra espaco lateral */
  overscroll-behavior: contain;
}
@keyframes lme-fade { from { opacity: 0; } to { opacity: 1; } }

.lme-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  width: min(1100px, 100%);
  /* height + max-height + min-height: 0 garantem scroll interno confiavel */
  max-height: calc(100vh - 48px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  animation: lme-in 180ms ease-out;
  overflow: hidden;
}
@keyframes lme-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.lme-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-row);
  background: var(--bg-card);
}
.lme-header h2 {
  font-size: 16px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  margin: 0;
}
.lme-sub {
  font-size: var(--font-size-base);
  color: var(--text-muted);
  margin: 4px 0 0;
}
.lme-close {
  background: transparent;
  border: none;
  color: var(--text-lowest);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
}
.lme-close:hover { color: var(--text-high); }

.lme-body {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lme-body::-webkit-scrollbar { width: 6px; }
.lme-body::-webkit-scrollbar-thumb { background: var(--border-card); border-radius: 3px; }
.lme-body::-webkit-scrollbar-thumb:hover { background: var(--border-input); }

/* === Boxes (containers de nivel superior) === */
.lme-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
/* Box Principais: visual de card (destaque para os dados unicos) */
.lme-box--principais {
  background: var(--bg-inner);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}
/* Box Fases: apenas seccao logica, sem background proprio (grupos ja tem card) */
.lme-box--fases {
  padding: 0;
}
.lme-box-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
}
.lme-box--principais .lme-box-head {
  border-bottom: 1px solid var(--border-row);
}
.lme-box-titulo {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-low);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.lme-box-sub {
  font-size: var(--font-size-sm);
  color: var(--text-lowest);
}

/* === Dados Principais (grid horizontal, campos curtos) === */
.lme-principais-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.lme-principal-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-body);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast);
}
.lme-principal-campo.is-editando {
  border-color: var(--color-primary);
}
.lme-principal-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-low);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.lme-principal-valor-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.lme-principal-valor {
  font-size: var(--font-size-md);
  color: var(--text-high);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
.lme-acoes--inline {
  display: inline-flex;
  gap: 4px;
  align-self: flex-end;
  margin-top: 2px;
}

@media (max-width: 880px) {
  .lme-principais-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .lme-principais-grid { grid-template-columns: 1fr; }
}

.lme-grupo {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.lme-grupo.is-open {
  border-color: var(--border-card);
}
.lme-grupo-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--text-medium);
  font-family: inherit;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.lme-grupo-head:hover {
  background: var(--bg-hover);
}
.lme-grupo-titulo {
  text-align: left;
  flex: 1;
}
.lme-grupo-count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  color: var(--text-lowest);
}
.lme-chevron { width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0; }

.lme-grupo-body {
  padding: 4px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lme-linha {
  display: grid;
  grid-template-columns: 200px 1fr;
  align-items: center;
  gap: var(--spacing-md);
  padding: 8px 0;
  border-top: 1px solid var(--border-row);
}
.lme-linha:first-child { border-top: none; }
.lme-linha--multiline {
  align-items: flex-start;
  padding: var(--spacing-md) 0;
}
.lme-linha--multiline .lme-linha-label {
  padding-top: 4px;
}
/* Em modo de edicao multiline, o textarea ocupa a linha inteira (label em cima) */
.lme-linha--editando.lme-linha--multiline {
  grid-template-columns: 1fr;
  gap: 6px;
}
.lme-linha--editando.lme-linha--multiline .lme-linha-label {
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  padding-top: 0;
}
.lme-textarea {
  width: 100%;
  min-height: 90px;
  max-height: 320px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.55;
}
/* Multiline em modo "ver" — texto flui naturalmente, sem scroll interno individual.
   O unico scroll e o .lme-body (modal inteiro). */
.lme-valor-texto--multiline {
  white-space: pre-wrap !important;
  overflow: visible !important;
  text-overflow: unset !important;
  line-height: 1.6;
  word-break: break-word;
  max-height: none !important;
}

.lme-linha-label {
  font-size: var(--font-size-md);
  color: var(--text-low);
  line-height: 1.4;
  font-weight: var(--font-weight-medium);
}

.lme-linha-valor {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
  flex-wrap: wrap;
}
.lme-linha--editando .lme-linha-valor {
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
}
.lme-linha--editando .lme-acoes {
  align-self: flex-end;
}

/* Link discreto — sem azul (proibido) e sem vermelho (destaque excessivo).
   Cinza claro com underline indica clicabilidade. */
.lme-link {
  color: var(--text-medium);
  font-size: var(--font-size-md);
  text-decoration: underline;
  text-decoration-color: var(--text-lowest);
  text-underline-offset: 2px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--transition-fast), text-decoration-color var(--transition-fast);
}
.lme-link:hover {
  color: var(--text-high);
  text-decoration-color: var(--text-medium);
}
.lme-link-icon { width: 11px; height: 11px; flex-shrink: 0; }

.lme-valor-texto {
  font-size: var(--font-size-md);
  color: var(--text-medium);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lme-vazio {
  font-size: var(--font-size-base);
  color: var(--text-lowest);
  font-style: italic;
  flex: 1;
}

.lme-input {
  flex: 1;
  min-width: 0;
  background: var(--bg-body);
  border: 1px solid var(--border-card);
  color: var(--text-high);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-family: inherit;
  outline: none;
  transition: border-color var(--transition-fast);
}
.lme-input:focus { border-color: var(--color-primary); }

.lme-acoes {
  display: inline-flex;
  gap: 4px;
  flex-shrink: 0;
}

.lme-btn {
  background: transparent;
  border: 1px solid var(--border-card);
  color: var(--text-medium);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.lme-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.lme-btn--edit {
  color: var(--text-muted);
}
.lme-btn--edit:hover:not(:disabled) {
  color: var(--text-high);
  border-color: var(--border-input);
  background: var(--bg-hover);
}
.lme-edit-icon { width: 11px; height: 11px; }

.lme-btn--ghost:hover:not(:disabled) {
  background: var(--bg-toggle-active);
  color: var(--text-high);
}
.lme-btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--text-high);
}
.lme-btn--primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  border-color: var(--color-primary-dark);
}

.lme-saved {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-safe);
  font-weight: var(--font-weight-medium);
  animation: lme-fade 150ms ease-out;
}
.lme-check-icon { width: 12px; height: 12px; }

.lme-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-row);
  background: var(--bg-card);
}
.lme-help {
  font-size: var(--font-size-sm);
  color: var(--text-lowest);
  letter-spacing: 0.3px;
}

@media (max-width: 640px) {
  .lme-linha {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .lme-linha--multiline .lme-linha-label {
    padding-top: 0;
  }
}
</style>
