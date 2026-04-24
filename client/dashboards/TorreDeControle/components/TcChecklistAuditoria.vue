<script setup>
import { computed, onMounted, nextTick, ref, watch } from 'vue'

// Checklist de Auditoria — cruza a "Lista Esperada" da fase com o que foi realmente entregue.
// Quatro categorias: entregue (✓), ausente (✗), nao_aplicavel (⚪), extra (✨).
// Shape esperado: { entregue:[], ausente:[], nao_aplicavel:[], extra:[] }.
// Cada item pode ter: { topico, fontes, observacao, motivo, justificativa, descricao }.

const props = defineProps({
  checklist: { type: Object, default: null }
})

function normalizeList(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      if (!item) return null
      if (typeof item === 'string') return { topico: item }
      return item
    })
    .filter(Boolean)
}

const entregue      = computed(() => normalizeList(props.checklist?.entregue))
const ausente       = computed(() => normalizeList(props.checklist?.ausente))
const naoAplicavel  = computed(() => normalizeList(props.checklist?.nao_aplicavel))
const extra         = computed(() => normalizeList(props.checklist?.extra))

const total = computed(() =>
  entregue.value.length + ausente.value.length + naoAplicavel.value.length + extra.value.length
)

// Texto secundario que vem do item (fontes / motivo / justificativa / descricao / observacao).
function detalhe(item) {
  if (!item) return ''
  return item.fontes
      || item.motivo
      || item.justificativa
      || item.descricao
      || item.observacao
      || ''
}

function topico(item) {
  if (!item) return ''
  return item.topico || item.nome || item.titulo || String(item)
}

// Estado de retratil — card comeca aberto, usuario pode recolher
const aberto = ref(false)
function toggle() {
  aberto.value = !aberto.value
  nextTick(() => window.lucide && window.lucide.createIcons())
}

onMounted(() => nextTick(() => window.lucide && window.lucide.createIcons()))
watch(() => props.checklist, () => nextTick(() => window.lucide && window.lucide.createIcons()), { deep: true })
</script>

