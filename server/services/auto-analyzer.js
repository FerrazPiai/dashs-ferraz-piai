// server/services/auto-analyzer.js
//
// Escuta 'lead.stage_advanced' do event-bus e decide se enfileira analise
// automaticamente:
//   1) Busca custom_fields do lead (cache local)
//   2) Roda material-validator -> transcricao obrigatoria
//   3) Se canAnalyze=false -> emite 'analysis.skipped_no_transcription', NAO enfileira
//   4) Se canAnalyze=true -> chama getOrCreateProjetoFase + enqueueJob
//
// Nao envia mensagem ao Google Chat — isso e responsabilidade do alert-dispatcher.

import pool from '../lib/db.js'
import bus from './event-bus.js'
import { faseInfo } from './stage-detector.js'
import { validateMaterials } from './material-validator.js'
import { getOrCreateProjetoFase } from './tc-projeto-fase-helper.js'
import { enqueueJob } from './tc-job-worker.js'

async function fetchCustomFields(leadId) {
  const { rows } = await pool.query(
    `SELECT custom_fields FROM dashboards_hub.tc_kommo_leads WHERE id = $1`,
    [leadId]
  )
  if (!rows[0]) return null
  const cf = rows[0].custom_fields
  // DB pode armazenar como JSONB ou string — normalizar
  if (Array.isArray(cf)) return cf
  if (typeof cf === 'string') {
    try { return JSON.parse(cf) } catch { return [] }
  }
  return []
}

async function handleStageAdvanced(payload) {
  const { leadId, newStatusId, faseSlug } = payload
  if (!leadId || !faseSlug) return

  const fi = faseInfo(newStatusId)
  if (!fi) {
    console.warn(`[${new Date().toISOString()}] [auto-analyzer] fase desconhecida, skip: leadId=${leadId} statusId=${newStatusId}`)
    return
  }

  // 1. Busca custom_fields
  const customFields = await fetchCustomFields(leadId)
  if (customFields == null) {
    console.warn(`[${new Date().toISOString()}] [auto-analyzer] lead nao encontrado em tc_kommo_leads: ${leadId}`)
    return
  }

  // 2. Valida materiais
  const validation = validateMaterials({ customFields, faseSlug })
  console.log(`[${new Date().toISOString()}] [auto-analyzer] lead=${leadId} fase=${faseSlug} validation=`, validation)

  // 3. Sem transcricao -> emite skip e nao enfileira
  if (!validation.canAnalyze) {
    bus.emitSafe('analysis.skipped_no_transcription', {
      leadId,
      faseSlug,
      faseNome: fi.nome,
      missing: validation.missing,
      motivo: validation.reason
    })
    return
  }

  // 4. Enfileira analise. lockKey previne duplicatas concorrentes do mesmo (lead, fase).
  try {
    const projetoFaseId = await getOrCreateProjetoFase(leadId, fi.ordem)
    if (!projetoFaseId) {
      console.warn(`[${new Date().toISOString()}] [auto-analyzer] nao foi possivel obter projeto_fase (leadId=${leadId}, ordem=${fi.ordem})`)
      return
    }
    const lockKey = `auto-analyze:${leadId}:${faseSlug}`
    const job = await enqueueJob({
      tipo: 'analyze_phase',
      leadId,
      lockKey,
      payload: { projetoFaseId, leadId, fase: faseSlug, trigger: 'auto:stage_advanced' }
    })
    console.log(`[${new Date().toISOString()}] [auto-analyzer] enfileirado jobId=${job?.id} status=${job?.status} lead=${leadId} fase=${faseSlug}`)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [auto-analyzer] erro ao enfileirar: ${err.message}`)
  }
}

let _started = false

export function startAutoAnalyzer() {
  if (_started) return
  _started = true
  bus.on('lead.stage_advanced', (p) => {
    handleStageAdvanced(p).catch((e) =>
      console.error(`[${new Date().toISOString()}] [auto-analyzer] handler erro: ${e.message}`)
    )
  })
  console.log(`[${new Date().toISOString()}] [auto-analyzer] iniciado`)
}

export default { startAutoAnalyzer }
