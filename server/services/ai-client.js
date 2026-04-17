// AI client abstrato — roteia analise/nota/coordenador para o provedor configurado
// pelo admin no DB (tc_ai_provider_config). Embedding permanece em openai-client.js
// porque os vetores ja persistidos em tc_embeddings foram gerados com text-embedding-3-small.
//
// Providers suportados: openai, openrouter.
// Ambos usam payload compativel com OpenAI chat/completions — so mudam base URL + auth.

import pool from '../lib/db.js'
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://dashboards.v4ferrazpiai.com.br'
const OPENROUTER_APP_TITLE = process.env.OPENROUTER_APP_TITLE || 'Torre de Controle V4'

const PROVIDER_ENDPOINTS = {
  openai:     { url: 'https://api.openai.com/v1/chat/completions',     keyVar: 'OPENAI_API_KEY' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',  keyVar: 'OPENROUTER_API_KEY' }
}

// Defaults por provider (sobrescritos pelo DB). Output < $1/1M tokens.
export const PROVIDER_DEFAULTS = {
  openai: {
    model_analysis: 'gpt-5.4-mini',
    model_note: 'gpt-5.4-nano',
    price_in_per_mtok: 0.75,
    price_out_per_mtok: 4.50
  },
  openrouter: {
    model_analysis: 'deepseek/deepseek-v3.2-exp',
    model_note: 'deepseek/deepseek-v3.2-exp',
    price_in_per_mtok: 0.27,
    price_out_per_mtok: 0.41
  }
}

// Cache de 60s para evitar N queries por job
const CACHE_TTL_MS = 60_000
let _configCache = null
let _configCacheTs = 0

export function invalidateProviderCache() {
  _configCache = null
  _configCacheTs = 0
}

export async function getActiveProviderConfig() {
  const now = Date.now()
  if (_configCache && (now - _configCacheTs) < CACHE_TTL_MS) return _configCache

  try {
    const { rows } = await pool.query(
      `SELECT provider, model_analysis, model_note, model_coordinator,
              price_in_per_mtok, price_out_per_mtok
       FROM tc_ai_provider_config WHERE id = 1`
    )
    if (rows[0]) {
      _configCache = rows[0]
      _configCacheTs = now
      return rows[0]
    }
  } catch (err) {
    console.warn(`[${new Date().toISOString()}] [ai-client] falha lendo config, usando defaults:`, err.message)
  }

  // Fallback: env ou defaults
  const provider = process.env.AI_PROVIDER || 'openai'
  const base = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.openai
  return {
    provider,
    model_analysis: process.env.AI_MODEL_ANALYSIS || base.model_analysis,
    model_note: process.env.AI_MODEL_NOTE || base.model_note,
    model_coordinator: process.env.AI_MODEL_COORDINATOR || null,
    price_in_per_mtok: base.price_in_per_mtok,
    price_out_per_mtok: base.price_out_per_mtok
  }
}

// Rate limiter por provider (evita thundering herd em picos)
const _limiters = {}
function limiterFor(provider) {
  if (!_limiters[provider]) {
    _limiters[provider] = createRateLimiter({
      type: 'concurrent-rpm',
      maxConcurrent: parseInt(process.env[`${provider.toUpperCase()}_MAX_CONCURRENT`] || '3', 10),
      maxRpm: parseInt(process.env[`${provider.toUpperCase()}_MAX_RPM`] || '60', 10)
    })
  }
  return _limiters[provider]
}

function getApiKey(provider) {
  if (provider === 'openai') return OPENAI_API_KEY
  if (provider === 'openrouter') return OPENROUTER_API_KEY
  return null
}

async function chatCompletion(provider, body) {
  const endpoint = PROVIDER_ENDPOINTS[provider]
  if (!endpoint) throw new Error(`Provider desconhecido: ${provider}`)

  const apiKey = getApiKey(provider)
  if (!apiKey) {
    const err = new Error(`${endpoint.keyVar} nao configurado`)
    err.status = 500
    throw err
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = OPENROUTER_SITE_URL
    headers['X-Title'] = OPENROUTER_APP_TITLE
  }

  const limiter = limiterFor(provider)
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000)
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const err = new Error(`${provider} ${res.status}: ${text.slice(0, 300)}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
  } finally {
    limiter.release()
  }
}

// Aproximacao tokens (pt-BR ~1.3 tokens/palavra) — usada para budget control
export function countTokens(text) {
  if (!text) return 0
  return Math.ceil(String(text).split(/\s+/).length * 1.3)
}

// ─────────────────────────────────────────────────────────────────────────────
// API publica — analise/nota/coordenador
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `Voce e um auditor de qualidade da V4 Company. Analise os materiais da fase do cliente e retorne JSON estruturado.

REGRA CRITICA — Avaliacao da completude do material:
Antes de pontuar, avalie se os materiais recebidos sao SUFICIENTES para uma auditoria justa:
- Se NAO ha conteudo real (apenas cabecalhos, links vazios, payloads sem texto util): retorne status_avaliacao = "incompleta", score = null, dores = [], oportunidades = [], riscos = []. NAO inferir gaps do cliente como problema dele — o problema e a falta de evidencia para auditar.
- Se ha conteudo PARCIAL (algum material util mas faltam pecas-chave): retorne status_avaliacao = "parcial", score = number 0-10 baseado APENAS no que foi recebido, e mencione na recomendacoes quais materiais faltam.
- Se materiais sao SUFICIENTES para auditoria: retorne status_avaliacao = "completa" e pontuacao normal.

JSON esperado:
- status_avaliacao ("completa" | "parcial" | "incompleta") — OBRIGATORIO
- score (number 0-10 ou NULL se incompleta)
- veredicto (string curta — para incompleta use algo como "Materiais insuficientes — coletar antes de auditar")
- resumo (texto executivo — para incompleta explique O QUE FALTA, sem inferir problemas do cliente)
- analise_materiais (texto detalhado — para incompleta liste objetivamente o que foi recebido vs esperado)
- percepcao_cliente (objeto com tom, engajamento, confianca — cada 0-10. Se incompleta, use null em todos)
- dores (array de {descricao, gravidade}). Para incompleta: array VAZIO. Nao listar "falta de dados" como dor do cliente.
- oportunidades (array de {titulo, descricao, valor_estimado: number ou null}). Para incompleta: array VAZIO.
- riscos (array de {descricao, tipo, probabilidade, impacto}). Para incompleta: array VAZIO. NAO contar "decisao com base em dados insuficientes" como risco.
- recomendacoes (array de {descricao, tipo, prioridade}). Para incompleta: liste o que coletar (ex: "Solicitar gravacao da reuniao de kickoff").

valor_estimado: NUMERO (ex: 50000) ou null — NUNCA texto como "alto" ou "medio".
Responda APENAS com JSON valido — sem markdown, sem comentarios.`

/**
 * Analise de fase — retorna JSON estruturado + metadados (provider/modelo/tokens).
 * opts.systemPrompt: override para casos especiais (ex: relatorio final).
 * opts.userPrompt:   quando systemPrompt e fornecido, usar como user message direto.
 */
export async function analyzeText(materialContent, ragContext, opts = {}) {
  const config = await getActiveProviderConfig()
  const model = config.model_analysis
  const systemPrompt = opts.systemPrompt || ANALYSIS_SYSTEM_PROMPT
  const userPrompt = opts.systemPrompt
    ? materialContent // final report ja envia o prompt completo como userPrompt
    : `## Materiais da Fase\n${materialContent}\n\n## Contexto RAG\n${JSON.stringify(ragContext)}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const content = data.choices?.[0]?.message?.content || '{}'
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (err) {
    const e = new Error(`IA retornou JSON invalido: ${err.message}. Primeiros 200 chars: ${content.slice(0, 200)}`)
    e.status = 502
    throw e
  }

  return {
    ...parsed,
    _provider: config.provider,
    _model: model,
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens
  }
}

/**
 * Gera nota curta (pt-BR) para o CRM Kommo. Usa model_note (mais barato).
 */
export async function generateNote(analysisData) {
  const config = await getActiveProviderConfig()
  const model = config.model_note || config.model_analysis
  const prompt = `Gere uma nota formatada para o CRM Kommo baseada nesta analise. Seja conciso, profissional, em portugues.
Inclua: score, resumo, principais dores (com gravidade) e recomendacoes prioritarias.
Maximo 800 caracteres.

${JSON.stringify(analysisData)}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  })
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Analise de colaborador (usada pelo cron semanal). Usa model_coordinator se definido,
 * senao model_analysis. Permite override via COLLAB_ANALYSIS_MODEL env (legado).
 */
export async function analyzeCollaborator(userData) {
  const config = await getActiveProviderConfig()
  const model = process.env.COLLAB_ANALYSIS_MODEL
    || config.model_coordinator
    || config.model_analysis
  const prompt = `Analise o desempenho deste colaborador e retorne JSON com:
- pontos_fortes (array de strings)
- pontos_atencao (array de strings)
- recomendacoes (array de strings)
- distribuicao (objeto com contagens por faixa de score ex: {"0-3": 2, "4-6": 5, "7-10": 3}).

Dados:
${JSON.stringify(userData)}`

  const data = await chatCompletion(config.provider, {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

/**
 * Pinga o provider com uma mensagem curta — usado pelo admin para validar API key/modelo.
 * Retorna { ok, latency_ms, model, provider } ou lanca erro.
 */
export async function pingProvider(provider, model) {
  const t0 = Date.now()
  const data = await chatCompletion(provider, {
    model,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 5,
    temperature: 0
  })
  return {
    ok: true,
    latency_ms: Date.now() - t0,
    provider,
    model,
    response: data.choices?.[0]?.message?.content?.slice(0, 50) || ''
  }
}
