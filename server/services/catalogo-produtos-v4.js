// Catalogo real de produtos V4 Company (CSV na raiz do projeto).
// Carregado uma unica vez em memoria e injetado no prompt da IA para que
// as oportunidades sugeridas sejam SEMPRE produtos reais — nao alucinados.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../../produtos_v4_descrição.csv')

let _catalogoCache = null
let _catalogoTextoCache = null

// Parser minimalista de CSV com suporte a campos entre aspas contendo virgulas e quebras de linha.
function parseCsv(raw) {
  // Remove BOM se houver
  const text = raw.replace(/^\uFEFF/, '')
  const rows = []
  let cur = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { inQuotes = false }
      else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === ',') { cur.push(field); field = '' }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else { field += c }
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur) }
  return rows.filter(r => r.length > 1 || (r[0] && r[0].length))
}

function loadCatalogo() {
  if (_catalogoCache) return _catalogoCache
  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8')
    const rows = parseCsv(raw)
    if (!rows.length) {
      console.warn(`[${new Date().toISOString()}] [catalogo-produtos-v4] CSV vazio em ${CSV_PATH}`)
      _catalogoCache = []
      return _catalogoCache
    }
    const header = rows[0].map(h => h.trim())
    const idxNome      = header.indexOf('Nome_do_Produto')
    const idxCategoria = header.indexOf('Categoria_do_Produto')
    const idxICP       = header.indexOf('ICP_Ideal_Customer_Profile')
    const idxParaQuem  = header.indexOf('Para_quem_serve')

    _catalogoCache = rows.slice(1)
      .filter(r => r[idxNome])
      .map(r => ({
        nome: r[idxNome]?.trim() || '',
        categoria: r[idxCategoria]?.trim() || '',
        icp: (r[idxICP] || '').trim().slice(0, 400),
        para_quem: (r[idxParaQuem] || '').trim().slice(0, 400)
      }))
    console.log(`[${new Date().toISOString()}] [catalogo-produtos-v4] carregados ${_catalogoCache.length} produtos`)
    return _catalogoCache
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [catalogo-produtos-v4] falha ao carregar catalogo: ${err.message}`)
    _catalogoCache = []
    return _catalogoCache
  }
}

// Versao textual compacta para injecao no prompt — Nome | Categoria | ICP curto.
// Evita explodir tokens — usa so o essencial para o modelo mapear dor -> produto.
export function getCatalogoProdutosTexto() {
  if (_catalogoTextoCache) return _catalogoTextoCache
  const itens = loadCatalogo()
  if (!itens.length) {
    _catalogoTextoCache = '(catalogo nao disponivel)'
    return _catalogoTextoCache
  }
  _catalogoTextoCache = itens
    .map(p => `- ${p.nome} [${p.categoria}] — ICP: ${p.icp.slice(0, 180)}`)
    .join('\n')
  return _catalogoTextoCache
}

export function getCatalogoProdutos() {
  return loadCatalogo()
}
