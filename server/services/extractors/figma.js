// server/services/extractors/figma.js
// Extrator nativo Figma — substitui branch `figma` do workflow n8n uiUUXegcBHe3z2fg.
// Token centralizado em FIGMA_TOKEN (.env). Prompts portados LITERAL do workflow n8n
// via ./openai-prompts.js (ver .planning/research/n8n-workflow-auditoria-saber-interno.md).
//
// Fluxo (secao 2 do research doc):
//   1. Extract File Key (regex)
//   2. GET /v1/files/{fileKey} -> document.children (paginas)
//   3. GET /v1/images/{fileKey}?ids=...&format=png -> URLs temporarias
//   4. Para cada PNG: GPT-4o vision (detail=high) com VISION_IMAGE_PROMPT
//   5. Agregar descricoes + GPT-4.1 JSON schema (AUDITORIA_NARRATIVA_PROMPT) como narrativa final
//
// Retorno: { texto, imagens, erros }

import { createRateLimiter, withRetry } from '../../lib/rate-limiter.js'
import { VISION_IMAGE_PROMPT, AUDITORIA_NARRATIVA_PROMPT } from './openai-prompts.js'

const FIGMA_BASE = 'https://api.figma.com/v1'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

// Rate limiter compartilhado com google-slides (mesmo padrao) — serializa vision calls
const visionLimiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.VISION_MAX_CONCURRENT || '3', 10),
  maxRpm: parseInt(process.env.VISION_MAX_RPM || '60', 10)
})

// Regex do node "Extract File Key" do workflow: aceita /file/, /design/, /proto/, /slides/, /deck/
function extractFileKey(url) {
  const m = String(url).match(/figma\.com\/(?:file|design|proto|slides|deck)\/([a-zA-Z0-9]+)/)
  if (!m) throw new Error(`Figma URL invalida: ${url}`)
  return m[1]
}

// Busca estrutura completa do arquivo Figma (document.children = paginas)
async function fetchFigmaFile(fileKey, token) {
  const res = await globalThis.fetch(`${FIGMA_BASE}/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000)
  })
  if (!res.ok) throw new Error(`Figma file ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
}

// Exporta paginas/frames como PNG. Aceita lista de node IDs, retorna { nodeId: pngUrl }.
async function fetchFigmaImages(fileKey, nodeIds, token) {
  if (!nodeIds.length) return {}
  const url = new URL(`${FIGMA_BASE}/images/${fileKey}`)
  url.searchParams.set('ids', nodeIds.join(','))
  url.searchParams.set('format', 'png')
  url.searchParams.set('scale', '1')
  const res = await globalThis.fetch(url.toString(), {
    headers: { 'X-Figma-Token': token, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000)
  })
  if (!res.ok) throw new Error(`Figma images ${res.status}: ${await res.text().catch(() => '')}`)
  const json = await res.json()
  return json.images || {}
}

// GPT-4o vision por imagem (detail=high, prompt LITERAL do node "Analyze image")
async function describeImage(pngUrl) {
  await visionLimiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: VISION_IMAGE_PROMPT },
              { type: 'image_url', image_url: { url: pngUrl, detail: 'high' } }
            ]
          }]
        }),
        signal: AbortSignal.timeout(120_000)
      })
      if (!res.ok) {
        const err = new Error(`vision ${res.status}: ${await res.text().catch(() => '')}`)
        err.status = res.status
        throw err
      }
      const json = await res.json()
      return json.choices?.[0]?.message?.content || ''
    })
  } finally {
    visionLimiter.release()
  }
}

// GPT-4.1 JSON schema strict — equivalente ao node "Message a model" (branch figma step final)
async function gerarNarrativaFinal(descricoesConcatenadas) {
  if (!AUDITORIA_NARRATIVA_PROMPT) return null
  const res = await globalThis.fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      temperature: 0,
      messages: [
        { role: 'system', content: AUDITORIA_NARRATIVA_PROMPT },
        { role: 'user', content: descricoesConcatenadas }
      ]
    }),
    signal: AbortSignal.timeout(180_000)
  })
  if (!res.ok) throw new Error(`narrativa ${res.status}: ${await res.text().catch(() => '')}`)
  const json = await res.json()
  return json.choices?.[0]?.message?.content || ''
}

// Coleta IDs de todas as paginas (document.children). Cada pagina vira 1 imagem PNG.
function collectPageNodeIds(fileJson) {
  const pages = []
  for (const [idx, page] of (fileJson.document?.children || []).entries()) {
    if (page.id && page.type === 'CANVAS') {
      pages.push({ id: page.id, name: page.name || `Pagina ${idx + 1}`, index: idx })
    }
  }
  return pages
}

export async function extractFigma(url, _opts = {}) {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN nao configurado')

  const fileKey = extractFileKey(url)
  const imagens = []
  const erros = []
  const textoParts = []

  // 1. GET file structure
  const fileJson = await fetchFigmaFile(fileKey, token)
  const pages = collectPageNodeIds(fileJson)
  textoParts.push(`# ${fileJson.name || 'Arquivo Figma'}`)

  if (!pages.length) {
    return { texto: textoParts.join('\n'), imagens, erros, _meta: { fileKey, totalPaginas: 0 } }
  }

  // 2. Export PNGs (uma unica chamada para todas as paginas)
  let imagesMap = {}
  try {
    imagesMap = await fetchFigmaImages(fileKey, pages.map(p => p.id), token)
  } catch (err) {
    erros.push({ etapa: 'export_png', mensagem: err.message })
  }

  // 3. Para cada pagina com PNG, chamar vision (GPT-4o detail=high)
  const descricoes = []
  for (const page of pages) {
    const pngUrl = imagesMap[page.id]
    if (!pngUrl) {
      erros.push({ pagina: page.name, mensagem: 'URL PNG ausente no retorno do Figma' })
      continue
    }
    try {
      const descricao = await describeImage(pngUrl)
      imagens.push({ pageId: page.id, pageName: page.name, pageIndex: page.index, pngUrl, descricao })
      descricoes.push(`## ${page.name}\n${descricao}`)
      textoParts.push(`## ${page.name}\n${descricao}`)
    } catch (err) {
      erros.push({ pagina: page.name, mensagem: err.message })
    }
  }

  // 4. Narrativa final consolidada (GPT-4.1 JSON schema)
  try {
    const narrativa = await gerarNarrativaFinal(descricoes.join('\n\n'))
    if (narrativa) textoParts.push(`\n# Auditoria Narrativa Integral\n${narrativa}`)
  } catch (err) {
    erros.push({ etapa: 'narrativa_final', mensagem: err.message })
  }

  return {
    texto: textoParts.join('\n\n'),
    imagens,
    erros,
    _meta: { fileKey, totalPaginas: pages.length, totalImagens: imagens.length }
  }
}

export default extractFigma
