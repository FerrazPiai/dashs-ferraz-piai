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

// Pipeline Expansao — destino fixo das oportunidades geradas pela Analise Consolidada
export const PIPELINE_EXPANSAO = 12184212

// Slots de produto Kommo (ate 4 por lead)
const PRODUTO_SLOTS = [
  { produto: 1989765, valor: 1989767, categoria: 1989793 },
  { produto: 1989769, valor: 1989771, categoria: 1989795 },
  { produto: 1989773, valor: 1989775, categoria: 1989797 },
  { produto: 1989777, valor: 1989779, categoria: 1989799 }
]

// Cria lead no pipeline Expansao com ate 4 produtos + campos de contexto.
// Nao envia status_id — Kommo coloca automaticamente na primeira etapa do pipeline.
export async function createLeadMultiProduto({ name, produtos = [], campos = {} }) {
  const custom_fields_values = []

  produtos.slice(0, 4).forEach((p, i) => {
    const slot = PRODUTO_SLOTS[i]
    if (p.produto_id) {
      custom_fields_values.push({ field_id: slot.produto, values: [{ enum_id: parseInt(p.produto_id, 10) }] })
    }
    if (p.valor != null) {
      custom_fields_values.push({ field_id: slot.valor, values: [{ value: Number(p.valor) }] })
    }
    if (p.categoria_id) {
      custom_fields_values.push({ field_id: slot.categoria, values: [{ enum_id: parseInt(p.categoria_id, 10) }] })
    }
  })

  const pushIf = (fieldId, val, isEnum = false) => {
    if (val == null || val === '') return
    if (isEnum) {
      custom_fields_values.push({ field_id: fieldId, values: [{ enum_id: parseInt(val, 10) }] })
    } else {
      custom_fields_values.push({ field_id: fieldId, values: [{ value: val }] })
    }
  }

  pushIf(1989461, campos.tier)                     // Tier (select — string value funciona)
  pushIf(CUSTOM_FIELD_IDS.OPORTUNIDADE_MAPEADA, campos.oportunidade_mapeada)
  pushIf(CUSTOM_FIELD_IDS.SOLUCAO, campos.solucao_id, true)
  pushIf(CUSTOM_FIELD_IDS.FLAG, campos.flag)
  pushIf(CUSTOM_FIELD_IDS.SQUAD, campos.squad)
  pushIf(CUSTOM_FIELD_IDS.DORES, campos.dores)
  pushIf(CUSTOM_FIELD_IDS.COORDENADOR_EMAIL, campos.coordenador_email)
  pushIf(CUSTOM_FIELD_IDS.ACCOUNT, campos.account)

  const price = produtos.reduce((a, p) => a + (Number(p.valor) || 0), 0)

  const body = [{
    name,
    pipeline_id: PIPELINE_EXPANSAO,
    price,
    custom_fields_values
  }]
  const data = await kommoFetch('/leads', { method: 'POST', body: JSON.stringify(body) })
  return data?._embedded?.leads?.[0]
}

