<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  analiseEstruturada: { type: Object, default: null },
  analiseFallback: { type: String, default: '' }
})

// Ordem fixa dos campos padrao
const CAMPOS = [
  { key: 'cobertura_escopo',        titulo: 'Cobertura do escopo',       icon: 'target' },
  { key: 'profundidade_conteudo',   titulo: 'Profundidade do conteúdo',  icon: 'layers' },
  { key: 'clareza_visual_didatica', titulo: 'Clareza visual e didática', icon: 'eye' },
  { key: 'alinhamento_com_cliente', titulo: 'Alinhamento com o cliente', icon: 'users' }
]

const SENTIMENT_META = {
  positivo: { label: 'Positivo', icon: 'check-circle-2' },
  neutro:   { label: 'Neutro',   icon: 'minus-circle' },
  atencao:  { label: 'Atenção',  icon: 'alert-triangle' },
  negativo: { label: 'Negativo', icon: 'alert-octagon' }
}

function normalizeCampo(raw) {
  if (raw == null) return { texto: '', sentiment: 'neutro', flash: '' }
  if (typeof raw === 'string') return { texto: raw, sentiment: 'neutro', flash: '' }
  if (typeof raw === 'object') {
    const sent = String(raw.sentiment || 'neutro').toLowerCase()
    return {
      texto: String(raw.texto || '').trim(),
      sentiment: SENTIMENT_META[sent] ? sent : 'neutro',
      flash: String(raw.flash || '').trim()
    }
  }
  return { texto: String(raw), sentiment: 'neutro', flash: '' }
}

