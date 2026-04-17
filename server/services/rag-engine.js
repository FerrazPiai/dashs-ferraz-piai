// RAG engine — 4 camadas com token budget fixo.
// Camada 1: historico do cliente (2K tokens)
// Camada 2: casos similares via pgvector (3K tokens)
// Camada 3: base de conhecimento (2K tokens)
// Camada 4: contexto Kommo do lead — descricao, objetivo, dores, DISC, stack (1.5K tokens)
import pool from '../lib/db.js'
import { generateEmbedding, countTokens } from './openai-client.js'
import { getCachedLeadCustomFields } from './kommo-cache.js'

const MAX_CONTEXT = parseInt(process.env.RAG_MAX_CONTEXT_TOKENS || '12000', 10)
const L1_BUDGET   = parseInt(process.env.RAG_LAYER1_BUDGET || '2000', 10)
const L2_BUDGET   = parseInt(process.env.RAG_LAYER2_BUDGET || '3000', 10)
const L2_TOP_K    = parseInt(process.env.RAG_LAYER2_TOP_K || '5', 10)
const L3_BUDGET   = parseInt(process.env.RAG_LAYER3_BUDGET || '2000', 10)
const L3_TOP_K    = parseInt(process.env.RAG_LAYER3_TOP_K || '5', 10)
const L4_BUDGET   = parseInt(process.env.RAG_LAYER4_BUDGET || '1500', 10)
const L5_BUDGET   = parseInt(process.env.RAG_LAYER5_BUDGET || '1500', 10)
const L5_TOP_K    = parseInt(process.env.RAG_LAYER5_TOP_K || '15', 10)

const L4_FIELDS = {
  'Descricao da Empresa': 1989878,
  'Objetivo da Empresa': 1989880,
  'Dores do Negocio': 1989898,
  'Stack de Ferramentas': 1989904,
  'Participantes': 1989914,
  'DISC': 1989922,
  'Cenario do Marketing': 1989890,
  'Consciencia das Metricas': 1989892
}

function truncateToTokens(text, maxTokens) {
  if (!text) return ''
  const tokens = countTokens(text)
  if (tokens <= maxTokens) return text
  const ratio = maxTokens / tokens
  return text.slice(0, Math.floor(text.length * ratio))
}

async function buildLayer1(projetoFaseId) {
  const { rows } = await pool.query(`
    SELECT pf.id, fc.nome AS fase, pf.score, a.resumo, a.created_at
    FROM dashboards_hub.tc_projeto_fases pf
    JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
    LEFT JOIN dashboards_hub.tc_analises_ia a
      ON a.projeto_fase_id = pf.id AND a.versao = (
        SELECT MAX(versao) FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = pf.id
      )
    WHERE pf.projeto_id = (SELECT projeto_id FROM dashboards_hub.tc_projeto_fases WHERE id = $1)
      AND pf.id <> $1
    ORDER BY fc.ordem ASC
  `, [projetoFaseId])

  const text = rows
    .map(r => `Fase ${r.fase} (score ${r.score ?? '-'}): ${r.resumo || '(sem analise)'}`)
    .join('\n\n')

  return { text: truncateToTokens(text, L1_BUDGET), rows: rows.length }
}

async function buildLayer2(projetoFaseId, queryText) {
  if (!queryText) return { text: '', rows: 0 }
  let embedding
  try {
    embedding = await generateEmbedding(queryText)
  } catch {
    // Sem OpenAI key — camada 2 degradada
    return { text: '', rows: 0 }
  }
  if (!embedding.length) return { text: '', rows: 0 }

  const vecLiteral = `[${embedding.join(',')}]`
  const { rows } = await pool.query(`
    SELECT e.conteudo_texto, e.metadata, (e.embedding <=> $1::vector) AS distancia
    FROM dashboards_hub.tc_embeddings e
    WHERE e.referencia_tipo = 'analise_ia'
      AND e.referencia_id <> (SELECT COALESCE(MAX(id), 0) FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $2)
    ORDER BY e.embedding <=> $1::vector ASC
    LIMIT $3
  `, [vecLiteral, projetoFaseId, L2_TOP_K])

  const text = rows
    .map(r => `[similaridade ${(1 - r.distancia).toFixed(2)}] ${r.conteudo_texto}`)
    .join('\n---\n')

  return { text: truncateToTokens(text, L2_BUDGET), rows: rows.length }
}

