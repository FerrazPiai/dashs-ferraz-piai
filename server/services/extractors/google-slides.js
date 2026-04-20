// server/services/extractors/google-slides.js
// Extrator nativo Google Slides — substitui branch `google/slides` do workflow n8n.
// Usa slides.presentations.get + GPT-4o vision (detail=high) em CADA imagem embutida.
//
// Rate-limit via createRateLimiter (server/lib/rate-limiter.js) — mesmo padrao
// do figma.js (visionLimiter compartilhado conceitualmente; aqui local).
//
// Retorno: { texto, imagens: [...], erros: [] }

import { getAccessToken, GoogleReauthRequiredError } from '../google-oauth.js'
import { createRateLimiter, withRetry } from '../../lib/rate-limiter.js'
import { VISION_IMAGE_PROMPT, AUDITORIA_NARRATIVA_PROMPT } from './openai-prompts.js'

const SLIDES_BASE = 'https://slides.googleapis.com/v1/presentations'
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

const visionLimiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.VISION_MAX_CONCURRENT || '3', 10),
  maxRpm: parseInt(process.env.VISION_MAX_RPM || '60', 10)
})

function extractPresentationId(url) {
  const m = String(url).match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (!m) throw new Error(`Google Slides URL invalida: ${url}`)
  return m[1]
}

// Junta todos os textRuns de um pageElement (shape.text, table.cells, etc).
function collectTextFromPageElement(pe) {
  const parts = []

  const shapeTextEls = pe.shape?.text?.textElements || []
  for (const te of shapeTextEls) {
    if (te.textRun?.content) parts.push(te.textRun.content)
  }

  if (pe.table) {
    for (const row of pe.table.tableRows || []) {
      const rowParts = []
      for (const cell of row.tableCells || []) {
        const cellParts = []
        for (const te of cell.text?.textElements || []) {
          if (te.textRun?.content) cellParts.push(te.textRun.content)
        }
        if (cellParts.length) rowParts.push(cellParts.join('').trim())
      }
      if (rowParts.length) parts.push(rowParts.join(' | '))
    }
  }

  if (pe.elementGroup?.children) {
    for (const child of pe.elementGroup.children) {
      parts.push(collectTextFromPageElement(child))
    }
  }

  return parts.join('')
}

async function describeImage(contentUrl) {
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
              { type: 'image_url', image_url: { url: contentUrl, detail: 'high' } }
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

// Narrativa final consolidada (gpt-4.1, temperature=0) — secao 6.2 do research.
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

function collectSpeakerNotes(slide) {
  const notesPage = slide.slideProperties?.notesPage
  if (!notesPage) return ''
  const parts = []
  for (const pe of notesPage.pageElements || []) {
    for (const te of pe.shape?.text?.textElements || []) {
      if (te.textRun?.content) parts.push(te.textRun.content)
    }
  }
  return parts.join('').trim()
}

export async function extractGoogleSlides(url, { userId } = {}) {
  if (!userId) throw new Error('extractGoogleSlides requer userId')
  const presentationId = extractPresentationId(url)
  const token = await getAccessToken(userId)

  const res = await globalThis.fetch(`${SLIDES_BASE}/${presentationId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000)
  })
  if (res.status === 401 || res.status === 403) {
    throw new GoogleReauthRequiredError(`Slides ${res.status}`, { userId, reason: 'forbidden' })
  }
  if (!res.ok) throw new Error(`Slides ${res.status}: ${await res.text().catch(() => '')}`)

  const pres = await res.json()
  const textoParts = []
  const imagens = []
  const erros = []
  const descricoesImg = []

  if (pres.title) textoParts.push(`# ${pres.title}`)

  for (const [slideIdx, slide] of (pres.slides || []).entries()) {
    const slideTexts = []

    for (const pe of slide.pageElements || []) {
      if (pe.shape?.text || pe.table || pe.elementGroup) {
        const t = collectTextFromPageElement(pe).trim()
        if (t) slideTexts.push(t)
      }
      if (pe.image?.contentUrl) {
        try {
          const descricao = await describeImage(pe.image.contentUrl)
          imagens.push({
            slideIndex: slideIdx,
            contentUrl: pe.image.contentUrl,
            descricao
          })
          descricoesImg.push(`## Slide ${slideIdx + 1} — Imagem\n${descricao}`)
          slideTexts.push(`[Imagem slide ${slideIdx + 1}] ${descricao}`)
        } catch (err) {
          erros.push({ slideIndex: slideIdx, etapa: 'vision', mensagem: err.message })
        }
      }
    }

    const notes = collectSpeakerNotes(slide)
    if (notes) slideTexts.push(`[Notas slide ${slideIdx + 1}] ${notes}`)

    textoParts.push(`## Slide ${slideIdx + 1}\n${slideTexts.join('\n')}`)
  }

  // Narrativa final (opcional; nao bloqueia retorno)
  try {
    if (descricoesImg.length || textoParts.length > 1) {
      const narrativa = await gerarNarrativaFinal([...textoParts.slice(1), ...descricoesImg].join('\n\n'))
      if (narrativa) textoParts.push(`\n# Auditoria Narrativa Integral\n${narrativa}`)
    }
  } catch (err) {
    erros.push({ etapa: 'narrativa_final', mensagem: err.message })
  }

  return {
    texto: textoParts.join('\n\n'),
    imagens,
    erros,
    _meta: {
      presentationId,
      totalSlides: (pres.slides || []).length,
      totalImagens: imagens.length
    }
  }
}

export default extractGoogleSlides
