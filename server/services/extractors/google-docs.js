// server/services/extractors/google-docs.js
// Extrator nativo Google Docs — substitui branch `transcricao` do workflow n8n.
// Usa docs.documents.get e percorre body.content[] preservando ordem.
// Sem OCR, sem Mistral, sem download de PDF.
//
// Retorno: { texto, imagens: [], erros: [] }

import { getAccessToken, GoogleReauthRequiredError } from '../google-oauth.js'

const DOCS_BASE = 'https://docs.googleapis.com/v1/documents'

// URL: https://docs.google.com/document/d/{DOC_ID}/edit
function extractDocumentId(url) {
  const m = String(url).match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (!m) throw new Error(`Google Doc URL invalida: ${url}`)
  return m[1]
}

// Recursivo: aceita body.content ou tableCell.content.
function walkContent(content) {
  const parts = []
  for (const el of content || []) {
    if (el.paragraph) {
      const line = (el.paragraph.elements || [])
        .map(e => e.textRun?.content || '')
        .join('')
      if (line.trim()) parts.push(line.replace(/\n$/, ''))
    } else if (el.table) {
      for (const row of el.table.tableRows || []) {
        const cells = (row.tableCells || [])
          .map(cell => walkContent(cell.content).trim())
          .filter(Boolean)
        if (cells.length) parts.push(cells.join(' | '))
      }
    } else if (el.sectionBreak) {
      parts.push('')
    } else if (el.tableOfContents) {
      parts.push(walkContent(el.tableOfContents.content))
    }
  }
  return parts.join('\n')
}

export async function extractGoogleDoc(url, { userId } = {}) {
  if (!userId) throw new Error('extractGoogleDoc requer userId')
  const documentId = extractDocumentId(url)
  const token = await getAccessToken(userId) // pode lancar GoogleReauthRequiredError

  const res = await globalThis.fetch(`${DOCS_BASE}/${documentId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(60_000)
  })

  if (res.status === 401 || res.status === 403) {
    throw new GoogleReauthRequiredError(`Docs ${res.status}`, { userId, reason: 'forbidden' })
  }
  if (!res.ok) {
    throw new Error(`Docs ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const doc = await res.json()
  const titulo = doc.title || ''
  const corpo = walkContent(doc.body?.content)
  const texto = titulo ? `# ${titulo}\n\n${corpo}` : corpo

  return {
    texto,
    imagens: [],
    erros: [],
    _meta: { documentId, titulo }
  }
}

export default extractGoogleDoc
