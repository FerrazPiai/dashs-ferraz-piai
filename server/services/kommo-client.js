// Kommo CRM client — leads, custom fields, notes. Pipeline Saber.
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const DEFAULT_BASE_URL = 'https://edisonv4companycom.kommo.com/api/v4'
// Validacao anti-SSRF: so aceita hostnames *.kommo.com via HTTPS.
// Evita que admin malconfigure KOMMO_BASE_URL apontando para metadata interna (169.254.169.254, etc).
function validateKommoBaseUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') throw new Error(`protocolo invalido: ${u.protocol}`)
    if (!/\.kommo\.com$/i.test(u.hostname)) throw new Error(`hostname nao termina em .kommo.com: ${u.hostname}`)
    return raw
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [kommo-client] KOMMO_BASE_URL invalida (${err.message}) — usando default`)
    return DEFAULT_BASE_URL
  }
}
const BASE_URL = validateKommoBaseUrl(process.env.KOMMO_BASE_URL || DEFAULT_BASE_URL)
const TOKEN = process.env.KOMMO_API_TOKEN
const PIPELINE_SABER = process.env.KOMMO_PIPELINE_SABER_ID || '12925780'

const limiter = createRateLimiter({
  type: 'sliding-window',
  maxPerSecond: parseInt(process.env.KOMMO_RATE_LIMIT_PER_SECOND || '3', 10)
})

// Custom fields mapeados por fase (Pipeline Saber — group leads_97701770758809)
// Extraimos somente: slides, transcricao, figma e miro. O campo "reuniao" (link da gravacao)
// foi removido do pipeline — a transcricao ja cobre o conteudo da reuniao.
const PHASE_FIELDS = {
  kickoff: { slides: 1990357, transcricao: 1990611 },
  'fase-2': { slides: 1990679, transcricao: 1990613 },
  'fase-3': { slides: 1990681, transcricao: 1990615, figma: 1990781, miro: 1990783 },
  'fase-4': { slides: 1990683, transcricao: 1990617 },
  'fase-5': { slides: 1990685, transcricao: 1990619, figma: 1990789, miro: 1990791 }
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

// Formata validation-errors do Kommo como string legivel: "field.path: detail (code)"
function formatKommoValidationErrors(body) {
  if (!body || typeof body !== 'object') return null
  const ve = body['validation-errors']
  if (!Array.isArray(ve) || !ve.length) return null
  const lines = []
  for (const item of ve) {
    const prefix = item.request_id ? `[${item.request_id}] ` : ''
    const errors = Array.isArray(item.errors) ? item.errors : []
    for (const e of errors) {
      const path = e.path || '?'
      const detail = e.detail || e.message || ''
      const code = e.code ? ` (${e.code})` : ''
      lines.push(`${prefix}${path}: ${detail}${code}`)
    }
  }
  return lines.length ? lines.join(' | ') : null
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
        // Tenta ler o body para extrair validation-errors do Kommo.
        // A API retorna JSON estruturado com path/detail/code dos campos invalidos —
        // sem isso o erro chega no frontend como "Kommo 400: Bad Request" (inutil pra debug).
        let body = null
        let rawText = ''
        try {
          rawText = await res.text()
          if (rawText) body = JSON.parse(rawText)
        } catch { /* body nao-JSON, mantem texto cru */ }

        const validationMsg = formatKommoValidationErrors(body)
        const titleMsg = body?.title || body?.detail || body?.message
        const apiMsg = validationMsg || titleMsg || rawText?.slice(0, 500) || res.statusText
        const err = new Error(`Kommo ${res.status}: ${apiMsg}`)
        err.status = res.status
        err.kommoBody = body || rawText || null
        err.kommoValidationErrors = body?.['validation-errors'] || null
        console.error(
          `[${new Date().toISOString()}] [kommo-client] ${options.method || 'GET'} ${path} -> ${res.status}: ${apiMsg}`
        )
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
// Aceita leadOrigemId para vincular a mesma empresa/contato que o lead origem tem.
export async function createLeadMultiProduto({ name, produtos = [], campos = {}, leadOrigemId = null }) {
  const custom_fields_values = []

  // Carrega metadata cedo: preciso pros slots de produto/categoria (enums DIFERENTES por slot)
  // e pros selects de contexto (oportunidade_mapeada, produto_origem).
  const meta = await getLeadsCustomFieldsMetadata().catch(err => {
    console.warn(`[${new Date().toISOString()}] [createLeadMultiProduto] metadata indisponivel: ${err.message}`)
    return {}
  })

  // Resolve enum_id por nome em um campo especifico. Cada slot (PRODUTO_1..4, CATEGORIA_1..4)
  // tem seu PROPRIO set de enum_ids no Kommo — mesmo nome, IDs diferentes. Reutilizar o ID do
  // slot 0 nos slots 1-3 causa 400 NotSupportedChoice. A unica chave estavel e o nome.
  const resolveEnumByName = (fieldId, nome) => {
    if (!nome) return null
    const fmeta = meta?.[fieldId]
    if (!fmeta || !Array.isArray(fmeta.enums)) return null
    const alvo = String(nome).trim().toLowerCase()
    const match = fmeta.enums.find(e => String(e.value).trim().toLowerCase() === alvo)
    return match?.id || null
  }

  // KOMMO_PRODUTOS/KOMMO_CATEGORIAS sao indexadas por id (do slot 0). Precisamos do NOME
  // para fazer cross-slot lookup via metadata.
  const nomeProdutoFromId = id => KOMMO_PRODUTOS.find(x => x.id === parseInt(id, 10))?.nome
  const nomeCategoriaFromId = id => KOMMO_CATEGORIAS.find(x => x.id === parseInt(id, 10))?.nome

  produtos.slice(0, 4).forEach((p, i) => {
    const slot = PRODUTO_SLOTS[i]
    if (p.produto_id) {
      const nome = nomeProdutoFromId(p.produto_id)
      const enumId = resolveEnumByName(slot.produto, nome)
      if (enumId) {
        custom_fields_values.push({ field_id: slot.produto, values: [{ enum_id: parseInt(enumId, 10) }] })
      } else {
        console.warn(
          `[${new Date().toISOString()}] [createLeadMultiProduto] produto "${nome || p.produto_id}" ` +
          `nao tem enum no slot ${i + 1} (field ${slot.produto}) — ignorando`
        )
      }
    }
    if (p.valor != null) {
      custom_fields_values.push({ field_id: slot.valor, values: [{ value: Number(p.valor) }] })
    }
    if (p.categoria_id) {
      const nome = nomeCategoriaFromId(p.categoria_id)
      const enumId = resolveEnumByName(slot.categoria, nome)
      if (enumId) {
        custom_fields_values.push({ field_id: slot.categoria, values: [{ enum_id: parseInt(enumId, 10) }] })
      } else {
        console.warn(
          `[${new Date().toISOString()}] [createLeadMultiProduto] categoria "${nome || p.categoria_id}" ` +
          `nao tem enum no slot ${i + 1} (field ${slot.categoria}) — ignorando`
        )
      }
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

  // Helper: resolve texto -> enum_id se o campo for SELECT/MULTISELECT,
  // caso contrario envia como value. Evita 400 NotSupportedChoice.
  const pushSmart = (fieldId, val) => {
    if (val == null || val === '') return
    const fmeta = meta?.[fieldId]
    if (fmeta && (fmeta.type === 'select' || fmeta.type === 'multiselect') && Array.isArray(fmeta.enums)) {
      const alvo = String(val).trim().toLowerCase()
      const match = fmeta.enums.find(e => String(e.value).trim().toLowerCase() === alvo)
        || fmeta.enums.find(e => String(e.id) === String(val))
      if (match?.id) {
        custom_fields_values.push({ field_id: fieldId, values: [{ enum_id: parseInt(match.id, 10) }] })
        return
      }
      // Campo SELECT mas valor nao bate nenhum enum — nao envia pra evitar 400.
      console.warn(`[${new Date().toISOString()}] [createLeadMultiProduto] valor "${val}" nao bate enum do campo ${fieldId} (${fmeta.name}) — ignorando`)
      return
    }
    custom_fields_values.push({ field_id: fieldId, values: [{ value: val }] })
  }

  pushIf(1989461, campos.tier, true)                // Tier (SELECT — enum_id ja resolvido no frontend)
  pushSmart(CUSTOM_FIELD_IDS.OPORTUNIDADE_MAPEADA, campos.oportunidade_mapeada) // pode ser SELECT ("Sim"/"Nao")
  pushIf(CUSTOM_FIELD_IDS.SOLUCAO, campos.solucao_id, true)
  pushIf(CUSTOM_FIELD_IDS.FLAG, campos.flag, true)  // Flag (SELECT — enum_id)
  pushIf(CUSTOM_FIELD_IDS.SQUAD, campos.squad, true)// Squad/Coordenador (SELECT — enum_id)
  pushIf(CUSTOM_FIELD_IDS.DORES, campos.dores)
  pushIf(CUSTOM_FIELD_IDS.COORDENADOR_EMAIL, campos.coordenador_email)
  pushIf(CUSTOM_FIELD_IDS.ACCOUNT, campos.account)

  // Produto Origem: sempre "Base" conforme convencao V4 — resolve via metadata.
  pushSmart(CUSTOM_FIELD_IDS.PRODUTO_ORIGEM, 'Base')

  const price = produtos.reduce((a, p) => a + (Number(p.valor) || 0), 0)

  // Busca company/contato do lead origem para vincular ao novo lead
  const linkedEntities = { companies: [], contacts: [] }
  let contatoPrincipalId = null
  if (leadOrigemId) {
    try {
      const origem = await kommoFetch(`/leads/${leadOrigemId}?with=contacts`)
      const mainCompanyId = origem?._embedded?.companies?.[0]?.id
      const mainContactObj = origem?._embedded?.contacts?.find(c => c.is_main)
        || origem?._embedded?.contacts?.[0]
      const mainContactId = mainContactObj?.id
      if (mainCompanyId) linkedEntities.companies.push({ id: mainCompanyId })
      // POST /api/v4/leads so aceita { id } em _embedded.contacts — is_main vai via PATCH depois.
      if (mainContactId) {
        linkedEntities.contacts.push({ id: mainContactId })
        contatoPrincipalId = mainContactId
      }
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] [createLeadMultiProduto] falha ao buscar vinculo do lead origem: ${err.message}`)
    }
  }

  const payload = {
    name,
    pipeline_id: PIPELINE_EXPANSAO,
    price,
    custom_fields_values
  }
  if (linkedEntities.companies.length || linkedEntities.contacts.length) {
    payload._embedded = {}
    if (linkedEntities.companies.length) payload._embedded.companies = linkedEntities.companies
    if (linkedEntities.contacts.length) payload._embedded.contacts = linkedEntities.contacts
  }

  // Log estruturado do payload — facilita debug cruzando com validation-errors do Kommo.
  console.log(
    `[${new Date().toISOString()}] [createLeadMultiProduto] POST /leads pipeline=${PIPELINE_EXPANSAO} ` +
    `price=${price} produtos=${produtos.length} cfv=${custom_fields_values.length} ` +
    `company=${linkedEntities.companies[0]?.id || 'none'} contact=${contatoPrincipalId || 'none'}`
  )

  const data = await kommoFetch('/leads', { method: 'POST', body: JSON.stringify([payload]) })
  const lead = data?._embedded?.leads?.[0]

  // PATCH pos-criacao para marcar contato como principal (is_main),
  // ja que o POST nao aceita is_main no _embedded.contacts.
  if (lead?.id && contatoPrincipalId) {
    try {
      await kommoFetch(`/leads/${lead.id}/link`, {
        method: 'PATCH',
        body: JSON.stringify([{
          to_entity_id: contatoPrincipalId,
          to_entity_type: 'contacts',
          metadata: { is_main: true }
        }])
      })
    } catch (err) {
      // Nao bloqueia — lead ja foi criado com sucesso, so nao marcou o contato como principal.
      console.warn(`[${new Date().toISOString()}] [createLeadMultiProduto] falha ao marcar contato principal do lead ${lead.id}: ${err.message}`)
    }
  }

  return lead
}

