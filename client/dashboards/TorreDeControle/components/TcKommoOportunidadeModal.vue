<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const props = defineProps({
  cliente: { type: Object, required: true },
  oportunidades: { type: Array, default: () => [] },
  analiseId: { type: Number, default: null },
  leadId: { type: String, required: true }
})
const emit = defineEmits(['close', 'created'])

const tc = useTorreControle()

const catalogo = ref({ produtos: [], categorias: [], solucoes: [] })
const selecionadas = ref(new Set())
const produtoCfg = ref({}) // { idxOp: { produto_id, valor, categoria_id } }
const submitting = ref(false)
const errorMsg = ref('')

// Campos do lead herdados (editaveis) — fallback robusto: custom_fields -> props diretas -> vazio.
// `??` preserva `0` / `false` como valores validos (antes `|| ''` transformava em string vazia).
function getCF(fieldId) {
  const f = (props.cliente?.custom_fields || []).find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value ?? ''
}
// Tier: tenta custom field, depois prop direta do cliente, depois segmento — nunca fica vazio se o lead tem qualquer classificacao
const tier = getCF(1989461) || props.cliente?.tier || props.cliente?.segmento || ''
// Flag: tenta custom field, depois props direta, depois qualquer hint de flag na primeira oportunidade
const flagHerdado = getCF(1989972)
  || props.cliente?.flag
  || (props.oportunidades?.[0]?.flag ?? '')
  || ''

