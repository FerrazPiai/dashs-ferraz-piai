<template>
  <div class="share-banner">
    <div class="share-icon">
      <i data-lucide="share-2"></i>
    </div>

    <div class="share-content">
      <strong class="share-title">
        Compartilhamento necessario
        <span v-if="platform" class="share-platform">· {{ platformLabel }}</span>
      </strong>
      <p class="share-text">
        A conta da V4 ainda nao tem acesso ao arquivo. Compartilhe com os emails
        abaixo como <strong>Leitor</strong> para que a analise consiga extrair o conteudo.
      </p>

      <ul class="share-accounts">
        <li v-for="acc in accounts" :key="acc" class="share-chip">
          <i data-lucide="mail"></i>
          <code>{{ acc }}</code>
        </li>
      </ul>

      <p v-if="errorMsg" class="share-error">{{ errorMsg }}</p>
      <p v-if="copiedMsg" class="share-success">{{ copiedMsg }}</p>
    </div>

    <div class="share-actions">
      <button class="btn-sec" @click="copyEmails" :disabled="busyCopy">
        <i :data-lucide="copiedMsg ? 'check' : 'copy'"></i>
        {{ copiedMsg ? 'Copiado!' : 'Copiar emails' }}
      </button>
      <button v-if="url" class="btn-sec" @click="openArtifact">
        <i data-lucide="external-link"></i>
        Abrir {{ platformLabel }}
      </button>
      <button class="btn-pri" @click="retry" :disabled="busyRetry">
        <i v-if="busyRetry" data-lucide="loader-2" class="share-spin"></i>
        <i v-else data-lucide="refresh-cw"></i>
        {{ busyRetry ? 'Retentando...' : 'Ja compartilhei — retentar' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  analiseId: { type: [Number, String], required: true },
  accounts: { type: Array, default: () => [] },
  platform: { type: String, default: '' },
  url: { type: String, default: '' }
})
const emit = defineEmits(['retried'])

const busyCopy = ref(false)
const busyRetry = ref(false)
const errorMsg = ref(null)
const copiedMsg = ref(null)

const PLATFORM_LABELS = {
  transcricao: 'Google Docs',
  slides: 'Google Slides',
  reuniao: 'Google Drive',
  figma: 'Figma',
  miro: 'Miro'
}

const platformLabel = computed(() => PLATFORM_LABELS[props.platform] || 'arquivo')

async function copyEmails() {
  if (!props.accounts.length) return
  busyCopy.value = true
  errorMsg.value = null
  try {
    await navigator.clipboard.writeText(props.accounts.join(', '))
    copiedMsg.value = 'Emails copiados — cole no dialogo de compartilhamento.'
    setTimeout(() => { copiedMsg.value = null }, 4000)
  } catch (err) {
    errorMsg.value = 'Seu navegador bloqueou a copia automatica. Copie manualmente os emails acima.'
  } finally {
    busyCopy.value = false
    nextTick(() => window.lucide && window.lucide.createIcons())
  }
}

function openArtifact() {
  if (!props.url) return
  window.open(props.url, '_blank', 'noopener')
}

async function retry() {
  busyRetry.value = true
  errorMsg.value = null
  try {
    const res = await fetch(`/api/tc/analises/${props.analiseId}/retentar`, {
      method: 'POST',
      credentials: 'include'
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(body || `retentar ${res.status}`)
    }
    const data = await res.json().catch(() => ({}))
    emit('retried', data)
  } catch (err) {
    errorMsg.value = err.message || 'Falha ao retentar'
  } finally {
    busyRetry.value = false
    nextTick(() => window.lucide && window.lucide.createIcons())
  }
}

onMounted(() => {
  nextTick(() => window.lucide && window.lucide.createIcons())
})
</script>

<style scoped>
.share-banner {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px;
  background: #1a1a1a;
  border-left: 3px solid #eab308;
  border-radius: 4px;
  margin: 16px 0;
  font-family: 'Ubuntu', 'Segoe UI', sans-serif;
}
.share-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #eab308;
}
.share-icon :deep(svg) { width: 22px; height: 22px; }

.share-content { flex: 1; min-width: 0; }
.share-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}
.share-platform { color: #888; font-weight: 400; margin-left: 4px; }
.share-text {
  margin: 0 0 10px;
  font-size: 13px;
  color: #ccc;
  line-height: 1.5;
}
.share-accounts {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.share-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: #222;
  border-radius: 3px;
  font-size: 12px;
}
.share-chip :deep(svg) { width: 13px; height: 13px; color: #888; }
.share-chip code { color: #ccc; font-family: 'Courier New', monospace; }

.share-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: #ef4444;
}
.share-success {
  margin: 4px 0 0;
  font-size: 12px;
  color: #22c55e;
}

.share-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  min-width: 200px;
}
.btn-pri, .btn-sec {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-pri { background: #ff0000; color: #fff; }
.btn-pri:hover:not(:disabled) { background: #cc0000; }
.btn-pri:disabled { opacity: 0.6; cursor: wait; }
.btn-sec {
  background: transparent;
  color: #ccc;
  border: 1px solid #2a2a2a;
}
.btn-sec:hover:not(:disabled) {
  background: #141414;
  color: #fff;
}
.btn-sec:disabled { opacity: 0.6; cursor: wait; }
.btn-pri :deep(svg), .btn-sec :deep(svg) { width: 14px; height: 14px; }
.share-spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .share-banner { flex-direction: column; }
  .share-actions { width: 100%; flex-direction: row; }
  .share-actions .btn-pri, .share-actions .btn-sec { flex: 1; }
}
</style>