// === Metadata de custom fields (tipo + enums) com cache em memoria ===
let _fieldsMetadataCache = null
let _fieldsMetadataCacheAt = 0
const FIELDS_METADATA_TTL_MS = 10 * 60 * 1000 // 10 minutos

export async function getLeadsCustomFieldsMetadata(force = false) {
  const now = Date.now()
  if (!force && _fieldsMetadataCache && (now - _fieldsMetadataCacheAt) < FIELDS_METADATA_TTL_MS) {
    return _fieldsMetadataCache
  }
  // Kommo pagina em 50 por padrao; custom_fields de leads costuma caber em 1 pagina.
  const pages = []
  let page = 1
  while (page <= 10) {
    const data = await kommoFetch(`/leads/custom_fields?page=${page}&limit=250`)
    const items = data?._embedded?.custom_fields || []
    pages.push(...items)
    if (items.length < 250) break
    page++
  }
  const map = {}
  for (const f of pages) {
    map[f.id] = {
      id: f.id,
      name: f.name,
      type: f.type, // text | textarea | url | select | multiselect | numeric | ...
      enums: Array.isArray(f.enums)
        ? f.enums.map(e => ({ id: e.id, value: e.value }))
        : null
    }
  }
  _fieldsMetadataCache = map
  _fieldsMetadataCacheAt = now
  return map
}

