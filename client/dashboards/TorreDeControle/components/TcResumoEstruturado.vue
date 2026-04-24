<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  resumoEstruturado: { type: Object, default: null },
  resumoFallback: { type: String, default: '' },
  veredicto: { type: String, default: '' }
})

// Ordem fixa dos campos padrao (nunca muda — visao consistente entre analises)
const CAMPOS = [
  { key: 'momento_cliente',        titulo: 'Momento do cliente',          icon: 'gauge' },
  { key: 'dinamica_v4_cliente',    titulo: 'Dinâmica entre V4 e cliente', icon: 'handshake' },
  { key: 'qualidade_entregas_v4',  titulo: 'Qualidade das entregas V4',   icon: 'package-check' },
  { key: 'sinais_satisfacao',      titulo: 'Sinais de satisfação',        icon: 'thumbs-up' },
  { key: 'pontos_atencao_relacao', titulo: 'Pontos de atenção',           icon: 'alert-triangle' }
]

// Labels humanizados para o indicador de sentiment
const SENTIMENT_META = {
  positivo: { label: 'Positivo', icon: 'check-circle-2', color: 'var(--color-safe)', rgb: 'var(--color-safe-rgb)' },
  neutro:   { label: 'Neutro',   icon: 'minus-circle',   color: 'var(--text-low)',   rgb: null },
  atencao:  { label: 'Atenção',  icon: 'alert-triangle', color: 'var(--color-care)', rgb: 'var(--color-care-rgb)' },
  negativo: { label: 'Negativo', icon: 'alert-octagon',  color: 'var(--color-danger)', rgb: 'var(--color-danger-rgb)' }
}

// Aceita string ou { texto, sentiment, flash } — normaliza para shape unico
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

// Lista dos subcampos ja normalizados — cada um sabe se tem flash/texto/sentiment
const subcards = computed(() => {
  if (!props.resumoEstruturado) return []
  return CAMPOS
    .map(c => ({ ...c, ...normalizeCampo(props.resumoEstruturado[c.key]) }))
    .filter(c => !isVazio(c.texto) || !isVazio(c.flash))
})

const temEstruturado = computed(() => subcards.value.length > 0)
const temFallback = computed(() => !isVazio(props.resumoFallback))
const deveRenderizar = computed(() => temEstruturado.value || temFallback.value)

// Estado: card inteiro retrativo + cada subcard individual.
// DEFAULT: card aberto, subcards FECHADOS — usuario le o flash (1 linha) de cada
// subcard e decide qual expandir. Evita wall-of-text e respeita preferencia do usuario.
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

// Evita toggle quando o usuario selecionou texto dentro do subcard.
// Checa se ha range selecionado nao-colapsado — se sim, e uma selecao real; preserva ela.
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

