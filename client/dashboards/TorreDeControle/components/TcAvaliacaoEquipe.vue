<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  avaliacao: { type: Object, default: () => ({}) }
})

const LABELS = {
  conducao_reuniao: 'Condução da reunião',
  escuta_ativa: 'Escuta ativa',
  profundidade_diagnostico: 'Profundidade do diagnóstico',
  clareza_proximos_passos: 'Clareza de próximos passos',
  postura_consultiva: 'Postura consultiva'
}

const ORDEM = [
  'conducao_reuniao', 'escuta_ativa', 'clareza_proximos_passos',
  'profundidade_diagnostico', 'postura_consultiva'
]
// Basico: as 3 dimensoes mais imediatas pra avaliar a execucao do time
const ORDEM_BASICO = ['conducao_reuniao', 'escuta_ativa', 'clareza_proximos_passos']

// Toggle de detalhamento
const nivelDetalhe = ref('basico')

const METODO = {
  email: 'identificado por email',
  nome_squad: 'identificado pelo nome do squad',
  inferencia_transcricao: 'inferido pela transcrição'
}

function normalizeDim(raw) {
  if (raw == null) return { valor: null, justificativa: '', confianca: null }
  if (typeof raw === 'number') {
    return { valor: isFinite(raw) ? raw : null, justificativa: '', confianca: null }
  }
  if (typeof raw === 'object') {
    return {
      valor: raw.valor != null && isFinite(Number(raw.valor)) ? Number(raw.valor) : null,
      justificativa: typeof raw.justificativa === 'string' ? raw.justificativa : '',
      confianca: raw.confianca != null && isFinite(Number(raw.confianca)) ? Number(raw.confianca) : null
    }
  }
  return { valor: null, justificativa: '', confianca: null }
}

const v4Nome = computed(() => props.avaliacao?.v4_identificado || null)
const v4Metodo = computed(() => props.avaliacao?.v4_metodo || null)
const clienteNome = computed(() => props.avaliacao?.cliente_identificado || null)
const confiancaGeral = computed(() => {
  const c = props.avaliacao?.confianca_geral
  return c != null && isFinite(Number(c)) ? Number(c) : null
})

const v4TagTitle = computed(() => {
  if (!v4Nome.value) return 'Preencha participantes no Kommo para identificação automática.'
  const parts = []
  if (v4Metodo.value && METODO[v4Metodo.value]) parts.push(METODO[v4Metodo.value])
  if (clienteNome.value) parts.push(`Cliente: ${clienteNome.value}`)
  return parts.length ? parts.join(' · ') : v4Nome.value
})

const dimensoesTodas = computed(() => {
  const scores = props.avaliacao?.scores || {}
  return ORDEM
    .filter(key => key in scores)
    .map(key => ({ key, label: LABELS[key] || key, ...normalizeDim(scores[key]) }))
})

const dimensoes = computed(() => {
  if (nivelDetalhe.value === 'avancado') return dimensoesTodas.value
  return dimensoesTodas.value.filter(d => ORDEM_BASICO.includes(d.key))
})

const dimensoesExtras = computed(() => {
  if (nivelDetalhe.value === 'avancado') return 0
  return dimensoesTodas.value.filter(d => !ORDEM_BASICO.includes(d.key)).length
})

const dimsComValor = computed(() => dimensoes.value.filter(d => d.valor != null))
const hasData = computed(() => dimensoesTodas.value.length > 0)

const mediaGeral = computed(() => {
  if (!dimsComValor.value.length) return null
  const soma = dimsComValor.value.reduce((acc, d) => acc + d.valor, 0)
  return soma / dimsComValor.value.length
})

const confiancaMedia = computed(() => {
  const comConfianca = dimensoes.value.filter(d => d.confianca != null)
  if (!comConfianca.length) return null
  const soma = comConfianca.reduce((acc, d) => acc + d.confianca, 0)
  return soma / comConfianca.length
})

const temConfianca = computed(() => dimensoes.value.some(d => d.confianca != null))