const form = ref({
  name: `${props.cliente?.nome || 'Lead'} — Expansao ${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
  oportunidade_mapeada: 'Sim',
  solucao_id: null,
  tier: tier || null,                  // editavel via select (enum_id apos carregar metadata)
  flag: flagHerdado,
  squad: getCF(1989938) || props.cliente?.squad || '',
  dores: (props.oportunidades || [])
    .slice(0, 4)
    .map(o => `- ${o.descricao || o.titulo || 'Oportunidade sem descricao'}`).join('\n') || getCF(1989932) || '',
  coordenador_email: getCF(1990181) || '',
  account: getCF(1990229) || ''
})

// Texto exibido no card do produto — NUNCA vazio mesmo se a IA nao retornou titulo
function tituloProduto(op) {
  return (op?.titulo && String(op.titulo).trim())
    || (op?.descricao && String(op.descricao).trim().split('.')[0].slice(0, 80))
    || 'Produto sugerido (sem titulo)'
}

const ordenadas = computed(() =>
  [...props.oportunidades].sort((a, b) =>
    Number(b.probabilidade_fechamento || 0) - Number(a.probabilidade_fechamento || 0)
  )
)

const totalSelecionadas = computed(() => selecionadas.value.size)
const limiteAtingido = computed(() => totalSelecionadas.value >= 4)
const valorTotal = computed(() => {
  let total = 0
  for (const i of selecionadas.value) {
    total += Number(produtoCfg.value[i]?.valor || 0)
  }
  return total
})

function toggleOp(i) {
  const s = new Set(selecionadas.value)
  if (s.has(i)) {
    s.delete(i)
    delete produtoCfg.value[i]
  } else {
    if (s.size >= 4) return
    s.add(i)
    const op = ordenadas.value[i]
    produtoCfg.value[i] = {
      produto_id: op.kommo_produto_id || null,
      valor: Number(op.valor_estimado || 0),
      categoria_id: op.kommo_categoria_id || null
    }
    if (!form.value.solucao_id && op.kommo_solucao_id) {
      form.value.solucao_id = op.kommo_solucao_id
    }
  }
  selecionadas.value = s
}

function brl(v) {
  return Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  })
}
function probClass(p) {
  const n = Number(p)
  if (n >= 70) return 'badge--alta'
  if (n >= 40) return 'badge--media'
  return 'badge--baixa'
}

async function handleSubmit() {
  errorMsg.value = ''
  if (selecionadas.value.size === 0) {
    errorMsg.value = 'Selecione ao menos 1 produto.'
    return
  }
  if (!form.value.name.trim()) {
    errorMsg.value = 'Nome do lead obrigatorio.'
    return
  }
  const produtos = []
  for (const i of selecionadas.value) {
    const cfg = produtoCfg.value[i]
    if (!cfg?.produto_id) {
      errorMsg.value = 'Escolha o produto Kommo para todos os items selecionados.'
      return
    }
    produtos.push({
      produto_id: Number(cfg.produto_id),
      valor: Number(cfg.valor || 0),
      categoria_id: cfg.categoria_id ? Number(cfg.categoria_id) : null
    })
  }

  submitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      produtos,
      campos: {
        tier: form.value.tier,
        oportunidade_mapeada: form.value.oportunidade_mapeada,
        solucao_id: form.value.solucao_id || null,
        flag: form.value.flag,
        squad: form.value.squad,
        dores: form.value.dores,
        coordenador_email: form.value.coordenador_email,
        account: form.value.account
      },
      fonte: {
        analise_id: props.analiseId,
        lead_origem_id: props.leadId
      }
    }
    const r = await tc.criarOportunidadeKommo(payload)
    emit('created', r)
  } catch (err) {
    errorMsg.value = err.message || 'Erro ao criar lead no Kommo'
  } finally {
    submitting.value = false
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

// Metadata dos custom fields — usado pra montar selects (Tier, Flag, Squad) com opcoes reais do Kommo
const fieldsMetadata = ref({})
const TIER_FIELD_ID = 1989461
const FLAG_FIELD_ID = 1989972
const SQUAD_FIELD_ID = 1989938
function enumsFor(fieldId) {
  return fieldsMetadata.value?.[fieldId]?.enums || []
}
// Converte um valor existente (texto) para o enum_id correspondente (Kommo usa id para selects)
function textToEnumId(fieldId, textValue) {
  if (!textValue) return null
  const enums = enumsFor(fieldId)
  const match = enums.find(e => String(e.value).toLowerCase() === String(textValue).toLowerCase())
  return match?.id || null
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    catalogo.value = await tc.carregarCatalogoKommo()
  } catch (err) {
    errorMsg.value = 'Falha ao carregar catalogo Kommo: ' + err.message
  }
  // Metadata dos custom fields pra renderizar selects reais de Tier/Flag/Squad
  try {
    fieldsMetadata.value = await tc.carregarCustomFieldsMetadata()
    // Se vieram valores herdados em formato texto, converte para enum_id
    if (typeof form.value.flag === 'string') {
      const enumId = textToEnumId(FLAG_FIELD_ID, form.value.flag)
      if (enumId) form.value.flag = enumId
      else form.value.flag = null
    }
    if (typeof form.value.squad === 'string') {
      const enumId = textToEnumId(SQUAD_FIELD_ID, form.value.squad)
      if (enumId) form.value.squad = enumId
      else form.value.squad = null
    }
    if (typeof form.value.tier === 'string' || typeof tier === 'string') {
      const enumId = textToEnumId(TIER_FIELD_ID, form.value.tier || tier)
      form.value.tier = enumId || null
    }
  } catch (err) {
    console.warn('[kop] metadata de custom fields indisponivel:', err.message)
  }
  nextTick(() => window.lucide && window.lucide.createIcons())
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="kop-overlay" @click.self="emit('close')">
    <div class="kop-modal" role="dialog" aria-modal="true">
      <header class="kop-header">
        <div>
          <h2>Criar oportunidade no Kommo</h2>
          <p class="kop-sub">
            <span class="kop-pipeline-chip">Pipeline Expansao · 12184212</span>
            <span class="kop-sub-hint">sem selecao de etapa — Kommo coloca na primeira</span>
          </p>
        </div>
        <button class="kop-close" @click="emit('close')" aria-label="Fechar">&times;</button>
      </header>

      <div v-if="errorMsg" class="kop-erro">
        <i data-lucide="alert-circle" class="kop-erro-icon"></i>
        {{ errorMsg }}
      </div>

      <div class="kop-body">
        <!-- SECAO 1: Selecionar produtos -->
        <section class="kop-section">
          <div class="kop-section-head">
            <h3>
              <span class="kop-step-num">1</span>
              Selecionar produtos
            </h3>
            <span class="kop-section-hint">ate 4 por lead · {{ totalSelecionadas }}/4 selecionados</span>
          </div>

          <div class="kop-ops">
            <div
              v-for="(op, i) in ordenadas"
              :key="i"
              class="kop-op"
              :class="{
                'is-selected': selecionadas.has(i),
                'is-disabled': !selecionadas.has(i) && limiteAtingido
              }"
              @click="toggleOp(i)"
            >
              <div class="kop-op-check">
                <i v-if="selecionadas.has(i)" data-lucide="check" class="kop-op-check-icon"></i>
              </div>
              <div class="kop-op-body">
                <div class="kop-op-head">
                  <strong>{{ op.titulo }}</strong>
                  <span class="kop-badge" :class="probClass(op.probabilidade_fechamento)">
                    {{ Number(op.probabilidade_fechamento || 0).toFixed(0) }}%
                  </span>
                </div>
                <div class="kop-op-meta">
                  <span>{{ brl(op.valor_estimado) }}</span>
                </div>

                <div v-if="selecionadas.has(i)" class="kop-op-form" @click.stop>
                  <label>
                    Produto Kommo
                    <select v-model="produtoCfg[i].produto_id">
                      <option :value="null" disabled>Selecione...</option>
                      <option v-for="p in catalogo.produtos" :key="p.id" :value="p.id">{{ p.nome }}</option>
                    </select>
                  </label>
                  <label>
                    Valor (R$)
                    <input v-model.number="produtoCfg[i].valor" type="number" min="0" step="100" />
                  </label>
                  <label>
                    Categoria
                    <select v-model="produtoCfg[i].categoria_id">
                      <option :value="null" disabled>Selecione...</option>
                      <option v-for="c in catalogo.categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECAO 2: Dados do lead -->
        <section class="kop-section">
          <div class="kop-section-head">
            <h3>
              <span class="kop-step-num">2</span>
              Dados do lead
            </h3>
            <span class="kop-section-hint">herdados do lead origem · editaveis</span>
          </div>

          <div class="kop-fields">
            <label class="kop-field kop-field--full">
              Nome do lead
              <input v-model="form.name" type="text" />
            </label>
            <label class="kop-field">
              Tier
              <select v-model="form.tier">
                <option :value="null">Selecione...</option>
                <option v-for="e in enumsFor(TIER_FIELD_ID)" :key="e.id" :value="e.id">{{ e.value }}</option>
              </select>
              <span class="kop-field-hint">herdado do lead origem — editável</span>
            </label>
            <label class="kop-field">
              Oportunidade Mapeada
              <select v-model="form.oportunidade_mapeada">
                <option value="Sim">Sim</option>
                <option value="Nao">Não</option>
              </select>
            </label>
            <label class="kop-field">
              Solução
              <select v-model="form.solucao_id">
                <option :value="null">Nenhuma</option>
                <option v-for="s in catalogo.solucoes" :key="s.id" :value="s.id">{{ s.nome }}</option>
              </select>
            </label>
            <label class="kop-field">
              Flag
              <select v-model="form.flag">
                <option :value="null">Selecione...</option>
                <option v-for="e in enumsFor(FLAG_FIELD_ID)" :key="e.id" :value="e.id">{{ e.value }}</option>
              </select>
            </label>
            <label class="kop-field">
              Coordenador
              <select v-model="form.squad">
                <option :value="null">Selecione...</option>
                <option v-for="e in enumsFor(SQUAD_FIELD_ID)" :key="e.id" :value="e.id">{{ e.value }}</option>
              </select>
              <span class="kop-field-hint">campo "Squad" no Kommo</span>
            </label>
            <label class="kop-field">
              Account
              <input v-model="form.account" type="text" />
            </label>
            <label class="kop-field">
              E-mail do Coordenador
              <input v-model="form.coordenador_email" type="email" />
            </label>
            <label class="kop-field kop-field--full">
              Dores do negocio
              <textarea v-model="form.dores" rows="3"></textarea>
            </label>
          </div>
        </section>
      </div>

      <footer class="kop-footer">
        <div class="kop-footer-total">
          <span class="kop-total-label">Valor total:</span>
          <span class="kop-total-val">{{ brl(valorTotal) }}</span>
        </div>
        <div class="kop-footer-actions">
          <button class="kop-btn kop-btn--ghost" @click="emit('close')" :disabled="submitting">Cancelar</button>
          <button
            class="kop-btn kop-btn--primary"
            @click="handleSubmit"
            :disabled="submitting || selecionadas.size === 0"
          >
            <i data-lucide="upload" class="kop-btn-icon"></i>
            {{ submitting ? 'Criando...' : 'Criar no Kommo' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.kop-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 9600;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: kop-fade 150ms ease-out;
}
@keyframes kop-fade { from { opacity: 0; } to { opacity: 1; } }

.kop-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 10px;
  width: min(860px, 100%);
  max-height: 94vh;
  display: flex; flex-direction: column;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
  animation: kop-in 180ms ease-out;
}
@keyframes kop-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.kop-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 14px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border-row);
}
.kop-header h2 { font-size: 17px; color: var(--text-high); margin: 0; font-weight: var(--font-weight-semibold); }
.kop-sub {
  margin: 6px 0 0;
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}
.kop-pipeline-chip {
  font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
  background: rgba(var(--color-primary-rgb), 0.18); color: var(--color-primary);
  padding: 3px 10px; border-radius: 10px;
  letter-spacing: 0.3px; text-transform: uppercase;
}
.kop-sub-hint { font-size: var(--font-size-base); color: var(--text-muted); font-style: italic; }

.kop-close {
  background: transparent; border: none;
  color: var(--text-lowest); font-size: 26px; line-height: 1;
  cursor: pointer; padding: 0;
  transition: color var(--transition-fast);
}
.kop-close:hover { color: var(--text-high); }

.kop-erro {
  margin: 12px 22px 0;
  padding: 10px 14px;
  background: rgba(var(--color-danger-rgb), 0.1);
  border-left: 3px solid var(--color-danger);
  border-radius: var(--radius-sm);
  color: var(--color-danger); font-size: var(--font-size-md);
  display: flex; gap: 8px; align-items: center;
}
.kop-erro-icon { width: 16px; height: 16px; flex-shrink: 0; }

.kop-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 22px;
  display: flex; flex-direction: column; gap: 20px;
}
.kop-body::-webkit-scrollbar { width: 6px; }
.kop-body::-webkit-scrollbar-thumb { background: var(--border-card); border-radius: 3px; }

.kop-section { display: flex; flex-direction: column; gap: 10px; }
.kop-section-head {
  display: flex; justify-content: space-between;
  align-items: baseline; gap: 10px;
}
.kop-section-head h3 {
  font-size: var(--font-size-md); color: var(--text-high); font-weight: var(--font-weight-semibold);
  margin: 0; display: flex; align-items: center; gap: 10px;
  text-transform: uppercase; letter-spacing: 0.4px;
}
.kop-step-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--color-primary); color: var(--text-high);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);
}
.kop-section-hint { font-size: var(--font-size-sm); color: var(--text-muted); }

.kop-ops { display: flex; flex-direction: column; gap: 8px; }
.kop-op {
  display: flex; gap: 12px;
  padding: 10px 12px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.kop-op:hover:not(.is-disabled) { border-color: var(--border-card); }
.kop-op.is-selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.04);
}
.kop-op.is-disabled {
  opacity: 0.4; cursor: not-allowed;
}

.kop-op-check {
  flex-shrink: 0;
  width: 18px; height: 18px;
  margin-top: 2px;
  border-radius: 3px;
  border: 1.5px solid var(--border-input);
  background: var(--bg-body);
  display: inline-flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.kop-op.is-selected .kop-op-check {
  background: var(--color-primary); border-color: var(--color-primary); color: var(--text-high);
}
.kop-op-check-icon { width: 12px; height: 12px; color: var(--text-high); }

.kop-op-body { flex: 1; min-width: 0; }
.kop-op-head {
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
}
.kop-op-head strong { color: var(--text-high); font-size: var(--font-size-md); }
.kop-badge {
  font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); padding: 2px 8px;
  border-radius: 9px; text-transform: uppercase; letter-spacing: 0.3px;
}
.badge--alta  { background: rgba(var(--color-safe-rgb), 0.18);   color: var(--color-safe); }
.badge--media { background: rgba(var(--color-care-rgb), 0.18);   color: var(--color-care); }
.badge--baixa { background: var(--bg-hover); color: var(--text-low); }

.kop-op-meta { font-size: var(--font-size-base); color: var(--text-low); margin-top: 4px; }

.kop-op-form {
  margin-top: 10px;
  padding: 10px;
  background: var(--bg-body);
  border-radius: var(--radius-sm);
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 8px;
}
.kop-op-form label {
  display: flex; flex-direction: column; gap: 3px;
  font-size: var(--font-size-xs); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.kop-op-form select,
.kop-op-form input {
  background: var(--bg-body); border: 1px solid var(--border-card); color: var(--text-high);
  padding: 5px 7px; border-radius: var(--radius-sm);
  font-size: var(--font-size-base); font-family: inherit; outline: none;
}
.kop-op-form select:focus,
.kop-op-form input:focus { border-color: var(--color-primary); }

.kop-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.kop-field {
  display: flex; flex-direction: column; gap: 4px;
  font-size: var(--font-size-sm); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.kop-field--full { grid-column: 1 / -1; }
.kop-field input,
.kop-field select,
.kop-field textarea {
  background: var(--bg-body); border: 1px solid var(--border-card); color: var(--text-high);
  padding: 7px 9px; border-radius: var(--radius-sm);
  font-size: var(--font-size-base); font-family: inherit; outline: none;
  resize: vertical;
}
.kop-field input:focus,
.kop-field select:focus,
.kop-field textarea:focus { border-color: var(--color-primary); }
.kop-readonly { opacity: 0.7; cursor: not-allowed; }
.kop-field-hint {
  font-size: var(--font-size-xs); color: var(--text-lowest); font-style: italic;
  text-transform: none; letter-spacing: 0;
}

.kop-footer {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; flex-wrap: wrap;
  padding: 14px 22px;
  border-top: 1px solid var(--border-row);
}
.kop-footer-total { display: flex; align-items: baseline; gap: 8px; }
.kop-total-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; }
.kop-total-val { font-size: 18px; color: var(--text-high); font-weight: var(--font-weight-bold); }

.kop-footer-actions { display: flex; gap: 8px; }
.kop-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--radius-md);
  font-family: inherit; font-size: var(--font-size-md); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast); border: none;
}
.kop-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.kop-btn--ghost {
  background: transparent; border: 1px solid var(--border-card); color: var(--text-medium);
}
.kop-btn--ghost:hover:not(:disabled) { background: var(--bg-toggle-active); color: var(--text-high); }
.kop-btn--primary {
  background: var(--color-primary); color: var(--text-high);
}
.kop-btn--primary:hover:not(:disabled) { background: var(--color-primary-dark); }
.kop-btn-icon { width: 14px; height: 14px; }

@media (max-width: 640px) {
  .kop-fields { grid-template-columns: 1fr; }
  .kop-op-form { grid-template-columns: 1fr; }
}
</style>
