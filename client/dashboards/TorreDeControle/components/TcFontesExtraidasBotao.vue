<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const props = defineProps({
  faseSlug: { type: String, default: '' },
  extractionReport: { type: Object, default: null }
})

// Plataformas esperadas por fase — espelha o server/services/kommo-client.js PHASE_FIELDS.
const PHASE_EXPECTED = {
  'kickoff': ['slides', 'transcricao'],
  'fase-2':  ['slides', 'transcricao'],
  'fase-3':  ['slides', 'transcricao', 'figma', 'miro'],
  'fase-4':  ['slides', 'transcricao'],
  'fase-5':  ['slides', 'transcricao', 'figma', 'miro'],
  'projeto-concluido': ['slides', 'transcricao', 'figma', 'miro']
}

const LABELS = {
  slides: 'Google Slides',
  transcricao: 'Transcrição da reunião',
  figma: 'Figma',
  miro: 'Miro',
  reuniao: 'Gravação da reunião'
}

const ICONS = {
  slides: 'presentation',
  transcricao: 'mic',
  figma: 'figma',
  miro: 'layout',
  reuniao: 'video'
}

const aberto = ref(false)
const btnRef = ref(null)

const plataformas = computed(() => {
  const slug = props.faseSlug
  const esperadas = PHASE_EXPECTED[slug] || ['slides', 'transcricao']
  const success = new Set(props.extractionReport?.success || [])
  const failed = new Set((props.extractionReport?.failed || []).map(f => f.plataforma))
  return esperadas.map(p => ({
    plataforma: p,
    label: LABELS[p] || p,
    icon: ICONS[p] || 'file',
    status: success.has(p) ? 'ok' : failed.has(p) ? 'falha' : 'indef'
  }))
})

const temRelatorio = computed(() =>
  !!(props.extractionReport && (props.extractionReport.success?.length || props.extractionReport.failed?.length))
)

function toggle() {
  aberto.value = !aberto.value
  refreshIcons()
}

function fechar() {
  aberto.value = false
}

function handleClickOutside(e) {
  if (!aberto.value) return
  if (btnRef.value && !btnRef.value.contains(e.target)) fechar()
}

function handleEscape(e) {
  if (e.key === 'Escape' && aberto.value) fechar()
}

function refreshIcons() {
  nextTick(() => {
    if (typeof window !== 'undefined' && window.lucide?.createIcons) window.lucide.createIcons()
  })
}

onMounted(() => {
  refreshIcons()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})

watch(() => [props.faseSlug, props.extractionReport], refreshIcons, { deep: true })
</script>

<template>
  <div class="fontes-wrap" ref="btnRef">
    <button
      type="button"
      class="fontes-btn"
      :class="{ 'is-active': aberto }"
      :title="aberto ? 'Fechar' : 'Ver fontes de dados desta fase'"
      :aria-expanded="aberto"
      @click.stop="toggle"
    >
      <i data-lucide="database" class="fontes-btn-icon"></i>
      <span class="fontes-btn-label">Fontes</span>
    </button>

    <Transition name="pop">
      <div v-if="aberto" class="fontes-pop" role="dialog" @click.stop>
        <div class="fontes-pop-head">
          <i data-lucide="database" class="fontes-pop-icon"></i>
          <span>Fontes de dados desta fase</span>
        </div>
        <p class="fontes-pop-hint">
          {{ temRelatorio
            ? 'Materiais esperados e o que foi efetivamente lido na análise:'
            : 'Materiais que a IA tenta ler para esta fase:' }}
        </p>
        <ul class="fontes-list">
          <li v-for="p in plataformas" :key="p.plataforma" :class="`fontes-item fontes-item--${p.status}`">
            <i :data-lucide="p.icon" class="fontes-item-icon"></i>
            <span class="fontes-item-label">{{ p.label }}</span>
            <span v-if="temRelatorio" class="fontes-item-tag">
              <template v-if="p.status === 'ok'">
                <i data-lucide="check" class="fontes-tag-icon"></i>usado
              </template>
              <template v-else-if="p.status === 'falha'">
                <i data-lucide="x" class="fontes-tag-icon"></i>indisponível
              </template>
              <template v-else>
                <i data-lucide="minus" class="fontes-tag-icon"></i>não enviado
              </template>
            </span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fontes-wrap { position: relative; display: inline-block; }

.fontes-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid var(--border-card);
  color: var(--text-medium); padding: 5px 10px; border-radius: var(--radius-sm);
  font-family: inherit; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  cursor: pointer; transition: all var(--transition-fast);
  text-transform: uppercase; letter-spacing: 0.3px;
}
.fontes-btn:hover, .fontes-btn.is-active {
  background: var(--bg-hover);
  color: var(--text-high);
  border-color: var(--border-input);
}
.fontes-btn-icon { width: 13px; height: 13px; }
.fontes-btn-label { line-height: 1; }

.fontes-pop {
  position: absolute; top: calc(100% + 6px); right: 0;
  min-width: 280px; max-width: 340px;
  background: var(--bg-card);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  padding: 12px 14px;
  z-index: 1000;
  display: flex; flex-direction: column; gap: 8px;
}
.fontes-pop-head {
  display: flex; align-items: center; gap: 8px;
  color: var(--text-high); font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.fontes-pop-icon { width: 14px; height: 14px; color: var(--color-primary); }
.fontes-pop-hint {
  margin: 0; color: var(--text-low); font-size: var(--font-size-xs); line-height: 1.4;
}

.fontes-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.fontes-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px;
  background: var(--bg-inner);
  border: 1px solid var(--border-row);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}
.fontes-item-icon { width: 13px; height: 13px; color: var(--text-muted); flex-shrink: 0; }
.fontes-item-label { color: var(--text-medium); flex: 1; min-width: 0; }
.fontes-item-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: var(--font-weight-semibold);
  text-transform: uppercase; letter-spacing: 0.3px;
  padding: 2px 6px; border-radius: var(--radius-sm);
  white-space: nowrap;
}
.fontes-tag-icon { width: 10px; height: 10px; }

.fontes-item--ok { border-left: 2px solid var(--color-safe); }
.fontes-item--ok .fontes-item-tag { background: rgba(var(--color-safe-rgb), 0.15); color: var(--color-safe); }
.fontes-item--ok .fontes-item-icon { color: var(--color-safe); }

.fontes-item--falha { border-left: 2px solid var(--color-danger); }
.fontes-item--falha .fontes-item-tag { background: rgba(var(--color-danger-rgb), 0.15); color: var(--color-danger); }
.fontes-item--falha .fontes-item-icon { color: var(--color-danger); }

.fontes-item--indef { border-left: 2px solid var(--border-row); }
.fontes-item--indef .fontes-item-tag { background: var(--bg-body); color: var(--text-low); }

.pop-enter-active, .pop-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
