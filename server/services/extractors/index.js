// server/services/extractors/index.js
// Dispatcher de extratores via webhooks n8n.
//
// 4 webhooks n8n (tokens centralizados na conta V4):
//   - N8N_EXTRACT_TRANSCRICAO_URL  -> transcricao (Google Docs)
//   - N8N_EXTRACT_GOOGLE_URL       -> slides / reuniao (Google Slides/Drive)
//   - N8N_EXTRACT_FIGMA_URL        -> figma
//   - N8N_EXTRACT_MIRO_URL         -> miro
//
// Todos recebem body `{ url, plataforma }` e retornam `{ data: ... }`.
//
// Erros de sharing (403): o backend V4 nao tem acesso ao arquivo. Apenas Google
// e considerado bloqueante — user precisa compartilhar com as contas em
// SHARING_REQUIRED_ACCOUNTS. Figma/Miro falham silenciosamente (analise segue
// com aviso de "nao foi possivel extrair").

import { createRateLimiter, withRetry } from '../../lib/rate-limiter.js'

const n8nLimiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.N8N_EXTRACT_MAX_CONCURRENT || '2', 10),
  maxRpm: 120
})

// Plataforma (chave semantica Kommo) -> { envVar, blockingOn403 }
const PLATFORM_ROUTES = {
  transcricao: { envVar: 'N8N_EXTRACT_TRANSCRICAO_URL', blockingOn403: true,  group: 'google' },
  slides:      { envVar: 'N8N_EXTRACT_GOOGLE_URL',      blockingOn403: true,  group: 'google' },
  reuniao:     { envVar: 'N8N_EXTRACT_GOOGLE_URL',      blockingOn403: true,  group: 'google' },
  figma:       { envVar: 'N8N_EXTRACT_FIGMA_URL',       blockingOn403: false, group: 'figma'  },
  miro:        { envVar: 'N8N_EXTRACT_MIRO_URL',        blockingOn403: false, group: 'miro'   }
}

export class SharingRequiredError extends Error {
  constructor(message, { platform, url, accounts } = {}) {
    super(message)
    this.name = 'SharingRequiredError'
    this.code = 'sharing_required'
    this.platform = platform
    this.url = url
    this.accounts = accounts || getSharingAccounts()
  }
}

export function getSharingAccounts() {
  const raw = process.env.SHARING_REQUIRED_ACCOUNTS || ''
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export async function dispatchExtractor(platform, url, _opts = {}) {
  const route = PLATFORM_ROUTES[platform]
  if (!route) {
    throw new Error(`dispatchExtractor: plataforma desconhecida "${platform}"`)
  }
  const webhookUrl = process.env[route.envVar]
  if (!webhookUrl) {
    throw new Error(`dispatchExtractor: ${route.envVar} nao configurado (.env)`)
  }

  await n8nLimiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, plataforma: platform }),
        signal: AbortSignal.timeout(180_000)
      })

      // 403 em Google/Slides/Transcricao = sharing bloqueante — sinaliza ao caller
      if (res.status === 403 && route.blockingOn403) {
        const body = await res.text().catch(() => '')
        throw new SharingRequiredError(
          `Conta V4 sem acesso ao ${platform}: ${body.slice(0, 200)}`,
          { platform, url }
        )
      }

      if (!res.ok) {
        const err = new Error(`n8n extract ${platform} ${res.status}`)
        err.status = res.status
        throw err
      }

      const payload = await res.json()
      if (payload && !payload.data && !Array.isArray(payload)) {
        console.warn(`[${new Date().toISOString()}] [n8n-extract] shape inesperado em ${platform}`)
      }
      return payload
    })
  } finally {
    n8nLimiter.release()
  }
}

export default { dispatchExtractor, SharingRequiredError, getSharingAccounts }
