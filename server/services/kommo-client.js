// Kommo CRM client — leads, custom fields, notes. Pipeline Saber.
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const BASE_URL = process.env.KOMMO_BASE_URL || 'https://edisonv4companycom.kommo.com/api/v4'
const TOKEN = process.env.KOMMO_API_TOKEN
const PIPELINE_SABER = process.env.KOMMO_PIPELINE_SABER_ID || '12925780'

const limiter = createRateLimiter({
  type: 'sliding-window',
  maxPerSecond: parseInt(process.env.KOMMO_RATE_LIMIT_PER_SECOND || '3', 10)
})

// Custom fields mapeados por fase (Pipeline Saber — group leads_97701770758809)
const PHASE_FIELDS = {
  kickoff: { slides: 1990357, reuniao: 1990385, transcricao: 1990611 },
  'fase-2': { slides: 1990679, reuniao: 1990369, transcricao: 1990613 },
  'fase-3': { slides: 1990681, reuniao: 1990373, transcricao: 1990615, figma: 1990781, miro: 1990783 },
  'fase-4': { slides: 1990683, reuniao: 1990377, transcricao: 1990617 },
  'fase-5': { slides: 1990685, reuniao: 1990381, transcricao: 1990619, figma: 1990789, miro: 1990791 }
}

const STAGE_IDS = {
  'kickoff-interno': 99670916,
  kickoff: 99670920,
  'fase-2': 99670924,
  'fase-3': 99671028,
  'fase-4': 99671032,
  'fase-5': 99671036,
  'projeto-concluido': 100273444
}

async function kommoFetch(path, options = {}) {
  if (!TOKEN) {
    const err = new Error('KOMMO_API_TOKEN nao configurado')
    err.status = 500
    throw err
  }
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) {
        const err = new Error(`Kommo ${res.status}: ${res.statusText}`)
        err.status = res.status
        throw err
      }
      if (res.status === 204) return null
      return res.json()
    })
  } finally {
    limiter.release()
  }
}

export async function getLeadCustomFields(leadId) {
  const data = await kommoFetch(`/leads/${leadId}?with=custom_fields_values`)
  return data?.custom_fields_values || []
}

export function extractPhaseLinks(customFields, phase) {
  const mapping = PHASE_FIELDS[phase]
  if (!mapping) return {}
  const links = {}
  for (const [key, fieldId] of Object.entries(mapping)) {
    const field = customFields.find(f => f.field_id === fieldId)
    const val = field?.values?.[0]?.value
    if (val) links[key] = val
  }
  return links
}

export async function getLeadsByPipeline(pipelineId = PIPELINE_SABER) {
  const data = await kommoFetch(`/leads?filter[pipeline_id]=${pipelineId}&limit=250`)
  return data?._embedded?.leads || []
}

export async function createLead(pipelineId, statusId, leadData) {
  const body = [{
    name: leadData.name,
    pipeline_id: parseInt(pipelineId, 10),
    status_id: parseInt(statusId, 10),
    price: leadData.valor || 0,
    responsible_user_id: leadData.responsavelId || undefined,
    custom_fields_values: leadData.customFields || []
  }]
  const data = await kommoFetch('/leads', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return data?._embedded?.leads?.[0]
}

export async function updateLeadNote(leadId, noteText) {
  const body = [{
    entity_id: parseInt(leadId, 10),
    note_type: 'common',
    params: { text: noteText }
  }]
  return kommoFetch(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

// Mapeamento stage_id -> fase slug (para alinhar com tc_fases_config do DB)
// "Kickoff Interno" (99670916) e considerado pre-projeto — nao exibido na matriz.
const STAGE_TO_FASE = {
  99670920: { ordem: 1, nome: 'Fase 1',            slug: 'kickoff' },
  99670924: { ordem: 2, nome: 'Fase 2',            slug: 'fase-2' },
  99671028: { ordem: 3, nome: 'Fase 3',            slug: 'fase-3' },
  99671032: { ordem: 4, nome: 'Fase 4',            slug: 'fase-4' },
  99671036: { ordem: 5, nome: 'Fase 5',            slug: 'fase-5' },
  100273444:{ ordem: 6, nome: 'Projeto Concluido', slug: 'projeto-concluido' }
}

// Mapeamento inverso: stage especial nao-exibido na matriz (fica "antes da fase 1")
const STAGE_PRE_PROJETO = new Set([99670916])

// IDs de custom fields chave do pipeline Saber (descobertos via discovery)
export const CUSTOM_FIELD_IDS = {
  ACCOUNT: 1990229,        // text — account responsavel
  SQUAD: 1989938,          // select — squad
  COORDENADOR: 1990267,    // text — coordenador
  COORDENADOR_EMAIL: 1990181,
  DORES: 1989932,          // text — dores do negocio
  CANAL_ORIGEM: 1989435,
  PRODUTO_ORIGEM: 1990231,
  CATEGORIA_PRODUTO: 1989793,
  OPORTUNIDADE_MAPEADA: 1989954,
  FLAG: 1989972,
  PRODUTO_1: 1989765,
  SOLUCAO: 1989934,
  CLOSER: 1988407
}

// Extrai o valor de um custom field pelo id
export function getCustomFieldValue(customFields, fieldId) {
  const f = customFields.find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value ?? null
}

// Lista completa de leads do pipeline Saber com custom fields + companies
export async function getLeadsSaberCompleto({ limit = 250 } = {}) {
  const out = []
  let page = 1
  while (true) {
    const data = await kommoFetch(
      `/leads?filter[pipeline_id]=${PIPELINE_SABER}&with=custom_fields_values,contacts&limit=${limit}&page=${page}`
    )
    const leads = data?._embedded?.leads || []
    out.push(...leads)
    if (leads.length < limit) break
    page++
    if (page > 20) break
  }
  return out
}

// Busca companies em batch pelos IDs
export async function getCompaniesByIds(ids) {
  if (!ids.length) return []
  const chunks = []
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50))
  const out = []
  for (const chunk of chunks) {
    const qs = chunk.map(id => `filter[id][]=${id}`).join('&')
    try {
      const data = await kommoFetch(`/companies?${qs}&limit=50`)
      out.push(...(data?._embedded?.companies || []))
    } catch { /* nao bloqueia */ }
  }
  return out
}

// Lista accounts/usuarios do Kommo (responsaveis)
export async function getKommoUsers() {
  const data = await kommoFetch('/users?limit=250')
  return data?._embedded?.users || []
}

// Lista completa de custom fields dos leads (discovery)
export async function getLeadCustomFieldsSchema() {
  const out = []
  let page = 1
  while (true) {
    const data = await kommoFetch(`/leads/custom_fields?limit=50&page=${page}`)
    const fields = data?._embedded?.custom_fields || []
    out.push(...fields)
    if (fields.length < 50) break
    page++
    if (page > 10) break
  }
  return out
}

// Extrai um custom field pelo nome (case insensitive, busca parcial)
export function findFieldByName(customFields, nameSubstring) {
  const target = String(nameSubstring).toLowerCase()
  return customFields.find(f =>
    String(f.field_name || f.name || '').toLowerCase().includes(target)
  )
}

export { PHASE_FIELDS, STAGE_IDS, STAGE_TO_FASE, STAGE_PRE_PROJETO, PIPELINE_SABER }
