// OpenAI client — analise, embeddings e notas.
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const API_KEY = process.env.OPENAI_API_KEY
const MODEL_ANALYSIS = process.env.OPENAI_MODEL_ANALYSIS || 'gpt-5.4-mini'
const MODEL_NOTE = process.env.OPENAI_MODEL_NOTE || 'gpt-5.4-nano'
const MODEL_EMBEDDING = process.env.OPENAI_MODEL_EMBEDDING || 'text-embedding-3-small'

const limiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.OPENAI_MAX_CONCURRENT || '3', 10),
  maxRpm: parseInt(process.env.OPENAI_MAX_RPM || '60', 10)
})

// Aproximacao: ~1.3 tokens por palavra para pt-BR. Suficiente para budget control.
export function countTokens(text) {
  if (!text) return 0
  return Math.ceil(String(text).split(/\s+/).length * 1.3)
}

async function openaiPost(path, body) {
  if (!API_KEY) {
    const err = new Error('OPENAI_API_KEY nao configurado')
    err.status = 500
    throw err
  }
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(`https://api.openai.com/v1${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000)
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const err = new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
  } finally {
    limiter.release()
  }
}

export async function analyzePhase(materialContent, ragContext, opts = {}) {
  // Permite override do systemPrompt para casos especiais (ex: relatorio final consolidado)
  const systemPrompt = opts.systemPrompt || `Voce e um auditor de qualidade da V4 Company. Analise os materiais da fase do cliente e retorne JSON estruturado.

REGRA CRITICA — Avaliacao da completude do material:
Antes de pontuar, avalie se os materiais recebidos sao SUFICIENTES para uma auditoria justa:
- Se NAO ha conteudo real (apenas cabecalhos, links vazios, payloads sem texto util): retorne status_avaliacao = "incompleta", score = null, dores = [], oportunidades = [], riscos = []. NAO inferir gaps do cliente como problema dele — o problema e a falta de evidencia para auditar.
- Se ha conteudo PARCIAL (algum material util mas faltam pecas-chave): retorne status_avaliacao = "parcial", score = number 0-10 baseado APENAS no que foi recebido, e mencione na recomendacoes quais materiais faltam.
- Se materiais sao SUFICIENTES para auditoria: retorne status_avaliacao = "completa" e pontuacao normal.

JSON esperado:
- status_avaliacao ("completa" | "parcial" | "incompleta") — OBRIGATORIO
- score (number 0-10 ou NULL se incompleta),
- veredicto (string curta — para incompleta use algo como "Materiais insuficientes — coletar antes de auditar"),
- resumo (texto executivo — para incompleta explique O QUE FALTA, sem inferir problemas do cliente),
- analise_materiais (texto detalhado — para incompleta liste objetivamente o que foi recebido vs esperado),
- percepcao_cliente (objeto com tom, engajamento, confianca — cada 0-10. Se incompleta, use null em todos),
- dores (array de {descricao, gravidade}). Para incompleta: array VAZIO. Nao listar "falta de dados" como dor do cliente.
- oportunidades (array de {titulo, descricao, valor_estimado: number ou null}). Para incompleta: array VAZIO.
- riscos (array de {descricao, tipo, probabilidade, impacto}). Para incompleta: array VAZIO. NAO contar "decisao com base em dados insuficientes" como risco.
- recomendacoes (array de {descricao, tipo, prioridade}). Para incompleta: liste o que coletar (ex: "Solicitar gravacao da reuniao de kickoff").

valor_estimado: NUMERO (ex: 50000) ou null — NUNCA texto como "alto" ou "medio".
Responda APENAS com JSON valido — sem markdown, sem comentarios.`

  // Se ragContext ja e o userPrompt completo (passed as single arg from final report), use direto
  const userPrompt = opts.systemPrompt
    ? materialContent // final report passa o prompt completo
    : `## Materiais da Fase\n${materialContent}\n\n## Contexto RAG\n${JSON.stringify(ragContext)}`

  const data = await openaiPost('/chat/completions', {
    model: MODEL_ANALYSIS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const content = data.choices?.[0]?.message?.content || '{}'
  const parsed = JSON.parse(content)
  return {
    ...parsed,
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens
  }
}

export async function generateNote(analysisData) {
  const prompt = `Gere uma nota formatada para o CRM Kommo baseada nesta analise. Seja conciso, profissional, em portugues.
Inclua: score, resumo, principais dores (com gravidade) e recomendacoes prioritarias.
Maximo 800 caracteres.

${JSON.stringify(analysisData)}`

  const data = await openaiPost('/chat/completions', {
    model: MODEL_NOTE,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  })
  return data.choices?.[0]?.message?.content || ''
}

export async function generateEmbedding(text) {
  const data = await openaiPost('/embeddings', {
    model: MODEL_EMBEDDING,
    input: String(text || '').slice(0, 8000)
  })
  return data.data?.[0]?.embedding || []
}

export async function analyzeCollaborator(userData) {
  const model = process.env.COLLAB_ANALYSIS_MODEL || MODEL_ANALYSIS
  const prompt = `Analise o desempenho deste colaborador e retorne JSON com:
- pontos_fortes (array de strings)
- pontos_atencao (array de strings)
- recomendacoes (array de strings)
- distribuicao (objeto com contagens por faixa de score ex: {"0-3": 2, "4-6": 5, "7-10": 3}).

Dados:
${JSON.stringify(userData)}`

  const data = await openaiPost('/chat/completions', {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}
