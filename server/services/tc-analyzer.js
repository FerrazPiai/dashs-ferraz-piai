// TC Analyzer — orquestra Kommo -> n8n extract -> RAG -> OpenAI -> persist -> embed -> Kommo note
import crypto from 'node:crypto'
import pool from '../lib/db.js'
import { getLeadCustomFields, extractPhaseLinks, updateLeadNote } from './kommo-client.js'
import { analyzeText, generateNote, getActiveProviderConfig } from './ai-client.js'
import { generateEmbedding, countTokens } from './openai-client.js'
import { buildRagContext } from './rag-engine.js'
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const N8N_URL = process.env.N8N_EXTRACT_WEBHOOK_URL
const n8nLimiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.N8N_MAX_CONCURRENT || '2', 10),
  maxRpm: 120
})

function hashContent(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex')
}

// Mapeamento das plataformas da nossa base (label semantico do Kommo)
// para os valores que o Switch do workflow n8n uiUUXegcBHe3z2fg aceita.
// Workflow tem 4 branches: figma, google, miro, transcricao.
// "slides" e "reuniao" sao tratados via branch "google" (Drive/OCR via Mistral).
// ⚠️ O workflow tem um typo: a chave esperada e "plataform" (sem 'a' final), nao "platform".
// Ver: .planning/research/n8n-extraction-webhook-shapes.md
const PLATFORM_TO_N8N = {
  slides: 'google',
  reuniao: 'google',
  transcricao: 'transcricao',
  figma: 'figma',
  miro: 'miro'
}

async function extractViaN8n(url, platform) {
  if (!N8N_URL) throw new Error('N8N_EXTRACT_WEBHOOK_URL nao configurado')
  const n8nPlatform = PLATFORM_TO_N8N[platform]
  if (!n8nPlatform) {
    throw new Error(`platform "${platform}" nao suportada pelo workflow n8n (aceita: ${Object.keys(PLATFORM_TO_N8N).join(', ')})`)
  }
  await n8nLimiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Nota: chave "plataform" corresponde ao typo do workflow n8n. NAO trocar para "platform".
        body: JSON.stringify({ url, plataform: n8nPlatform }),
        signal: AbortSignal.timeout(180000)
      })
      if (!res.ok) {
        const err = new Error(`n8n extract ${res.status}`)
        err.status = res.status
        throw err
      }
      const payload = await res.json()
      // Todos os terminais do workflow sao aggregates -> { data: [...] }.
      // Validamos antes de retornar pra facilitar debug quando vem vazio.
      if (payload && !payload.data && !Array.isArray(payload)) {
        // Pode ser que o workflow caiu fora do switch (plataform desconhecida) e retornou o payload cru.
        console.warn(`[${new Date().toISOString()}] [n8n-extract] resposta sem shape esperado para ${platform} (${n8nPlatform})`)
      }
      return payload
    })
  } finally {
    n8nLimiter.release()
  }
}

async function getOrExtract(leadId, fase, plataforma, url) {
  const existing = await pool.query(
    `SELECT conteudo_full, conteudo_medium, conteudo_short, hash_conteudo
     FROM dashboards_hub.tc_extracoes
     WHERE lead_id = $1 AND url_origem = $2`,
    [leadId, url]
  )
  if (existing.rows[0]) return existing.rows[0]

  const extracted = await extractViaN8n(url, plataforma)
  // O webhook n8n retorna shapes diferentes por plataforma (slides/reuniao/transcricao/figma/miro).
  // Salvamos o JSON bruto completo como string — a IA recebe tudo e interpreta.
  const rawJson = JSON.stringify(extracted, null, 2)
  // Ainda preenchemos os campos legacy para retrocompatibilidade:
  const full = rawJson
  const medium = rawJson.slice(0, 6000)
  const short = rawJson.slice(0, 1500)
  const hash = hashContent(rawJson)

  await pool.query(`
    INSERT INTO dashboards_hub.tc_extracoes
      (lead_id, fase, plataforma, url_origem, conteudo_full, conteudo_medium, conteudo_short, tokens_full, hash_conteudo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (lead_id, url_origem) DO UPDATE SET
      conteudo_full = EXCLUDED.conteudo_full,
      conteudo_medium = EXCLUDED.conteudo_medium,
      conteudo_short = EXCLUDED.conteudo_short,
      hash_conteudo = EXCLUDED.hash_conteudo
  `, [leadId, fase, plataforma, url, full, medium, short, countTokens(full), hash])

  return { conteudo_full: full, conteudo_medium: medium, conteudo_short: short, hash_conteudo: hash, raw: extracted }
}