async function buildLayer3(fase) {
  const { rows } = await pool.query(`
    SELECT titulo, conteudo, categoria
    FROM dashboards_hub.tc_conhecimento
    WHERE ativo = true
      AND (fase_aplicavel = $1 OR fase_aplicavel IS NULL)
    ORDER BY relevancia DESC
    LIMIT $2
  `, [fase, L3_TOP_K])

  const text = rows
    .map(r => `## ${r.titulo} (${r.categoria || 'geral'})\n${r.conteudo}`)
    .join('\n\n')

  return { text: truncateToTokens(text, L3_BUDGET), rows: rows.length }
}

async function buildLayer4(leadId) {
  if (!leadId) return { text: '', rows: 0 }
  const cf = getCachedLeadCustomFields(leadId)
  if (!cf) return { text: '', rows: 0 }

  const parts = []
  for (const [label, fieldId] of Object.entries(L4_FIELDS)) {
    const f = cf.find(x => x.field_id === fieldId)
    const val = f?.values?.[0]?.value
    if (val) parts.push(`### ${label}\n${val}`)
  }
  const text = parts.join('\n\n')
  return { text: truncateToTokens(text, L4_BUDGET), rows: parts.length }
}

// Camada 5 — Anotacoes humanas do lead (notes registradas pelos usuarios na Torre)
async function buildLayer5(leadId) {
  if (!leadId) return { text: '', rows: 0 }
  const { rows } = await pool.query(`
    SELECT tipo, conteudo, fase_ordem, importante, pinned, author_name, created_at
    FROM dashboards_hub.tc_lead_notes
    WHERE lead_id = $1
    ORDER BY importante DESC, pinned DESC, created_at DESC
    LIMIT $2
  `, [parseInt(leadId, 10), L5_TOP_K]).catch(() => ({ rows: [] }))

  if (!rows.length) return { text: '', rows: 0 }

  const text = rows.map(n => {
    const flag = n.importante ? '⭐ ' : ''
    const fase = n.fase_ordem ? ` (fase ${n.fase_ordem})` : ''
    const dt = n.created_at ? new Date(n.created_at).toISOString().slice(0, 10) : ''
    return `${flag}[${n.tipo}${fase}] por ${n.author_name || '?'} em ${dt}\n${n.conteudo}`
  }).join('\n\n---\n')

  return { text: truncateToTokens(text, L5_BUDGET), rows: rows.length }
}

export async function buildRagContext({ projetoFaseId, fase, queryText, leadId }) {
  const [l1, l2, l3, l4, l5] = await Promise.all([
    buildLayer1(projetoFaseId),
    buildLayer2(projetoFaseId, queryText),
    buildLayer3(fase),
    buildLayer4(leadId),
    buildLayer5(leadId)
  ])

  const context = {
    historico_cliente:   l1.text,
    casos_similares:     l2.text,
    base_conhecimento:   l3.text,
    contexto_kommo:      l4.text,
    anotacoes_internas:  l5.text
  }

  // Anti-overflow
  if (countTokens(JSON.stringify(context)) > MAX_CONTEXT) {
    context.casos_similares = truncateToTokens(context.casos_similares, Math.floor(L2_BUDGET / 2))
    context.base_conhecimento = truncateToTokens(context.base_conhecimento, Math.floor(L3_BUDGET / 2))
    context.contexto_kommo = truncateToTokens(context.contexto_kommo, Math.floor(L4_BUDGET / 2))
  }

  return {
    context,
    metadata: {
      layer1_rows: l1.rows,
      layer2_rows: l2.rows,
      layer3_rows: l3.rows,
      layer4_rows: l4.rows,
      layer5_rows: l5.rows,
      tokens_aproximado: countTokens(JSON.stringify(context))
    }
  }
}