// Atualiza um unico custom field de um lead no Kommo. Resolve enum_id para fields SELECT.
export async function updateLeadCustomField(leadId, fieldId, value) {
  const fid = parseInt(fieldId, 10)
  const texto = String(value ?? '')
  let values

  try {
    const meta = await getLeadsCustomFieldsMetadata()
    const field = meta[fid]
    if (field && (field.type === 'select' || field.type === 'multiselect') && Array.isArray(field.enums)) {
      if (!texto.trim()) {
        // Valor vazio limpa o campo
        values = []
      } else {
        const alvo = texto.trim().toLowerCase()
        const match = field.enums.find(e => String(e.value).trim().toLowerCase() === alvo)
        if (!match) {
          const err = new Error(`valor "${texto}" nao e uma opcao valida para o campo "${field.name}"`)
          err.status = 400
          err.validOptions = field.enums.map(e => e.value)
          throw err
        }
        values = [{ enum_id: match.id }]
      }
    } else {
      values = [{ value: texto }]
    }
  } catch (err) {
    if (err.status === 400) throw err
    // Se a metadata falhar (rede, auth), cai no comportamento antigo (text)
    console.warn(`[${new Date().toISOString()}] [kommo] metadata indisponivel — enviando como texto:`, err.message)
    values = [{ value: texto }]
  }

  const body = {
    custom_fields_values: [{ field_id: fid, values }]
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
  CLOSER: 1988407,
  INICIO_PROJETO: 1989757   // date — inicio do projeto (unix timestamp)
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
  1990685, 1990381, 1990619, 1990789, 1990791,  // Fase 5: +figma +miro
  // Contexto do cliente (textareas que alimentam o RAG)
  1989878,                              // Descricao da Empresa
  1989880,                              // Objetivo da Empresa
  1989898,                              // Dores do Negocio
  1989904,                              // Stack de Ferramentas
  1989914,                              // Participantes
  1989922,                              // Perfil DISC
  1989890,                              // Cenario do Marketing (SELECT)
  1989892,                              // Consciencia das Metricas (SELECT)
  // Dados principais do lead
  1990229,                              // Account (text)
  1990267,                              // Coordenador (text)
  1989938,                              // Squad (SELECT)
  1989461,                              // Tier (SELECT)
  1989972                               // Flag (SELECT)
])

export { PHASE_FIELDS, STAGE_IDS, STAGE_TO_FASE, STAGE_PRE_PROJETO, PIPELINE_SABER }
