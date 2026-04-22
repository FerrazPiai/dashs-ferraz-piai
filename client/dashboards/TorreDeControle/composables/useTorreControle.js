import { ref, shallowRef, computed } from 'vue'

const POLL_MS = 3000

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/tc${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Monta mensagem detalhada: inclui validation_errors do Kommo (se presente)
    // para o user ver exatamente que campo/enum a API rejeitou.
    let msg = body.error || `HTTP ${res.status}`
    if (Array.isArray(body.validation_errors) && body.validation_errors.length) {
      const lines = []
      for (const item of body.validation_errors) {
        const errs = Array.isArray(item.errors) ? item.errors : []
        for (const e of errs) lines.push(`${e.path || '?'}: ${e.detail || e.code || ''}`.trim())
      }
      if (lines.length) msg += ` — ${lines.join(' | ')}`
    }
    const err = new Error(msg)
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

// State SINGLETON — compartilhado entre index.vue, SuperPainel e outros consumidores.
// Era local a cada useTorreControle() antes, o que fazia a matriz do SuperPainel atualizar
// mas a do index nao, exigindo F5 depois de cada analise concluida.
const matriz = shallowRef({ clientes: [], fases: [] })
const painelGeral = shallowRef(null)
const loading = ref(false)
const error = ref(null)
const activeJobs = ref(new Map())

export function useTorreControle() {

  async function carregarMatriz() {
    loading.value = true; error.value = null
    try { matriz.value = await apiFetch('/matriz') }
    catch (err) { error.value = err.message }
    finally { loading.value = false }
  }

  async function carregarPainelGeral() {
    loading.value = true; error.value = null
    try { painelGeral.value = await apiFetch('/painel-geral') }
    catch (err) { error.value = err.message }
    finally { loading.value = false }
  }

  async function carregarDetalheFase(clienteId, faseId) {
    return apiFetch(`/cliente/${clienteId}/fase/${faseId}`)
  }

  async function analisar(projetoFaseId, leadId, fase) {
    const job = await apiFetch('/analisar', {
      method: 'POST',
      body: JSON.stringify({ projetoFaseId, leadId, fase })
    })
    if (job.jobId) pollJob(job.jobId)
    return job
  }

  // Relatorio final consolidado (para fase 'projeto-concluido')
  async function analisarFinal(projetoFaseId, leadId) {
    const job = await apiFetch('/analisar-final', {
      method: 'POST',
      body: JSON.stringify({ projetoFaseId, leadId })
    })
    if (job.jobId) pollJob(job.jobId)
    return job
  }

  async function analisarMassa(items) {
    const job = await apiFetch('/analisar-massa', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
    if (job.jobId) pollJob(job.jobId)
    return job
  }

  async function criarLeadKommo(payload) {
    return apiFetch('/kommo/lead', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  // Cria oportunidade no pipeline Expansao (multi-produto, sem etapa manual)
  async function criarOportunidadeKommo(payload) {
    return apiFetch('/kommo/oportunidade', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  // Catalogos Kommo (produtos/categorias/solucoes) — cache in-memory durante a sessao
  const catalogoKommo = shallowRef(null)
  async function carregarCatalogoKommo() {
    if (catalogoKommo.value) return catalogoKommo.value
    catalogoKommo.value = await apiFetch('/catalogo-kommo')
    return catalogoKommo.value
  }

  // Atualiza um custom field do lead no Kommo via API (editor de materiais)
  async function atualizarCustomFieldLead(leadId, fieldId, value) {
    return apiFetch(`/lead/${leadId}/custom-field`, {
      method: 'PATCH',
      body: JSON.stringify({ field_id: fieldId, value })
    })
  }

  // Metadata (type + enums) dos custom fields editaveis — cache in-memory
  const customFieldsMetadata = shallowRef(null)
  async function carregarCustomFieldsMetadata() {
    if (customFieldsMetadata.value) return customFieldsMetadata.value
    const res = await apiFetch('/custom-fields/metadata')
    customFieldsMetadata.value = res?.fields || {}
    return customFieldsMetadata.value
  }

  function pollJob(jobId, createdAt = null) {
    if (activeJobs.value.has(jobId)) return
    // Preserva created_at desde o inicio para o cronometro (TcJobProgress) usar
    activeJobs.value.set(jobId, {
      id: jobId,
      status: 'pending',
      progresso: {},
      created_at: createdAt
    })
    const tick = async () => {
      try {
        const job = await apiFetch(`/job/${jobId}`)
        activeJobs.value.set(jobId, {
          id: jobId,
          status: job.status,
          progresso: job.progresso || {},
          resultado: job.resultado,
          // Backend retorna created_at; mantem o que ja tinhamos como fallback
          created_at: job.created_at || createdAt || activeJobs.value.get(jobId)?.created_at || null
        })
        if (['completed', 'failed'].includes(job.status)) {
          if (job.status === 'completed') await carregarMatriz()
          setTimeout(() => activeJobs.value.delete(jobId), 5000)
          return
        }
        setTimeout(tick, POLL_MS)
      } catch {
        activeJobs.value.delete(jobId)
      }
    }
    tick()
  }

  const jobsEmAndamento = computed(() =>
    Array.from(activeJobs.value.values()).filter(j => !['completed', 'failed'].includes(j.status))
  )

  // ──────────────────────────────────────────────────────────
  // Sync Kommo (lock + polling)
  // ──────────────────────────────────────────────────────────

  const syncStatus = ref({
    ativo: false,
    ultima_sync_concluida: null,
    ultima_sync_erro: null,
    stats: null
  })
  let _syncPollTimer = null

  async function carregarStatusSync() {
    try {
      syncStatus.value = await apiFetch('/status-atualizacao')
    } catch { /* silencioso */ }
    return syncStatus.value
  }

  async function dispararAtualizacao(force = false) {
    try {
      const r = await apiFetch('/atualizar', {
        method: 'POST',
        body: JSON.stringify({ force })
      })
      // Comeca polling
      iniciarPollingSync()
      return r
    } catch (err) {
      throw err
    }
  }

  function iniciarPollingSync() {
    pararPollingSync()
    const tick = async () => {
      const s = await carregarStatusSync()
      if (s?.ativo) {
        _syncPollTimer = setTimeout(tick, 5000)
      } else {
        // Sync terminou — recarrega matriz
        await carregarMatriz()
      }
    }
    tick()
  }

  function pararPollingSync() {
    if (_syncPollTimer) {
      clearTimeout(_syncPollTimer)
      _syncPollTimer = null
    }
  }

  return {
    matriz, painelGeral, loading, error,
    activeJobs, jobsEmAndamento, pollJob,
    carregarMatriz, carregarPainelGeral, carregarDetalheFase,
    analisar, analisarFinal, analisarMassa,
    criarLeadKommo, criarOportunidadeKommo,
    catalogoKommo, carregarCatalogoKommo,
    atualizarCustomFieldLead,
    carregarCustomFieldsMetadata,
    customFieldsMetadata,
    syncStatus, carregarStatusSync, dispararAtualizacao, iniciarPollingSync, pararPollingSync
  }
}
