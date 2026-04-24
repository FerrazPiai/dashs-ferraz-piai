// OpenAI client — apenas embeddings e tokenizacao aproximada.
// Analise/nota/coordenador migraram para ai-client.js (provider-agnostico via tc_ai_provider_config).
// Embedding permanece OpenAI porque os vetores ja persistidos em tc_embeddings foram gerados
// com text-embedding-3-small — trocar quebraria similarity search.
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const API_KEY = process.env.OPENAI_API_KEY
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

export async function generateEmbedding(text) {
  const data = await openaiPost('/embeddings', {
    model: MODEL_EMBEDDING,
    input: String(text || '').slice(0, 8000)
  })
  return data.data?.[0]?.embedding || []
}