async function distributeAnalysis(projetoFaseId, analysisId, parsed) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const d of parsed.dores || []) {
      await client.query(
        `INSERT INTO dashboards_hub.tc_insatisfacoes (projeto_fase_id, descricao, gravidade)
         VALUES ($1, $2, $3)`,
        [projetoFaseId, d.descricao, d.gravidade || 'media']
      )
    }
    for (const o of parsed.oportunidades || []) {
      // Coerce valor_estimado para numeric — IA as vezes devolve string tipo "alto", "N/A", etc.
      let valorNum = null
      if (o.valor_estimado != null) {
        const n = Number(String(o.valor_estimado).replace(/[^\d.,-]/g, '').replace(',', '.'))
        if (!isNaN(n) && isFinite(n) && n > 0) valorNum = n
      }
      await client.query(
        `INSERT INTO dashboards_hub.tc_oportunidades (projeto_fase_id, titulo, descricao, valor_estimado)
         VALUES ($1, $2, $3, $4)`,
        [projetoFaseId, o.titulo, o.descricao, valorNum]
      )
    }
    const { rows: [pf] } = await client.query(
      `SELECT projeto_id FROM dashboards_hub.tc_projeto_fases WHERE id = $1`,
      [projetoFaseId]
    )
    if (pf) {
      for (const r of parsed.riscos || []) {
        await client.query(
          `INSERT INTO dashboards_hub.tc_riscos (projeto_id, descricao, tipo, probabilidade, impacto)
           VALUES ($1, $2, $3, $4, $5)`,
          [pf.projeto_id, r.descricao, r.tipo || 'qualidade', r.probabilidade || 'media', r.impacto || 'medio']
        )
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Relatorio consolidado do projeto — roda quando fase = 'projeto-concluido'
// Agrega todas analises anteriores + gera parecer final via OpenAI.
export async function runFinalReport({ projetoFaseId, leadId, onProgress }) {
  const progress = (step, data = {}) => { try { onProgress?.({ step, ...data }) } catch {} }

  progress('fetching_kommo')
  const customFields = await getLeadCustomFields(leadId)

  progress('building_rag')
  // Pega contexto Kommo do RAG camada 4
  const { buildRagContext } = await import('./rag-engine.js')
  const { context: ragContext, metadata: ragMeta } = await buildRagContext({
    projetoFaseId, fase: 'projeto-concluido', queryText: '', leadId
  })

  progress('persisting')
  // Pega todas as analises anteriores do projeto
  const { rows: [ctx] } = await pool.query(`
    SELECT p.id AS projeto_id, c.nome AS cliente_nome
    FROM dashboards_hub.tc_projeto_fases pf
    JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
    JOIN dashboards_hub.tc_clientes c ON c.id = p.cliente_id
    WHERE pf.id = $1
  `, [projetoFaseId])
  const { rows: analisesAnteriores } = ctx?.projeto_id
    ? await pool.query(`
        SELECT fc.nome AS fase, a.score, a.veredicto, a.resumo, a.dores, a.oportunidades, a.riscos
        FROM dashboards_hub.tc_analises_ia a
        JOIN dashboards_hub.tc_projeto_fases pf ON pf.id = a.projeto_fase_id
        JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
        WHERE pf.projeto_id = $1 AND fc.ordem < 6
        ORDER BY fc.ordem, a.versao DESC
      `, [ctx.projeto_id])
    : { rows: [] }

  progress('calling_ia')
  const historicoFases = analisesAnteriores
    .map(a => `### ${a.fase} (score ${a.score}, veredicto: ${a.veredicto})\n${a.resumo}`)
    .join('\n\n')

  const systemPrompt = `Voce e um auditor senior da V4 Company encerrando um projeto do pipeline Saber.
Gere o RELATORIO FINAL consolidado avaliando a jornada completa do cliente.
Retorne JSON com:
- score (0-10, media ponderada final)
- veredicto (curto, ex: "Projeto de sucesso com upsell")
- resumo (texto executivo da jornada completa)
- analise_materiais (o que foi entregue em cada fase)
- percepcao_cliente (objeto com tom, engajamento, confianca — cada 0-10)
- dores (array de dores RESIDUAIS pos-projeto)
- oportunidades (array de {titulo, descricao, valor_estimado} — upsell/renovacao)
- riscos (array de {descricao, tipo, probabilidade, impacto} — risco de churn apos encerramento)
- recomendacoes (array de {descricao, tipo, prioridade} — proximos passos com o cliente)
Responda APENAS JSON valido.`

  const userPrompt = `## Contexto do Cliente\n${JSON.stringify(ragContext)}\n\n## Historico de Fases Auditadas\n${historicoFases || '(nenhuma analise previa)'}`

  const parsed = await analyzeText(userPrompt, {}, { systemPrompt })

  // Persiste como analise da fase projeto-concluido
  const { rows: [{ max_versao }] } = await pool.query(
    `SELECT COALESCE(MAX(versao), 0) AS max_versao FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $1`,
    [projetoFaseId]
  )
  const novaVersao = max_versao + 1
  const tokens_in = parsed.tokens_input || 0
  const tokens_out = parsed.tokens_output || 0
  const cfg = await getActiveProviderConfig()
  const priceIn = Number(cfg.price_in_per_mtok) || 0.75
  const priceOut = Number(cfg.price_out_per_mtok) || 4.5
  const custo = (tokens_in * priceIn + tokens_out * priceOut) / 1_000_000
  const modeloUsado = `${parsed._provider}:${parsed._model} (final)`

  const { rows: [analise] } = await pool.query(`
    INSERT INTO dashboards_hub.tc_analises_ia
      (projeto_fase_id, versao, modelo_usado, score, veredicto, resumo, analise_materiais,
       percepcao_cliente, dores, oportunidades, riscos, recomendacoes, contexto_rag,
       tokens_input, tokens_output, custo_estimado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id
  `, [
    projetoFaseId, novaVersao, modeloUsado,
    parsed.score, parsed.veredicto, parsed.resumo, parsed.analise_materiais,
    JSON.stringify(parsed.percepcao_cliente || {}),
    JSON.stringify(parsed.dores || []),
    JSON.stringify(parsed.oportunidades || []),
    JSON.stringify(parsed.riscos || []),
    JSON.stringify(parsed.recomendacoes || []),
    JSON.stringify({ ...ragMeta, tipo: 'final_report', fases_analisadas: analisesAnteriores.length }),
    tokens_in, tokens_out, custo
  ])

  await distributeAnalysis(projetoFaseId, analise.id, parsed)

  progress('done')
  return { analiseId: analise.id, versao: novaVersao, score: parsed.score, tipo: 'final_report' }
}

export async function runAnalysis({ projetoFaseId, leadId, fase, onProgress }) {
  const progress = (step, data = {}) => {
    try { onProgress?.({ step, ...data }) } catch { /* silencioso */ }
  }

  progress('fetching_kommo')
  const customFields = await getLeadCustomFields(leadId)
  const links = extractPhaseLinks(customFields, fase)

  progress('extracting_content', { total: Object.keys(links).length })
  const materials = {}
  for (const [plataforma, url] of Object.entries(links)) {
    try {
      const extracao = await getOrExtract(leadId, fase, plataforma, url)
      // Passa o JSON bruto — IA interpreta o shape especifico de cada plataforma
      materials[plataforma] = extracao.raw || extracao.conteudo_full || ''
    } catch (err) {
      materials[plataforma] = { error: `falha extracao: ${err.message}`, url }
    }
  }

  progress('building_rag')
  const queryText = Object.values(materials).join('\n').slice(0, 3000)
  const { context: ragContext, metadata: ragMeta } = await buildRagContext({
    projetoFaseId, fase, queryText, leadId
  })

  progress('calling_ia')
  // Formata cada plataforma como bloco JSON/texto — a IA reconhece o shape
  const materialContent = Object.entries(materials)
    .map(([plataforma, v]) => {
      const payload = typeof v === 'string' ? v : JSON.stringify(v, null, 2)
      return `### Plataforma: ${plataforma}\n\`\`\`json\n${payload}\n\`\`\``
    }).join('\n\n')
  const parsed = await analyzeText(materialContent, ragContext)

  progress('persisting')
  const { rows: [{ max_versao }] } = await pool.query(
    `SELECT COALESCE(MAX(versao), 0) AS max_versao FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $1`,
    [projetoFaseId]
  )
  const novaVersao = max_versao + 1
  const tokens_in = parsed.tokens_input || 0
  const tokens_out = parsed.tokens_output || 0
  const cfg = await getActiveProviderConfig()
  const priceIn = Number(cfg.price_in_per_mtok) || 0.75
  const priceOut = Number(cfg.price_out_per_mtok) || 4.5
  const custo = (tokens_in * priceIn + tokens_out * priceOut) / 1_000_000
  const modeloUsado = `${parsed._provider}:${parsed._model}`

  // status_avaliacao: vem da IA. Fallback: se score nulo ou veredicto sugere insufici, marca incompleta
  let statusAvaliacao = parsed.status_avaliacao || 'completa'
  if (!['completa', 'parcial', 'incompleta'].includes(statusAvaliacao)) {
    statusAvaliacao = 'completa'
  }
  if (parsed.score == null && statusAvaliacao === 'completa') {
    statusAvaliacao = 'incompleta'
  }
  const scoreFinal = statusAvaliacao === 'incompleta' ? null : parsed.score

  const { rows: [analise] } = await pool.query(`
    INSERT INTO dashboards_hub.tc_analises_ia
      (projeto_fase_id, versao, modelo_usado, score, veredicto, resumo, analise_materiais,
       percepcao_cliente, dores, oportunidades, riscos, recomendacoes, contexto_rag,
       tokens_input, tokens_output, custo_estimado, status_avaliacao)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id
  `, [
    projetoFaseId, novaVersao, modeloUsado,
    scoreFinal, parsed.veredicto, parsed.resumo, parsed.analise_materiais,
    JSON.stringify(parsed.percepcao_cliente || {}),
    JSON.stringify(parsed.dores || []),
    JSON.stringify(parsed.oportunidades || []),
    JSON.stringify(parsed.riscos || []),
    JSON.stringify(parsed.recomendacoes || []),
    JSON.stringify(ragMeta),
    tokens_in, tokens_out, custo,
    statusAvaliacao
  ])

  // Skip distribute (dores/oportunidades/riscos) quando incompleta — nao polui KPIs
  if (statusAvaliacao !== 'incompleta') {
    await distributeAnalysis(projetoFaseId, analise.id, parsed)
  }

  progress('embedding')
  try {
    const embText = `${parsed.resumo}\n${parsed.analise_materiais}`.slice(0, 6000)
    const embedding = await generateEmbedding(embText)
    if (embedding.length) {
      const vecLiteral = `[${embedding.join(',')}]`
      await pool.query(
        `INSERT INTO dashboards_hub.tc_embeddings (referencia_tipo, referencia_id, conteudo_texto, embedding, metadata)
         VALUES ('analise_ia', $1, $2, $3::vector, $4)`,
        [analise.id, embText, vecLiteral, JSON.stringify({ fase, projetoFaseId })]
      )
    }
  } catch (err) {
    // embedding falhou — nao bloqueia analise
  }

  progress('posting_note')
  try {
    const noteText = await generateNote(parsed)
    await updateLeadNote(leadId, noteText)
    await pool.query(
      `UPDATE dashboards_hub.tc_analises_ia SET nota_kommo = $1 WHERE id = $2`,
      [noteText, analise.id]
    )
  } catch (err) {
    // nota falhou — analise ja foi persistida
  }

  progress('done')
  return { analiseId: analise.id, versao: novaVersao, score: parsed.score }
}