// Justificativas comecam todas FECHADAS — usuario expande o que interessar.
// Mesmo padrao da percepcao: scores visiveis, justificativas atras de 1 clique.
const abertos = ref(new Set())
function toggle(key) {
  const next = new Set(abertos.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  abertos.value = next
}

// Mini-parser de markdown — aceita **negrito** e *italico*
function renderMd(raw) {
  if (raw == null) return ''
  let s = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return s
}

// Escala: 9-10 verde, 7-8 amarelo, <=6 vermelho — alinhada com status_cor do backend
function colorClass(valor) {
  if (valor == null) return 'n-a'
  if (valor >= 9) return 'safe'
  if (valor >= 7) return 'care'
  return 'danger'
}
function confiancaClass(c) {
  if (c == null) return ''
  if (c >= 9) return 'conf-high'
  if (c >= 7) return 'conf-mid'
  return 'conf-low'
}
function fmtScore(v) { return v == null ? '—' : `${v.toFixed(1)}/10` }
function fmtMedia(v) { return v == null ? '—' : v.toFixed(1) }

function refreshIcons() {
  if (typeof window !== 'undefined' && window.lucide?.createIcons) {
    window.lucide.createIcons()
  }
}

onMounted(() => nextTick(refreshIcons))
watch(() => props.avaliacao, () => nextTick(refreshIcons), { deep: true })
watch([abertos, nivelDetalhe], () => nextTick(refreshIcons))
</script>

<template>
  <section class="avaliacao-card">
    <header class="card-header">
      <div class="title-wrap">
        <i data-lucide="users" class="inline-icon"></i>
        <h3 class="card-title">Avaliação da Equipe V4</h3>
        <label v-if="hasData" class="detalhe-select">
          <span class="detalhe-label">Detalhamento</span>
          <select v-model="nivelDetalhe" class="detalhe-input">
            <option value="basico">Básico</option>
            <option value="avancado">Avançado</option>
          </select>
        </label>
      </div>

      <div class="header-meta">
        <span
          v-if="v4Nome"
          class="v4-tag v4-tag--identified"
          :title="v4TagTitle"
        >
          <i data-lucide="user-check" class="inline-icon"></i>
          <span>{{ v4Nome }}</span>
        </span>
        <span
          v-else
          class="v4-tag v4-tag--unknown"
          title="Preencha participantes no Kommo para identificação automática."
        >
          <i data-lucide="user-x" class="inline-icon"></i>
          <span>sem identificação</span>
        </span>
      </div>
    </header>

    <div v-if="hasData" class="summary-pills">
      <span class="pill">
        <span class="pill-label">Média</span>
        <span class="pill-value" :class="colorClass(mediaGeral)">{{ fmtMedia(mediaGeral) }}</span>
      </span>
      <span v-if="temConfianca" class="pill">
        <span class="pill-label">Confiança média</span>
        <span class="pill-value" :class="confiancaClass(confiancaMedia)">{{ fmtMedia(confiancaMedia) }}</span>
      </span>
      <span class="pill">
        <span class="pill-label">Dimensões</span>
        <span class="pill-value neutral">{{ dimsComValor.length }}</span>
      </span>
    </div>

    <div v-if="!hasData" class="empty-state">
      <i data-lucide="info" class="inline-icon"></i>
      <span>Sem material suficiente para avaliar a equipe V4.</span>
    </div>

    <!-- Box inteira clicavel expande para modo avancado -->
    <button
      v-else-if="dimensoesExtras > 0"
      type="button"
      class="detalhe-hint"
      @click="nivelDetalhe = 'avancado'"
    >
      <i data-lucide="plus-circle" class="inline-icon"></i>
      <span>
        Mostrando as <strong>{{ dimensoes.length }}</strong> dimensões principais —
        <span class="detalhe-link">ver mais {{ dimensoesExtras }} dimensões</span>
      </span>
    </button>

    <div v-if="hasData" class="dims-grid">
      <div
        v-for="dim in dimensoes"
        :key="dim.key"
        class="dim-cell"
        :class="{ expanded: abertos.has(dim.key), disabled: dim.valor == null }"
      >
        <div class="dim-row">
          <div class="dim-info">
            <span class="dim-label">{{ dim.label }}</span>
            <span v-if="dim.confianca != null" class="conf-badge" :class="confiancaClass(dim.confianca)">
              Confiança: {{ dim.confianca.toFixed(0) }}/10
            </span>
          </div>
          <div class="dim-value" :class="colorClass(dim.valor)">
            {{ fmtScore(dim.valor) }}
          </div>
        </div>

        <!-- Toggle + justificativa. Estilo alinhado ao "Ver produtos" de Oportunidades. -->
        <template v-if="dim.justificativa">
          <button type="button" class="dim-toggle" @click="toggle(dim.key)">
            <i :data-lucide="abertos.has(dim.key) ? 'chevron-up' : 'chevron-down'" class="dim-toggle-icon"></i>
            <span>{{ abertos.has(dim.key) ? 'Ocultar justificativa' : 'Ver justificativa' }}</span>
          </button>
          <p v-show="abertos.has(dim.key)" class="dim-justificativa">
            <i data-lucide="quote" class="dim-just-icon"></i>
            <span class="dim-just-text" v-html="renderMd(dim.justificativa)"></span>
          </p>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Select "Detalhamento" ao lado do título — label e toda a caixa transferem click ao <select> */
.detalhe-select {
  display: inline-flex; align-items: center; gap: 6px;
  margin-left: 10px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-sm);
  padding: 2px 4px 2px 10px;
  cursor: pointer;
  user-select: none;
}
.detalhe-select:hover { border-color: var(--border-input); }
.detalhe-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--text-lowest); font-weight: var(--font-weight-semibold);
  pointer-events: none;
}
.detalhe-input {
  background: transparent; border: none; outline: none;
  color: var(--text-high); font-family: inherit;
  font-size: var(--font-size-sm); font-weight: var(--font-weight-medium);
  padding: 4px 6px; cursor: pointer;
}
.detalhe-input option { background: var(--bg-inner); color: var(--text-high); }

