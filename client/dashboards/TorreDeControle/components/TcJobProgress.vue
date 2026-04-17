<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  job: { type: Object, required: true }
})

// Inclui as keys historicas ('calling_openai') + as atuais ('calling_ia')
// para que jobs antigos em andamento continuem renderizando corretamente.
const STEPS = [
  { key: 'fetching_kommo',     label: 'Lendo Kommo',              hint: 'Buscando custom fields e links da fase' },
  { key: 'extracting_content', label: 'Extraindo materiais',      hint: 'Slides, gravacoes, transcricoes, Figma e Miro' },
  { key: 'building_rag',       label: 'Montando contexto',        hint: 'Composicao do contexto RAG em 4 camadas' },
  { key: 'calling_ia',         label: 'Analisando com IA',        hint: 'Modelo configurado avaliando materiais' },
  { key: 'calling_openai',     label: 'Analisando com IA',        hint: 'Modelo configurado avaliando materiais', hidden: true },
  { key: 'persisting',         label: 'Salvando analise',         hint: 'Gravando no banco (versao nova)' },
  { key: 'embedding',          label: 'Indexando para busca',     hint: 'Embedding vetorial para RAG futuro' },
  { key: 'posting_note',       label: 'Atualizando CRM',          hint: 'Postando nota no Kommo' },
  { key: 'done',               label: 'Concluido',                hint: 'Analise disponivel na tela' }
]

const visibleSteps = STEPS.filter(s => !s.hidden)
const totalSteps = visibleSteps.length

// Alias de keys (jobs legados -> steps atuais)
const STEP_ALIAS = { calling_openai: 'calling_ia' }

const currentKey = computed(() => {
  const raw = props.job?.progresso?.step || ''
  return STEP_ALIAS[raw] || raw
})

const currentIdx = computed(() => {
  const idx = visibleSteps.findIndex(s => s.key === currentKey.value)
  return idx === -1 ? 0 : idx
})

const progressPct = computed(() => {
  if (props.job?.status === 'completed') return 100
  if (props.job?.status === 'failed') return 0
  return Math.round(((currentIdx.value + 0.5) / totalSteps) * 100)
})

function isActive(key) { return currentKey.value === key }
function isDone(key) {
  const idx = visibleSteps.findIndex(s => s.key === key)
  return currentIdx.value > idx || props.job?.status === 'completed'
}

// Cronometro leve — atualiza a cada segundo enquanto o job roda
const startedAt = ref(Date.now())
const now = ref(Date.now())
let tickTimer = null