// Atualiza um unico custom field de um lead no Kommo.
export async function updateLeadCustomField(leadId, fieldId, value) {
  const body = {
    custom_fields_values: [
      { field_id: parseInt(fieldId, 10), values: [{ value: value || '' }] }
    ]
  }
  return kommoFetch(`/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
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

// Catalogos Kommo — enums carregados de fields.json e hardcoded (mudam raramente).
// Usados pela IA para mapear oportunidades em produtos/categorias/solucoes reais.
export const KOMMO_PRODUTOS = [
  { id: 1460603, nome: 'Estruturação Comercial' },
  { id: 1459041, nome: 'Diagnóstico, planejamento e treinamento de CRM e Vendas' },
  { id: 1459043, nome: 'Diagnóstico e planejamento de CRM Marketing' },
  { id: 1459131, nome: 'Diagnóstico de Mídia Paga (Meta e Google Ads)' },
  { id: 1459133, nome: 'Diagnóstico e Planejamento de E-commerce' },
  { id: 1459135, nome: 'Diagnóstico e Planejamento de Redes Sociais' },
  { id: 1459039, nome: 'Diagnóstico e Planejamento de Marketing e Vendas no digital' },
  { id: 1459137, nome: 'Implementação E-commerce' },
  { id: 1459139, nome: 'Implementação de Landing Pages' },
  { id: 1459141, nome: 'Implementação de Gestão & Dados' },
  { id: 1459143, nome: 'Implementação de CRM Vendas' },
  { id: 1459145, nome: 'Implementação de CRM Marketing' },
  { id: 1459147, nome: 'Implementação de SDR-IA' },
  { id: 1459898, nome: 'Implementação de Site' },
  { id: 1459149, nome: 'Profissional de Google Ads' },
  { id: 1459151, nome: 'Profissional de Meta Ads' },
  { id: 1459153, nome: 'Profissional de Criativos (design)' },
  { id: 1459155, nome: 'Profissional de CRM Marketing' },
  { id: 1459283, nome: 'Profissional de Comunicação (Social Media/Copy)' },
  { id: 1459159, nome: 'Profissional de Business Intelligence' },
  { id: 1459902, nome: 'Profissional Social Media' },
  { id: 1459904, nome: 'Profissional de Copywriting' },
  { id: 1459900, nome: 'Gestão de Mídia Paga' },
  { id: 1459161, nome: 'V4Food' },
  { id: 1459163, nome: 'R.A.P' },
  { id: 1459165, nome: 'Mapa Estratégico' },
  { id: 1459167, nome: 'ROI system / V4.MKT' },
  { id: 1460075, nome: 'Catálogo' },
  { id: 1460081, nome: 'Marketplace' },
  { id: 1460105, nome: 'Branding' },
  { id: 1460279, nome: 'Growth Marketing Advisory' }
]

export const KOMMO_CATEGORIAS = [
  { id: 1459099, nome: 'Saber' },
  { id: 1459101, nome: 'Ter' },
  { id: 1459103, nome: 'Executar' },
  { id: 1459105, nome: 'Potencializar' }
]

export const KOMMO_SOLUCOES = [
  { id: 1459646, nome: 'Implementação CRM' },
  { id: 1459648, nome: 'Implementação Site' },
  { id: 1459650, nome: 'Identidade Visual' },
  { id: 1459652, nome: 'Google my Business' },
  { id: 1459654, nome: 'E-commerce' },
  { id: 1459656, nome: 'Gestão de Dados' },
  { id: 1459658, nome: 'Landing Page' },
  { id: 1459660, nome: 'V4 Food' },
  { id: 1459744, nome: 'Branding' },
  { id: 1459890, nome: 'Implementação de Site' },
  { id: 1459892, nome: 'Profissional de Mídia Paga' },
  { id: 1459894, nome: 'Social Media' },
  { id: 1459896, nome: 'Profissional de Copywriting' },
  { id: 1459682, nome: 'Profissional Gestão de Mídia Paga' },
  { id: 1459680, nome: 'Profissional CRM' },
  { id: 1459684, nome: 'Profissional de Social Media' },
  { id: 1459686, nome: 'Manutenção Kommo (CRM)' },
  { id: 1459688, nome: 'Profissional Designer Gráfico' },
  { id: 1460089, nome: 'Marketplace' },
  { id: 1459666, nome: 'Profissional Web Design' },
  { id: 1459668, nome: 'Profissional Redação Publicitária' },
  { id: 1459672, nome: 'Profissional Sales Enablement' },
  { id: 1459674, nome: 'Profissional BI' },
  { id: 1459678, nome: 'Profissional Pré-venda (SDR)' },
  { id: 1459662, nome: 'Manutenção e-commerce' },
  { id: 1459664, nome: 'Manutenção Landing Page' },
  { id: 1459670, nome: 'Manutenção site' },
  { id: 1459676, nome: 'Manutenção Hubspot' }
]

export function getKommoCatalogos() {
  return { produtos: KOMMO_PRODUTOS, categorias: KOMMO_CATEGORIAS, solucoes: KOMMO_SOLUCOES }
}

// Whitelist de custom fields editaveis via Hub (editor de materiais do lead).
// Cobre: pasta do cliente + kick-off + slides/reuniao/transcricao/figma/miro das 5 fases.
export const EDITABLE_MATERIAL_FIELD_IDS = new Set([
  1990387,                              // Link da Pasta do Cliente
  1990385,                              // Reuniao de Kick-off
  1990357, 1990611,                     // Fase 1: slides, transcricao (reuniao = 1990385 acima)
  1990679, 1990369, 1990613,            // Fase 2: slides, reuniao, transcricao
  1990681, 1990373, 1990615, 1990781, 1990783,  // Fase 3: +figma +miro
  1990683, 1990377, 1990617,            // Fase 4
  1990685, 1990381, 1990619, 1990789, 1990791   // Fase 5: +figma +miro
])

export { PHASE_FIELDS, STAGE_IDS, STAGE_TO_FASE, STAGE_PRE_PROJETO, PIPELINE_SABER }