/* Hint: box INTEIRA clicavel expande para modo avancado.
   Children com pointer-events:none — click sempre atinge o botao, sem selecao de texto. */
.detalhe-hint {
  display: flex; align-items: center; gap: 6px;
  width: 100%;
  margin: 0;
  padding: 10px 14px;
  background: var(--bg-inner);
  border: 1px dashed var(--border-row);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.detalhe-hint > * { pointer-events: none; }
.detalhe-hint:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: var(--border-input);
}
.detalhe-hint:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.detalhe-hint .inline-icon { color: var(--text-low); }
.detalhe-hint strong { color: var(--text-high); font-weight: var(--font-weight-semibold); }
/* "ver mais X dimensoes" em branco negrito — destaque natural sem link underline */
.detalhe-link {
  color: var(--text-high);
  font-weight: var(--font-weight-bold);
}

.avaliacao-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-md); padding: var(--spacing-lg);
  display: flex; flex-direction: column; gap: var(--spacing-md);
}

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: var(--spacing-md); flex-wrap: wrap;
}

.title-wrap { display: flex; align-items: center; gap: var(--spacing-sm); color: var(--text-high); }
.card-title { margin: 0; font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--text-high); }
.header-meta { display: flex; align-items: center; gap: var(--spacing-xs); flex-wrap: wrap; }
.inline-icon { width: 16px; height: 16px; display: inline-block; stroke-width: 2; }

.v4-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  border: 1px solid transparent; cursor: default;
}
.v4-tag--identified {
  background: rgba(var(--color-safe-rgb), 0.12);
  color: var(--color-safe); border-color: rgba(var(--color-safe-rgb), 0.3);
}
.v4-tag--unknown {
  background: rgba(var(--color-care-rgb), 0.08);
  color: var(--color-care); border-color: rgba(var(--color-care-rgb), 0.25);
}

.conf-geral {
  font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  padding: 4px 10px; border-radius: var(--radius-sm);
  background: var(--bg-inner); border: 1px solid var(--border-row);
}
.conf-geral.conf-high { color: var(--color-safe); border-color: rgba(var(--color-safe-rgb), 0.3); }
.conf-geral.conf-mid  { color: var(--color-care); border-color: rgba(var(--color-care-rgb), 0.3); }
.conf-geral.conf-low  { color: var(--color-danger); border-color: rgba(var(--color-danger-rgb), 0.3); }