function renderIaText(raw) {
  if (raw == null) return ''
  let s = String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  s = s.replace(/^\s*---\s*$/gm, '<hr class="ia-hr">')
  s = s.replace(/^###\s+(.+)$/gm, '<h5 class="ia-h">$1</h5>')
  s = s.replace(/^##\s+(.+)$/gm, '<h4 class="ia-h">$1</h4>')
  s = s.replace(/^#\s+(.+)$/gm, '<h3 class="ia-h">$1</h3>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  s = s.replace(/^[ \t]*[-*]\s+(.+)$/gm, '<li>$1</li>')
  s = s.replace(/(?:<li>[^<]*<\/li>\s*)+/g, m => `<ul class="ia-ul">${m}</ul>`)
  s = s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => {
    if (/^<(ul|h\d|hr)/.test(p)) return p
    return `<p>${p.replace(/\n/g, '<br>')}</p>`
  }).join('')
  return s
}

function isVazio(v) {
  if (v == null) return true
  const s = String(v).trim()
  return s === '' || s.toLowerCase() === 'null'
}

const subcards = computed(() => {
  if (!props.analiseEstruturada) return []
  return CAMPOS
    .map(c => ({ ...c, ...normalizeCampo(props.analiseEstruturada[c.key]) }))
    .filter(c => !isVazio(c.texto) || !isVazio(c.flash))
})

const temEstruturado = computed(() => subcards.value.length > 0)
const temFallback = computed(() => !isVazio(props.analiseFallback))
const deveRenderizar = computed(() => temEstruturado.value || temFallback.value)

// DEFAULT: card aberto, subcards FECHADOS — usuario le o flash (1 linha) de cada
// e expande quando quiser detalhes. Respeita preferencia do usuario de nao ser
// bombardeado com wall-of-text ao abrir.
const cardAberto = ref(true)
const expandidos = ref(new Set())

function toggleCard() {
  cardAberto.value = !cardAberto.value
}

function toggleSub(key) {
  const next = new Set(expandidos.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandidos.value = next
}

// Evita toggle quando o usuario selecionou texto — preserva selecao ativa
function handleSubClick(key) {
  const sel = typeof window !== 'undefined' ? window.getSelection?.() : null
  if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return
  toggleSub(key)
}

function abrirTodos() {
  expandidos.value = new Set(subcards.value.map(c => c.key))
}

function fecharTodos() {
  expandidos.value = new Set()
}

function sentimentMeta(s) {
  return SENTIMENT_META[s] || SENTIMENT_META.neutro
}

const sentimentBreakdown = computed(() => {
  const acc = { positivo: 0, neutro: 0, atencao: 0, negativo: 0 }
  for (const c of subcards.value) {
    if (acc[c.sentiment] != null) acc[c.sentiment] += 1
  }
  return acc
})

function refreshIcons() {
  if (typeof window !== 'undefined' && window.lucide?.createIcons) {
    nextTick(() => window.lucide.createIcons())
  }
}

onMounted(refreshIcons)
watch([subcards, cardAberto, expandidos], refreshIcons, { deep: true })
</script>

<template>
  <div v-if="deveRenderizar" class="am-card">
    <div class="am-header">
      <div class="am-header-left">
        <i data-lucide="file-search" class="am-header-icon"></i>
        <h2 class="am-title">Análise dos Materiais</h2>
      </div>
      <div class="am-header-right">
        <div v-if="temEstruturado" class="am-breakdown">
          <span
            v-for="(n, sent) in sentimentBreakdown"
            :key="sent"
            class="am-breakdown-chip"
            :class="[`sent--${sent}`, { 'is-zero': n === 0 }]"
            :title="`${n} ${sentimentMeta(sent).label.toLowerCase()}`"
          >
            <i :data-lucide="sentimentMeta(sent).icon" class="am-breakdown-icon"></i>
            <strong>{{ n }}</strong>
          </span>
        </div>

        <button
          v-if="temEstruturado && cardAberto"
          type="button"
          class="am-util-btn"
          @click="abrirTodos"
          title="Expandir todos"
        >
          <i data-lucide="maximize-2"></i>
        </button>
        <button
          v-if="temEstruturado && cardAberto"
          type="button"
          class="am-util-btn"
          @click="fecharTodos"
          title="Recolher todos"
        >
          <i data-lucide="minimize-2"></i>
        </button>

        <button
          class="am-toggle"
          type="button"
          :aria-expanded="cardAberto"
          @click="toggleCard"
        >
          <i :data-lucide="cardAberto ? 'chevron-up' : 'chevron-down'"></i>
        </button>
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-show="cardAberto" class="am-body">
        <div v-if="temEstruturado" class="am-grid">
          <div
            v-for="campo in subcards"
            :key="campo.key"
            class="am-subcard"
            :class="[`sent--${campo.sentiment}`, { 'is-expanded': expandidos.has(campo.key) }]"
            role="button"
            tabindex="0"
            :aria-expanded="expandidos.has(campo.key)"
            @click="handleSubClick(campo.key)"
            @keydown.enter.prevent="toggleSub(campo.key)"
            @keydown.space.prevent="toggleSub(campo.key)"
          >
            <div class="am-subcard-head">
              <span class="am-subcard-head-left">
                <i :data-lucide="campo.icon" class="am-subcard-icon"></i>
                <span class="am-subcard-titulo">{{ campo.titulo }}</span>
              </span>
              <span class="am-subcard-head-right">
                <span class="am-sent-dot" :title="sentimentMeta(campo.sentiment).label"></span>
                <span class="am-sent-label">{{ sentimentMeta(campo.sentiment).label }}</span>
                <i :data-lucide="expandidos.has(campo.key) ? 'chevron-up' : 'chevron-down'" class="am-subcard-chevron"></i>
              </span>
            </div>

            <p v-if="campo.flash" class="am-subcard-flash">{{ campo.flash }}</p>

            <Transition name="slide-fade">
              <div
                v-show="expandidos.has(campo.key)"
                v-if="campo.texto"
                class="am-subcard-body ia-rich"
                v-html="renderIaText(campo.texto)"
              ></div>
            </Transition>
          </div>
        </div>

        <div v-else-if="temFallback" class="ia-rich am-fallback" v-html="renderIaText(analiseFallback)"></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.am-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.am-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--spacing-md);
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-row);
  flex-wrap: wrap;
}
.am-header-left { display: flex; align-items: center; gap: 10px; }
.am-header-icon { width: 16px; height: 16px; color: var(--color-primary); }
.am-title {
  margin: 0; font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold); color: var(--text-high); letter-spacing: 0.2px;
}

.am-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.am-breakdown { display: inline-flex; gap: 4px; }
.am-breakdown-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 999px;
  font-size: 11px; font-weight: var(--font-weight-bold);
  border: 1px solid transparent;
  transition: opacity var(--transition-fast);
  cursor: help;
}
.am-breakdown-chip.is-zero { opacity: 0.35; }
.am-breakdown-icon { width: 11px; height: 11px; }
.am-breakdown-chip.sent--positivo { background: rgba(var(--color-safe-rgb), 0.15); color: var(--color-safe); border-color: rgba(var(--color-safe-rgb), 0.3); }
.am-breakdown-chip.sent--neutro   { background: var(--bg-inner); color: var(--text-low); border-color: var(--border-row); }
.am-breakdown-chip.sent--atencao  { background: rgba(var(--color-care-rgb), 0.15); color: var(--color-care); border-color: rgba(var(--color-care-rgb), 0.3); }
.am-breakdown-chip.sent--negativo { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); border-color: rgba(var(--color-danger-rgb), 0.3); }

