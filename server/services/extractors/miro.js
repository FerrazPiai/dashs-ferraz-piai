// server/services/extractors/miro.js
// Extrator nativo Miro — substitui branch `miro` do workflow n8n uiUUXegcBHe3z2fg.
// Token centralizado em MIRO_TOKEN (.env).
// CORRIGE bug do workflow atual: pagina `/v2/boards/{id}/items` via cursor ate o fim
// (hoje so le a primeira pagina de 50 itens).
//
// Retorno: { texto, imagens: [...], erros: [], _meta: { totalItens } }

const MIRO_BASE = 'https://api.miro.com/v2'

// URL: https://miro.com/app/board/{BOARD_ID}/   (boardId as vezes tem `=` no final)
function extractBoardId(url) {
  const m = String(url).match(/\/app\/board\/([A-Za-z0-9_=-]+)/)
  if (!m) throw new Error(`Miro board URL invalida: ${url}`)
  return m[1]
}

// Pagina via cursor ate o fim. NAO para na primeira pagina.
async function fetchAllItems(boardId, token) {
  const items = []
  let cursor = null
  do {
    const u = new URL(`${MIRO_BASE}/boards/${boardId}/items`)
    u.searchParams.set('limit', '50')
    if (cursor) u.searchParams.set('cursor', cursor)
    const res = await globalThis.fetch(u.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(60_000)
    })
    if (!res.ok) {
      throw new Error(`Miro items ${res.status}: ${await res.text().catch(() => '')}`)
    }
    const page = await res.json()
    items.push(...(page.data || []))
    cursor = page.cursor || null
  } while (cursor)
  return items
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim()
}

export async function extractMiro(url, _opts = {}) {
  const token = process.env.MIRO_TOKEN
  if (!token) throw new Error('MIRO_TOKEN nao configurado')

  const boardId = extractBoardId(url)
  const items = await fetchAllItems(boardId, token)

  const textoParts = []
  const imagens = []
  const erros = []

  // Ordena por leitura natural (top-to-bottom, left-to-right) quando houver position.
  items.sort((a, b) => {
    const ay = a.position?.y ?? 0
    const by = b.position?.y ?? 0
    if (ay !== by) return ay - by
    return (a.position?.x ?? 0) - (b.position?.x ?? 0)
  })

  for (const it of items) {
    switch (it.type) {
      case 'sticky_note':
      case 'text':
      case 'shape':
      case 'card': {
        const content = stripHtml(it.data?.content)
        const title = stripHtml(it.data?.title)
        const bits = [title, content].filter(Boolean)
        if (bits.length) textoParts.push(`[${it.type}] ${bits.join(' — ')}`)
        break
      }
      case 'frame': {
        const title = stripHtml(it.data?.title)
        if (title) textoParts.push(`\n## Frame: ${title}`)
        break
      }
      case 'image': {
        const imageUrl = it.data?.imageUrl || it.data?.url || null
        const title = stripHtml(it.data?.title)
        imagens.push({ id: it.id, url: imageUrl, title })
        textoParts.push(`[Imagem ${title || it.id}]`)
        break
      }
      case 'connector': {
        const captions = (it.data?.captions || [])
          .map(c => stripHtml(c.content))
          .filter(Boolean)
        if (captions.length) textoParts.push(`[conexao] ${captions.join(' | ')}`)
        break
      }
      default: {
        // Preserve o tipo em texto para nao perder sinal
        const title = stripHtml(it.data?.title)
        if (title) textoParts.push(`[${it.type}] ${title}`)
      }
    }
  }

  return {
    texto: textoParts.filter(Boolean).join('\n'),
    imagens,
    erros,
    _meta: { boardId, totalItens: items.length, totalImagens: imagens.length }
  }
}

export default extractMiro