.summary-pills { display: flex; gap: var(--spacing-xs); flex-wrap: wrap; }
.pill {
  display: inline-flex; align-items: center; gap: var(--spacing-xs);
  background: var(--bg-inner); border: 1px solid var(--border-row);
  border-radius: var(--radius-sm); padding: 4px 10px; font-size: var(--font-size-xs);
}
.pill-label { color: var(--text-low); text-transform: uppercase; letter-spacing: 0.04em; font-weight: var(--font-weight-medium); }
.pill-value { font-weight: var(--font-weight-bold); color: var(--text-high); }
.pill-value.safe { color: var(--color-safe); }
.pill-value.care { color: var(--color-care); }
.pill-value.danger { color: var(--color-danger); }
.pill-value.neutral { color: var(--text-high); }

.empty-state {
  display: flex; align-items: center; gap: var(--spacing-sm);
  background: var(--bg-inner); border: 1px dashed var(--border-row);
  border-radius: var(--radius-sm); padding: var(--spacing-md);
  color: var(--text-medium); font-size: var(--font-size-sm);
}

.dims-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--spacing-sm); }
@media (max-width: 1100px) { .dims-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .dims-grid { grid-template-columns: 1fr; } }

.dim-cell {
  background: var(--bg-inner); border: 1px solid var(--border-row);
  border-radius: var(--radius-sm); padding: var(--spacing-sm) var(--spacing-md);
  display: flex; flex-direction: column; gap: 6px;
  transition: border-color var(--transition-fast);
}
.dim-cell.expanded { border-color: rgba(var(--color-primary-rgb), 0.4); }
.dim-cell.disabled { opacity: 0.55; }

.dim-row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-sm); }
.dim-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dim-label { color: var(--text-medium); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }

/* Confianca discreta — sem borda colorida, texto sutil; leitor foca no score principal */
.conf-badge {
  display: inline-block; font-size: 10px;
  font-weight: var(--font-weight-normal); letter-spacing: 0.02em;
  padding: 0; background: transparent; border: none;
  color: var(--text-lowest); width: fit-content;
  opacity: 0.8;
}
.conf-high, .conf-mid, .conf-low { color: var(--text-lowest); }

.dim-value { font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); line-height: 1; white-space: nowrap; }
.dim-value.safe { color: var(--color-safe); }
.dim-value.care { color: var(--color-care); }
.dim-value.danger { color: var(--color-danger); }
.dim-value.n-a { color: var(--text-lowest); }

.why-btn {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 4px;
  background: transparent; border: none; padding: 2px 0;
  color: var(--text-low); font-size: var(--font-size-xs);
  cursor: pointer; transition: color var(--transition-fast);
}
.why-btn:hover { color: var(--color-primary); }

/* Botao de toggle da justificativa — estilo alinhado ao "Ver produtos" de Oportunidades.
   Hitbox inteiro clicavel: filhos com pointer-events:none impedem seleção de texto. */
.dim-toggle {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid var(--border-card);
  color: var(--text-medium);
  padding: 5px 11px; margin-top: 4px;
  border-radius: var(--radius-sm);
  font-family: inherit; font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
}
.dim-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-high);
  border-color: var(--border-input);
}
.dim-toggle > * { pointer-events: none; }
.dim-toggle-icon { width: 12px; height: 12px; flex-shrink: 0; }

.dim-just-text {
  flex: 1; min-width: 0; color: var(--text-medium);
}
.dim-just-text :deep(strong) {
  color: var(--text-high); font-weight: var(--font-weight-semibold);
}
.dim-just-text :deep(em) {
  font-style: italic; color: var(--text-medium);
}

.dim-justificativa {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  background: var(--bg-body);
  border-left: 2px solid var(--color-primary);
  border-radius: var(--radius-sm);
  color: var(--text-medium);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}
.dim-just-icon {
  width: 12px; height: 12px;
  color: var(--color-primary);
  flex-shrink: 0;
  margin-top: 2px;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