const elapsedStr = computed(() => {
  const sec = Math.max(0, Math.floor((now.value - startedAt.value) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
})

onMounted(() => {
  if (props.job?.created_at) {
    const t = new Date(props.job.created_at).getTime()
    if (!isNaN(t)) startedAt.value = t
  }
  tickTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => { if (tickTimer) clearInterval(tickTimer) })

const headline = computed(() => {
  if (props.job?.status === 'failed') return 'Analise falhou'
  if (props.job?.status === 'completed') return 'Analise concluida'
  const step = visibleSteps.find(s => s.key === currentKey.value)
  return step?.label || 'Preparando analise'
})

const subhead = computed(() => {
  if (props.job?.status === 'failed') return props.job?.resultado?.error || 'Tente re-analisar'
  const step = visibleSteps.find(s => s.key === currentKey.value)
  return step?.hint || 'Aguarde enquanto a IA processa os materiais'
})
</script>

<template>
  <div class="tc-job-progress" :class="{ 'is-done': job?.status === 'completed', 'is-failed': job?.status === 'failed' }">
    <div class="jp-top">
      <div class="jp-indicator">
        <span v-if="job?.status === 'running' || job?.status === 'pending' || !job?.status" class="spinner spinner-lg"></span>
        <i v-else-if="job?.status === 'completed'" data-lucide="check-circle-2" class="jp-icon jp-icon--done"></i>
        <i v-else data-lucide="alert-circle" class="jp-icon jp-icon--fail"></i>
      </div>
      <div class="jp-heads">
        <div class="jp-headline">{{ headline }}</div>
        <div class="jp-subhead">{{ subhead }}</div>
      </div>
      <div class="jp-meta">
        <div class="jp-elapsed">{{ elapsedStr }}</div>
        <div class="jp-step-count">Passo {{ currentIdx + 1 }}/{{ totalSteps }}</div>
      </div>
    </div>

    <div class="jp-bar">
      <div class="jp-bar-fill" :style="{ width: progressPct + '%' }"></div>
    </div>

    <ol class="jp-steps">
      <li v-for="s in visibleSteps" :key="s.key"
          :class="{ active: isActive(s.key), done: isDone(s.key) }">
        <span class="jp-dot">
          <i v-if="isDone(s.key)" data-lucide="check" class="jp-check"></i>
          <span v-else-if="isActive(s.key)" class="jp-pulse"></span>
        </span>
        <span class="jp-label">{{ s.label }}</span>
      </li>
    </ol>

    <div v-if="job?.progresso?.ultimo_erro" class="jp-error">
      <i data-lucide="alert-triangle"></i>
      <span>{{ job.progresso.ultimo_erro }}</span>
    </div>
  </div>
</template>

<style scoped>
.tc-job-progress {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-inner) 100%);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
}
.tc-job-progress::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(600px circle at top left, rgba(255, 0, 0, 0.06), transparent 50%);
  pointer-events: none;
}
.tc-job-progress.is-done {
  border-color: rgba(74, 222, 128, 0.3);
}
.tc-job-progress.is-failed {
  border-color: rgba(255, 0, 0, 0.4);
}

.jp-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.jp-indicator {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-inner);
  display: flex;
  align-items: center;
  justify-content: center;
}
.jp-icon { width: 22px; height: 22px; }
.jp-icon--done { color: var(--color-safe, #4ade80); }
.jp-icon--fail { color: var(--color-danger, #ef4444); }

.jp-heads { flex: 1; min-width: 0; }
.jp-headline {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-high);
  line-height: 1.2;
  margin-bottom: 2px;
}
.jp-subhead {
  font-size: var(--font-size-sm);
  color: var(--text-low);
  line-height: 1.4;
}
.jp-meta {
  flex-shrink: 0;
  text-align: right;
}
.jp-elapsed {
  font-size: var(--font-size-sm);
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-semibold);
}
.jp-step-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.jp-bar {
  position: relative;
  height: 4px;
  background: var(--bg-inner);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: var(--spacing-md);
}
.jp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), #ff6b6b);
  border-radius: 999px;
  transition: width 0.6s ease;
}
.tc-job-progress.is-done .jp-bar-fill {
  background: var(--color-safe, #4ade80);
}
.tc-job-progress.is-failed .jp-bar-fill {
  background: var(--color-danger, #ef4444);
}

.jp-steps {
  position: relative;
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-xs) var(--spacing-md);
}
.jp-steps li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  transition: color 0.2s;
}
.jp-steps li.active { color: var(--text-high); font-weight: var(--font-weight-semibold); }
.jp-steps li.done { color: var(--color-safe, #4ade80); }

.jp-dot {
  position: relative;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--bg-inner);
  border: 1px solid var(--border-card);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.jp-steps li.active .jp-dot {
  border-color: var(--color-primary);
  background: rgba(255, 0, 0, 0.1);
}
.jp-steps li.done .jp-dot {
  background: var(--color-safe, #4ade80);
  border-color: var(--color-safe, #4ade80);
}
.jp-check { width: 10px; height: 10px; color: #000; }
.jp-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-primary);
  animation: jp-pulse 1.2s ease-in-out infinite;
}
@keyframes jp-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.jp-error {
  position: relative;
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: var(--color-danger, #ef4444);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.jp-error i { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
</style>