<template>
  <section class="ck-section" v-if="total > 0" :class="{ 'is-collapsed': !aberto }">
    <header class="ck-head ck-head--clickable" @click="toggle" role="button" :aria-expanded="aberto">
      <h2>
        <i data-lucide="clipboard-list" class="ck-head-icon"></i>
        Checklist de Auditoria
      </h2>
      <div class="ck-head-right">
        <span class="ck-hint">Cobertura da lista esperada da fase</span>
        <button type="button" class="ck-toggle" @click.stop="toggle" :aria-label="aberto ? 'Recolher' : 'Expandir'">
          <svg class="ck-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="aberto" points="6 9 12 15 18 9"/>
            <polyline v-else points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Pills de resumo ficam sempre visiveis — servem como visao rapida -->
    <div class="ck-summary">
      <span class="ck-pill ck-pill--ok">
        <i data-lucide="check" class="ck-pill-icon"></i>
        <strong class="ck-pill-num">{{ entregue.length }}</strong> entregue{{ entregue.length === 1 ? '' : 's' }}
      </span>
      <span class="ck-pill ck-pill--miss">
        <i data-lucide="x" class="ck-pill-icon"></i>
        <strong class="ck-pill-num">{{ ausente.length }}</strong> ausente{{ ausente.length === 1 ? '' : 's' }}
      </span>
      <span class="ck-pill ck-pill--na">
        <i data-lucide="minus-circle" class="ck-pill-icon"></i>
        <strong class="ck-pill-num">{{ naoAplicavel.length }}</strong> n/a
      </span>
      <span class="ck-pill ck-pill--extra">
        <i data-lucide="sparkles" class="ck-pill-icon"></i>
        <strong class="ck-pill-num">{{ extra.length }}</strong> extra{{ extra.length === 1 ? '' : 's' }}
      </span>
    </div>

    <!-- Corpo do checklist — um unico wrapper com transicao suave -->
    <Transition name="slide-fade">
      <div v-show="aberto" class="ck-body">
        <!-- Entregue -->
        <div v-if="entregue.length" class="ck-block ck-block--ok">
          <div class="ck-block-head">
            <i data-lucide="check-circle-2" class="ck-block-icon"></i>
            <span>O que foi feito (Entregue)</span>
            <span class="ck-count">{{ entregue.length }}</span>
          </div>
          <ul class="ck-list">
            <li v-for="(item, i) in entregue" :key="'ok-' + i">
              <span class="ck-marker ck-marker--ok">✓</span>
              <div class="ck-text">
                <p class="ck-topico">{{ topico(item) }}</p>
                <p v-if="detalhe(item)" class="ck-detalhe">{{ detalhe(item) }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Ausente -->
        <div v-if="ausente.length" class="ck-block ck-block--miss">
          <div class="ck-block-head">
            <i data-lucide="x-circle" class="ck-block-icon"></i>
            <span>O que ficou de fora (Ausente)</span>
            <span class="ck-count">{{ ausente.length }}</span>
          </div>
          <ul class="ck-list">
            <li v-for="(item, i) in ausente" :key="'miss-' + i">
              <span class="ck-marker ck-marker--miss">✗</span>
              <div class="ck-text">
                <p class="ck-topico">{{ topico(item) }}</p>
                <p v-if="detalhe(item)" class="ck-detalhe">{{ detalhe(item) }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Nao Aplicavel -->
        <div v-if="naoAplicavel.length" class="ck-block ck-block--na">
          <div class="ck-block-head">
            <i data-lucide="minus-circle" class="ck-block-icon"></i>
            <span>Não aplicável</span>
            <span class="ck-count">{{ naoAplicavel.length }}</span>
          </div>
          <ul class="ck-list">
            <li v-for="(item, i) in naoAplicavel" :key="'na-' + i">
              <span class="ck-marker ck-marker--na">−</span>
              <div class="ck-text">
                <p class="ck-topico">{{ topico(item) }}</p>
                <p v-if="detalhe(item)" class="ck-detalhe">{{ detalhe(item) }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Extra -->
        <div v-if="extra.length" class="ck-block ck-block--extra">
          <div class="ck-block-head">
            <i data-lucide="sparkles" class="ck-block-icon"></i>
            <span>O que foi feito a mais (Extra)</span>
            <span class="ck-count">{{ extra.length }}</span>
          </div>
          <ul class="ck-list">
            <li v-for="(item, i) in extra" :key="'extra-' + i">
              <span class="ck-marker ck-marker--extra">✨</span>
              <div class="ck-text">
                <p class="ck-topico">{{ topico(item) }}</p>
                <p v-if="detalhe(item)" class="ck-detalhe">{{ detalhe(item) }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.ck-section {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ck-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Transicao suave ao expandir/recolher o corpo do checklist */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 260ms ease;
  overflow: hidden;
  max-height: 4000px;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}

.ck-head {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px; flex-wrap: wrap;
}
.ck-head--clickable {
  cursor: pointer;
  user-select: none;
  transition: opacity 140ms;
}
.ck-head--clickable:hover { opacity: 0.85; }
.ck-head-right { display: flex; align-items: center; gap: 10px; }
.ck-head h2 {
  font-size: 15px; color: var(--text-high); margin: 0; font-weight: var(--font-weight-semibold);
  display: flex; align-items: center; gap: 8px;
}
.ck-head-icon { width: 16px; height: 16px; color: var(--text-muted); }
.ck-hint { font-size: var(--font-size-sm); color: var(--text-lowest); }
.ck-toggle {
  background: transparent;
  border: 1px solid var(--border-card);
  color: var(--text-medium);
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: all 140ms;
}
.ck-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--border-input);
  color: var(--text-high);
}
.ck-toggle .inline-icon { width: 14px; height: 14px; }

/* Numero destacado dentro do pill de resumo — branco forte */
.ck-pill-num {
  color: #fff;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  margin-right: 2px;
  font-variant-numeric: tabular-nums;
}

.ck-summary {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.ck-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  border: 1px solid transparent;
}
.ck-pill-icon { width: 12px; height: 12px; }
.ck-pill--ok    { background: rgba(var(--color-safe-rgb), 0.12);    color: var(--color-safe);    border-color: rgba(var(--color-safe-rgb), 0.25); }
.ck-pill--miss  { background: rgba(var(--color-danger-rgb), 0.12);  color: var(--color-danger);  border-color: rgba(var(--color-danger-rgb), 0.25); }
.ck-pill--na    { background: var(--bg-inner);                      color: var(--text-low);      border-color: var(--border-row); }
.ck-pill--extra { background: rgba(var(--color-care-rgb), 0.12);    color: var(--color-care);    border-color: rgba(var(--color-care-rgb), 0.25); }

.ck-block {
  background: var(--bg-inner);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  border-left: 3px solid transparent;
}
.ck-block--ok    { border-left-color: var(--color-safe);   background: rgba(var(--color-safe-rgb), 0.04); }
.ck-block--miss  { border-left-color: var(--color-danger); background: rgba(var(--color-danger-rgb), 0.04); }
.ck-block--na    { border-left-color: var(--border-input); }
.ck-block--extra { border-left-color: var(--color-care);   background: rgba(var(--color-care-rgb), 0.04); }

.ck-block-head {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--font-size-base); color: var(--text-medium);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase; letter-spacing: 0.4px;
  margin-bottom: 10px;
}
.ck-block-icon { width: 14px; height: 14px; }
.ck-block--ok    .ck-block-icon { color: var(--color-safe); }
.ck-block--miss  .ck-block-icon { color: var(--color-danger); }
.ck-block--na    .ck-block-icon { color: var(--text-low); }
.ck-block--extra .ck-block-icon { color: var(--color-care); }
.ck-count {
  margin-left: auto;
  color: #fff;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  font-variant-numeric: tabular-nums;
}

.ck-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
}
.ck-list li {
  display: flex; gap: 10px; align-items: flex-start;
}

.ck-marker {
  flex-shrink: 0;
  width: 22px; height: 22px;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; line-height: 1;
}
.ck-marker--ok    { background: rgba(var(--color-safe-rgb), 0.2);   color: var(--color-safe); }
.ck-marker--miss  { background: rgba(var(--color-danger-rgb), 0.2); color: var(--color-danger); }
.ck-marker--na    { background: var(--bg-card);                     color: var(--text-low); border: 1px solid var(--border-row); }
.ck-marker--extra { background: rgba(var(--color-care-rgb), 0.2);   color: var(--color-care); }

.ck-text { flex: 1; min-width: 0; }
.ck-topico {
  color: var(--text-medium);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  line-height: 1.45;
  margin: 0 0 2px 0;
}
.ck-detalhe {
  color: var(--text-lowest);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  margin: 0;
}
</style>