// Breakdown de sentimentos — pills do header para leitura ultra-rapida
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
  <div v-if="deveRenderizar" class="rs-card">
    <div class="rs-header">
      <div class="rs-header-left">
        <i data-lucide="file-text" class="rs-header-icon"></i>
        <h2 class="rs-title">Resumo Executivo</h2>
      </div>
      <div class="rs-header-right">
        <!-- Breakdown de sentimentos: leitura instantanea sem abrir nada -->
        <div v-if="temEstruturado" class="rs-breakdown">
          <span
            v-for="(n, sent) in sentimentBreakdown"
            :key="sent"
            class="rs-breakdown-chip"
            :class="[`sent--${sent}`, { 'is-zero': n === 0 }]"
            :title="`${n} ${sentimentMeta(sent).label.toLowerCase()}`"
          >
            <i :data-lucide="sentimentMeta(sent).icon" class="rs-breakdown-icon"></i>
            <strong>{{ n }}</strong>
          </span>
        </div>

        <span v-if="veredicto" class="rs-badge">{{ veredicto }}</span>

        <button
          v-if="temEstruturado && cardAberto"
          type="button"
          class="rs-util-btn"
          @click="abrirTodos"
          title="Expandir todos os blocos"
        >
          <i data-lucide="maximize-2"></i>
        </button>
        <button
          v-if="temEstruturado && cardAberto"
          type="button"
          class="rs-util-btn"
          @click="fecharTodos"
          title="Recolher todos"
        >
          <i data-lucide="minimize-2"></i>
        </button>

        <button
          class="rs-toggle"
          type="button"
          :aria-expanded="cardAberto"
          @click="toggleCard"
        >
          <i :data-lucide="cardAberto ? 'chevron-up' : 'chevron-down'"></i>
        </button>
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-show="cardAberto" class="rs-body">
        <div v-if="temEstruturado" class="rs-grid">
          <div
            v-for="campo in subcards"
            :key="campo.key"
            class="rs-subcard"
            :class="[`sent--${campo.sentiment}`, { 'is-expanded': expandidos.has(campo.key) }]"
            role="button"
            tabindex="0"
            :aria-expanded="expandidos.has(campo.key)"
            @click="handleSubClick(campo.key)"
            @keydown.enter.prevent="toggleSub(campo.key)"
            @keydown.space.prevent="toggleSub(campo.key)"
          >
            <div class="rs-subcard-head">
              <span class="rs-subcard-head-left">
                <i :data-lucide="campo.icon" class="rs-subcard-icon"></i>
                <span class="rs-subcard-titulo">{{ campo.titulo }}</span>
              </span>
              <span class="rs-subcard-head-right">
                <span class="rs-sent-dot" :title="sentimentMeta(campo.sentiment).label"></span>
                <span class="rs-sent-label">{{ sentimentMeta(campo.sentiment).label }}</span>
                <i :data-lucide="expandidos.has(campo.key) ? 'chevron-up' : 'chevron-down'" class="rs-subcard-chevron"></i>
              </span>
            </div>

            <!-- Flash: sempre visivel — 1 linha de leitura imediata. Clicavel (herda). -->
            <p v-if="campo.flash" class="rs-subcard-flash">{{ campo.flash }}</p>

            <!-- Texto detalhado: clicar no corpo tambem retrai (handleSubClick preserva
                 selecao de texto via window.getSelection) -->
            <Transition name="slide-fade">
              <div
                v-show="expandidos.has(campo.key)"
                v-if="campo.texto"
                class="rs-subcard-body ia-rich"
                v-html="renderIaText(campo.texto)"
              ></div>
            </Transition>
          </div>
        </div>

        <div v-else-if="temFallback" class="ia-rich rs-fallback" v-html="renderIaText(resumoFallback)"></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.rs-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rs-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--spacing-md);
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-row);
  flex-wrap: wrap;
}
.rs-header-left { display: flex; align-items: center; gap: 10px; }
.rs-header-icon { width: 16px; height: 16px; color: var(--color-primary); }
.rs-title {
  margin: 0; font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold); color: var(--text-high); letter-spacing: 0.2px;
}

.rs-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Breakdown de sentimentos no header: chips mini */
.rs-breakdown { display: inline-flex; gap: 4px; }
.rs-breakdown-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 999px;
  font-size: 11px; font-weight: var(--font-weight-bold);
  border: 1px solid transparent;
  transition: opacity var(--transition-fast);
  cursor: help;
}
.rs-breakdown-chip.is-zero { opacity: 0.35; }
.rs-breakdown-icon { width: 11px; height: 11px; }
.rs-breakdown-chip.sent--positivo { background: rgba(var(--color-safe-rgb), 0.15); color: var(--color-safe); border-color: rgba(var(--color-safe-rgb), 0.3); }
.rs-breakdown-chip.sent--neutro   { background: var(--bg-inner); color: var(--text-low); border-color: var(--border-row); }
.rs-breakdown-chip.sent--atencao  { background: rgba(var(--color-care-rgb), 0.15); color: var(--color-care); border-color: rgba(var(--color-care-rgb), 0.3); }
.rs-breakdown-chip.sent--negativo { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); border-color: rgba(var(--color-danger-rgb), 0.3); }