.am-util-btn, .am-toggle {
  background: transparent; border: 1px solid var(--border-input);
  color: var(--text-medium); border-radius: var(--radius-sm);
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: var(--transition-fast);
}
.am-util-btn:hover, .am-toggle:hover {
  background: var(--bg-hover); color: var(--text-high); border-color: var(--border-row);
}
.am-util-btn :deep(svg), .am-toggle :deep(svg) { width: 14px; height: 14px; }

.am-body { padding: 14px 16px 16px; }

.am-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (max-width: 768px) { .am-grid { grid-template-columns: 1fr; } }

.am-subcard {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.am-subcard:hover { background: rgba(255, 255, 255, 0.02); }
.am-subcard:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}
.am-subcard.is-expanded { cursor: default; }
.am-subcard.sent--positivo {
  border-left-color: var(--color-safe);
  background: linear-gradient(135deg, rgba(var(--color-safe-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.am-subcard.sent--neutro {
  border-left-color: var(--text-low);
}
.am-subcard.sent--atencao {
  border-left-color: var(--color-care);
  background: linear-gradient(135deg, rgba(var(--color-care-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.am-subcard.sent--negativo {
  border-left-color: var(--color-danger);
  background: linear-gradient(135deg, rgba(var(--color-danger-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.am-subcard.is-expanded { border-color: var(--border-input); }

.am-subcard-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%;
  padding: 10px 14px;
}
.am-subcard-head-left  { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.am-subcard-head-right { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }

.am-subcard-icon { width: 14px; height: 14px; color: var(--text-medium); flex-shrink: 0; }
.am-subcard-titulo {
  font-size: var(--font-size-xs);
  text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--text-high); font-weight: var(--font-weight-semibold);
}

.am-sent-dot {
  display: inline-block;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--text-low);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
}
.am-subcard.sent--positivo .am-sent-dot { background: var(--color-safe); }
.am-subcard.sent--atencao  .am-sent-dot { background: var(--color-care); }
.am-subcard.sent--negativo .am-sent-dot { background: var(--color-danger); }

.am-sent-label {
  font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--text-low); font-weight: var(--font-weight-semibold);
}
.am-subcard.sent--positivo .am-sent-label { color: var(--color-safe); }
.am-subcard.sent--atencao  .am-sent-label { color: var(--color-care); }
.am-subcard.sent--negativo .am-sent-label { color: var(--color-danger); }

.am-subcard-chevron { width: 14px; height: 14px; color: var(--text-low); }

.am-subcard-flash {
  margin: 0;
  padding: 0 14px 10px;
  color: var(--text-medium);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.am-subcard-body {
  padding: 0 14px 14px;
  font-size: var(--font-size-sm);
  border-top: 1px dashed var(--border-row);
  margin-top: 2px;
  padding-top: 12px;
}

.am-fallback {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-md);
  padding: 14px 16px;
}

.ia-rich { color: var(--text-medium); font-size: var(--font-size-base); line-height: 1.55; }
.ia-rich :deep(> *:first-child) { margin-top: 0 !important; }
.ia-rich :deep(> *:last-child) { margin-bottom: 0 !important; }
.ia-rich :deep(p) { margin: 0 0 10px; }
.ia-rich :deep(strong) { color: var(--text-high); font-weight: var(--font-weight-semibold); }
.ia-rich :deep(em) { font-style: italic; color: var(--text-medium); }
.ia-rich :deep(.ia-ul) { list-style: disc; padding-left: 18px; margin: 4px 0 10px; }
.ia-rich :deep(.ia-ul li) { margin-bottom: 2px; color: var(--text-medium); line-height: 1.5; }
.ia-rich :deep(.ia-hr) { border: none; border-top: 1px solid var(--border-row); margin: 14px 0; }
.ia-rich :deep(.ia-h) {
  color: var(--text-high); font-weight: var(--font-weight-semibold);
  margin: 10px 0 6px; font-size: var(--font-size-base);
}

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: opacity 0.2s ease, max-height 0.25s ease;
  overflow: hidden; max-height: 2000px;
}
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; max-height: 0; }
</style>