/* Veredicto: cor neutra (roxo V4) — nao e alerta, e um resumo destacado */
.rs-badge {
  background: rgba(139, 92, 246, 0.12); color: #b79bff;
  border: 1px solid rgba(139, 92, 246, 0.35);
  padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold);
  text-transform: none; letter-spacing: 0.2px; white-space: normal;
  max-width: 380px; line-height: 1.35;
}

.rs-util-btn, .rs-toggle {
  background: transparent; border: 1px solid var(--border-input);
  color: var(--text-medium); border-radius: var(--radius-sm);
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: var(--transition-fast);
}
.rs-util-btn:hover, .rs-toggle:hover {
  background: var(--bg-hover); color: var(--text-high); border-color: var(--border-row);
}
.rs-util-btn :deep(svg), .rs-toggle :deep(svg) { width: 14px; height: 14px; }

.rs-body { padding: 14px 16px 16px; }

.rs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.rs-grid > .rs-subcard:nth-child(5) { grid-column: 1 / -1; }

@media (max-width: 768px) {
  .rs-grid { grid-template-columns: 1fr; }
  .rs-grid > .rs-subcard:nth-child(5) { grid-column: auto; }
}

/* Subcard: sentiment border-left colorida + fundo tingido sutil.
   Card inteiro e clicavel — cursor pointer reforca affordance. */
.rs-subcard {
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.rs-subcard:hover { background: rgba(255, 255, 255, 0.02); }
.rs-subcard:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}
.rs-subcard.is-expanded { cursor: default; }
.rs-subcard.sent--positivo {
  border-left-color: var(--color-safe);
  background: linear-gradient(135deg, rgba(var(--color-safe-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.rs-subcard.sent--neutro {
  border-left-color: var(--text-low);
}
.rs-subcard.sent--atencao {
  border-left-color: var(--color-care);
  background: linear-gradient(135deg, rgba(var(--color-care-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.rs-subcard.sent--negativo {
  border-left-color: var(--color-danger);
  background: linear-gradient(135deg, rgba(var(--color-danger-rgb), 0.06) 0%, var(--bg-inner) 40%);
}
.rs-subcard.is-expanded { border-color: var(--border-input); }

.rs-subcard-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%;
  padding: 10px 14px;
}
.rs-subcard-head-left  { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.rs-subcard-head-right { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }

.rs-subcard-icon { width: 14px; height: 14px; color: var(--text-medium); flex-shrink: 0; }
.rs-subcard-titulo {
  font-size: var(--font-size-xs);
  text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--text-high); font-weight: var(--font-weight-semibold);
}

/* Bolinha de sentiment — leitura imediata */
.rs-sent-dot {
  display: inline-block;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--text-low);
  box-shadow: 0 0 0 2px rgba(255,255,255,0.05);
}
.rs-subcard.sent--positivo .rs-sent-dot { background: var(--color-safe); }
.rs-subcard.sent--atencao  .rs-sent-dot { background: var(--color-care); }
.rs-subcard.sent--negativo .rs-sent-dot { background: var(--color-danger); }

.rs-sent-label {
  font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--text-low); font-weight: var(--font-weight-semibold);
}
.rs-subcard.sent--positivo .rs-sent-label { color: var(--color-safe); }
.rs-subcard.sent--atencao  .rs-sent-label { color: var(--color-care); }
.rs-subcard.sent--negativo .rs-sent-label { color: var(--color-danger); }

.rs-subcard-chevron { width: 14px; height: 14px; color: var(--text-low); }

.rs-subcard-flash {
  margin: 0;
  padding: 0 14px 10px;
  color: var(--text-medium);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.rs-subcard-body {
  padding: 0 14px 14px;
  font-size: var(--font-size-sm);
  border-top: 1px dashed var(--border-row);
  margin-top: 2px;
  padding-top: 12px;
}

.rs-fallback {
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
