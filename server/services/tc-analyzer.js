// TC Analyzer — orquestra Kommo -> n8n extract -> RAG -> OpenAI -> persist -> embed -> Kommo note
import crypto from 'node:crypto'
import pool from '../lib/db.js'
import { getLeadCustomFields, extractPhaseLinks, updateLeadNote, getKommoCatalogos } from './kommo-client.js'
import { analyzeText, generateNote, getActiveProviderConfig } from './ai-client.js'
import { generateEmbedding, countTokens } from './openai-client.js'
import { buildRagContext } from './rag-engine.js'
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'
import bus from './event-bus.js'
import { dispatchExtractor } from './extractors/index.js'
import { GoogleReauthRequiredError } from './google-oauth.js'

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

async function getOrExtract(leadId, fase, plataforma, url, opts = {}) {
  const existing = await pool.query(
    `SELECT conteudo_full, conteudo_medium, conteudo_short, hash_conteudo
     FROM dashboards_hub.tc_extracoes
     WHERE lead_id = $1 AND url_origem = $2`,
    [leadId, url]
  )
  if (existing.rows[0]) return existing.rows[0]

  // Roteia via dispatcher (feature flag INTERNAL_EXTRACTORS) com fallback n8n.
  // Extratores internos retornam { texto, imagens, erros, _meta }; o shape da
  // versao n8n eh outro (data[]) — IA recebe ambos como JSON e interpreta.
  const extracted = await dispatchExtractor(plataforma, url, {
    userId: opts.userId || null,
    fallbackN8n: extractViaN8n
  })
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
  // Historico com dados brutos (nao so resumo) para IA calcular deltas
  const historicoFases = analisesAnteriores.map(a => ({
    fase: a.fase,
    score: a.score,
    veredicto: a.veredicto,
    resumo: a.resumo,
    dores: a.dores,
    oportunidades: a.oportunidades,
    riscos: a.riscos
  }))

  const catalogos = getKommoCatalogos()

  const systemPrompt = `Voce e um auditor senior da V4 Company encerrando um projeto do pipeline Saber.
Gere o RELATORIO FINAL CONSOLIDADO avaliando a jornada completa do cliente em 3 eixos:
AVANCO DO CLIENTE, QUALIDADE DO TIME, OPORTUNIDADES DE EXPANSAO.

Retorne JSON valido com os seguintes campos:

- score: number 0-10 (media ponderada final do projeto)
- veredicto: string curto (max 180 chars, ex: "Projeto de sucesso com upsell claro")
- resumo: string (texto executivo da jornada completa)
- analise_materiais: string (o que foi entregue em cada fase)
- percepcao_cliente: objeto com scores 0-10 para cada dimensao (como o cliente SE VE e AGE ao longo do projeto):
    { tom, engajamento, confianca, abertura_mudanca, clareza_objetivos, maturidade_digital, disposicao_investir, velocidade_decisao }
- dores: array de { descricao, gravidade } (dores RESIDUAIS pos-projeto)
- riscos: array de { descricao, tipo, probabilidade, impacto } (risco de churn)
- recomendacoes: array de { descricao, tipo, prioridade } (proximos passos)

- avanco: {
    evolucao: string (texto narrativo da evolucao fase a fase),
    fases: array de { fase, score, delta, veredicto_curto } (uma entry por fase analisada; delta = score - score_fase_anterior; veredicto_curto max 80 chars),
    tendencia: "ascendente" | "estavel" | "descendente",
    score_inicial: number (score da fase 1),
    score_final: number (score medio das fases auditadas)
  }

- qualidade_time: {
    score: number 0-10 (media ponderada das dimensoes abaixo),
    squad_nome: string (do contexto Kommo),
    dimensoes: objeto com scores 0-10 (como o TIME executou o projeto):
      {
        exploracao_dor: number,        // quao bem o time entendeu e aprofundou as dores do cliente
        empatia_atencao: number,       // atencao, cuidado, acompanhamento humano com o cliente
        clareza_comunicacao: number,   // clareza dos diagnosticos, apresentacoes, reunioes
        aderencia_metodologia: number, // quanto seguiu o playbook Saber (entregaveis, prazos, estrutura)
        proatividade: number,          // antecipou problemas, levou solucoes sem esperar direcionamento
        qualidade_entregaveis: number  // qualidade tecnica e visual de slides, docs, gravacoes
      },
    pontos_fortes: array de strings (2-5 bullets curtos),
    pontos_atencao: array de strings (2-5 bullets curtos),
    observacao: string (1-3 frases sobre desempenho geral do time)
  }

- pontos_positivos: array de strings (3-6 destaques POSITIVOS do projeto inteiro — entregas de qualidade, marcos atingidos, evolucao do cliente)
- pontos_negativos: array de strings (3-6 destaques NEGATIVOS do projeto inteiro — gaps, atrasos, baixa aderencia, riscos mitigados ou nao)

- oportunidades: array de {
    titulo: string,
    descricao: string,
    valor_estimado: number (R$),
    probabilidade_fechamento: number 0-100 (% aderencia — baseie-se em dores alinhadas, score crescente, perfil DISC, budget aparente),
    justificativa: string (2-4 frases claras explicando POR QUE esse produto faz sentido para ESSE cliente),
    kommo_produto_id: number (escolha SEMPRE um id que esta no catalogos.produtos fornecido),
    kommo_categoria_id: number (escolha SEMPRE um id de catalogos.categorias),
    kommo_solucao_id: number ou null (escolha de catalogos.solucoes, ou null se nenhum encaixa)
  }

REGRAS:
- Se kommo_produto_id nao existir no catalogo, OMITA a oportunidade inteira.
- Se nao houver fases analisadas, retorne avanco.fases = [] e qualidade_time.observacao explicando.
- veredicto_curto das fases <= 80 chars. veredicto global <= 180 chars.

Responda APENAS JSON valido, sem markdown.`

  const userPrompt = `## Contexto do Cliente\n${JSON.stringify(ragContext)}

## Historico de Fases Auditadas (dados brutos)
${JSON.stringify(historicoFases)}

## Catalogos Kommo para mapeamento de oportunidades
${JSON.stringify(catalogos)}`

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
  const modeloUsado = `${parsed._provider}:${parsed._model} (final)`.slice(0, 100)
  const veredictoTrunc = (parsed.veredicto || '').slice(0, 200)

  // Consolidado: novos eixos da Analise Consolidada (avanco + qualidade_time + pontos)
  const consolidado = {
    avanco: parsed.avanco || null,
    qualidade_time: parsed.qualidade_time || null,
    pontos_positivos: Array.isArray(parsed.pontos_positivos) ? parsed.pontos_positivos : [],
    pontos_negativos: Array.isArray(parsed.pontos_negativos) ? parsed.pontos_negativos : []
  }

  const { rows: [analise] } = await pool.query(`
    INSERT INTO dashboards_hub.tc_analises_ia
      (projeto_fase_id, versao, modelo_usado, score, veredicto, resumo, analise_materiais,
       percepcao_cliente, dores, oportunidades, riscos, recomendacoes, contexto_rag,
       tokens_input, tokens_output, custo_estimado, consolidado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING id
  `, [
    projetoFaseId, novaVersao, modeloUsado,
    parsed.score, veredictoTrunc, parsed.resumo, parsed.analise_materiais,
    JSON.stringify(parsed.percepcao_cliente || {}),
    JSON.stringify(parsed.dores || []),
    JSON.stringify(parsed.oportunidades || []),
    JSON.stringify(parsed.riscos || []),
    JSON.stringify(parsed.recomendacoes || []),
    JSON.stringify({ ...ragMeta, tipo: 'final_report', fases_analisadas: analisesAnteriores.length }),
    tokens_in, tokens_out, custo,
    JSON.stringify(consolidado)
  ])

  await distributeAnalysis(projetoFaseId, analise.id, parsed)

  progress('done')
  return { analiseId: analise.id, versao: novaVersao, score: parsed.score, tipo: 'final_report' }
}

export async function runAnalysis({ projetoFaseId, leadId, fase, onProgress, userId }) {
  const progress = (step, data = {}) => {
    try { onProgress?.({ step, ...data }) } catch { /* silencioso */ }
  }

  progress('fetching_kommo')
  const customFields = await getLeadCustomFields(leadId)
  const links = extractPhaseLinks(customFields, fase)

  const EXTRACTION_WAIT_MS = parseInt(process.env.TC_EXTRACTION_WAIT_MS || '1500', 10)
  const entries = Object.entries(links)
  progress('extracting_content', { total: entries.length })
  const materials = {}
  // Hub inteligente: cada falha e capturada, nao aborta o pipeline.
  // Transcricao e a fonte PRINCIPAL — se houver transcricao ok, a analise sempre prossegue.
  const extractionReport = { success: [], failed: [], hasTranscricao: false }
  // D-04: se um extrator interno Google lancar GoogleReauthRequiredError no meio do loop,
  // capturamos aqui e marcamos a analise como incompleta + erro_code='google_reauth_required'.
  let reauthRequired = null
  for (let i = 0; i < entries.length; i++) {
    const [plataforma, url] = entries[i]
    try {
      const extracao = await getOrExtract(leadId, fase, plataforma, url, { userId })
      // Passa o JSON bruto — IA interpreta o shape especifico de cada plataforma
      materials[plataforma] = extracao.raw || extracao.conteudo_full || ''
      extractionReport.success.push(plataforma)
      if (plataforma === 'transcricao') extractionReport.hasTranscricao = true
      // Detecta transcricao embarcada em outras plataformas (ex: reuniao com whisper/transcript)
      const raw = extracao.raw
      if (!extractionReport.hasTranscricao && raw && typeof raw === 'object') {
        const s = JSON.stringify(raw).toLowerCase()
        if (s.includes('transcript') && s.length > 500) extractionReport.hasTranscricao = true
      }
    } catch (err) {
      // D-04: token Google revogado/expirado — interrompe loop e marca analise incompleta
      if (err instanceof GoogleReauthRequiredError) {
        reauthRequired = err
        console.error(`[${new Date().toISOString()}] [tc-analyzer] GoogleReauthRequiredError em ${plataforma} (user ${err.userId}) — interrompendo loop`)
        break
      }
      const msg = err?.message || String(err)
      materials[plataforma] = { error: `falha extracao: ${msg}`, url, plataforma }
      extractionReport.failed.push({ plataforma, motivo: msg, url })
      console.warn(`[${new Date().toISOString()}] [tc-analyzer] extracao falhou: ${plataforma} -> ${msg} (prosseguindo com demais materiais)`)
    }
    // Pausa entre extracoes (exceto na ultima) — evita rate-limit e race conditions
    if (i < entries.length - 1) {
      progress('extracting_content', { current: i + 1, total: entries.length, waiting: true })
      await new Promise(r => setTimeout(r, EXTRACTION_WAIT_MS))
    }
  }
  progress('extracting_content', {
    total: entries.length,
    success: extractionReport.success.length,
    failed: extractionReport.failed.length,
    hasTranscricao: extractionReport.hasTranscricao
  })

  // D-04: fail-mark mid-job quando token Google expirou — persiste analise incompleta
  // com erro_code='google_reauth_required' e retorna; frontend ativa banner de reauth.
  if (reauthRequired) {
    const { rows: [{ max_versao }] } = await pool.query(
      `SELECT COALESCE(MAX(versao), 0) AS max_versao FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $1`,
      [projetoFaseId]
    )
    const novaVersao = max_versao + 1
    const { rows: [analise] } = await pool.query(`
      INSERT INTO dashboards_hub.tc_analises_ia
        (projeto_fase_id, versao, modelo_usado, status_avaliacao, erro_code, erro_mensagem, contexto_rag)
      VALUES ($1, $2, $3, 'incompleta', 'google_reauth_required', $4, $5)
      RETURNING id
    `, [
      projetoFaseId,
      novaVersao,
      'n/a (reauth_required)',
      String(reauthRequired.message || '').slice(0, 1000),
      JSON.stringify({ reauth_user_id: reauthRequired.userId, reason: reauthRequired.reason || null })
    ])
    console.error(`[${new Date().toISOString()}] [tc-analyzer] Analise ${analise.id} marcada incompleta: google_reauth_required (user ${reauthRequired.userId})`)
    progress('done', { incompleta: true, erro_code: 'google_reauth_required' })
    return { analiseId: analise.id, versao: novaVersao, status: 'incompleta', erro_code: 'google_reauth_required' }
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
  // Briefing para a IA sobre o estado da extracao — evita que ela marque 'incompleta'
  // quando na verdade ha material util (ex: transcricao ok, slides falharam).
  const extractionBriefing = `
## Estado da Extracao de Materiais
- Materiais extraidos com sucesso: ${extractionReport.success.length > 0 ? extractionReport.success.join(', ') : 'nenhum'}
- Materiais que falharam: ${extractionReport.failed.length > 0 ? extractionReport.failed.map(f => `${f.plataforma} (${f.motivo})`).join('; ') : 'nenhum'}
- Transcricao disponivel (FONTE PRINCIPAL): ${extractionReport.hasTranscricao ? 'SIM — use como fonte primaria' : 'NAO'}

REGRA: Se houver ao menos a transcricao ou material equivalente, GERE a analise (status_avaliacao = "parcial" ou "completa"). Mencione na recomendacoes quais materiais faltaram, mas NAO marque como "incompleta" se houver material util.
`
  const parsed = await analyzeText(materialContent + '\n\n' + extractionBriefing, ragContext)

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
  const modeloUsado = `${parsed._provider}:${parsed._model}`.slice(0, 100)
  const veredictoTrunc = (parsed.veredicto || '').slice(0, 200)
  if (parsed.veredicto && parsed.veredicto.length > 200) {
    console.warn(`[${new Date().toISOString()}] [tc-analyzer] veredicto truncado (${parsed.veredicto.length}>200)`)
  }

  // status_avaliacao: vem da IA, mas o hub aplica regras de supervisao.
  // Hub inteligente: se ha transcricao (fonte primaria) + score gerado, nunca marca 'incompleta'.
  let statusAvaliacao = parsed.status_avaliacao || 'completa'
  if (!['completa', 'parcial', 'incompleta'].includes(statusAvaliacao)) {
    statusAvaliacao = 'completa'
  }
  // Override #1: houve transcricao OK e a IA devolveu score — nunca incompleta.
  if (extractionReport.hasTranscricao && parsed.score != null && statusAvaliacao === 'incompleta') {
    console.warn(`[${new Date().toISOString()}] [tc-analyzer] IA marcou 'incompleta' mas ha transcricao + score — override para 'parcial'`)
    statusAvaliacao = 'parcial'
  }
  // Override #2: extracoes falharam mas ha sucesso parcial e score — sinaliza 'parcial'.
  if (statusAvaliacao === 'completa' && extractionReport.failed.length > 0 && extractionReport.success.length > 0) {
    statusAvaliacao = 'parcial'
  }
  // Fallback original: score nulo + IA disse 'completa' = contradiz, vira incompleta.
  if (parsed.score == null && statusAvaliacao === 'completa') {
    statusAvaliacao = 'incompleta'
  }
  // Override #3: nao ha NENHUM material extraido — realmente incompleta.
  if (extractionReport.success.length === 0) {
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
    scoreFinal, veredictoTrunc, parsed.resumo, parsed.analise_materiais,
    JSON.stringify(parsed.percepcao_cliente || {}),
    JSON.stringify(parsed.dores || []),
    JSON.stringify(parsed.oportunidades || []),
    JSON.stringify(parsed.riscos || []),
    JSON.stringify(parsed.recomendacoes || []),
    JSON.stringify({
      ...ragMeta,
      extractionReport: {
        success: extractionReport.success,
        failed: extractionReport.failed,
        hasTranscricao: extractionReport.hasTranscricao,
        totalEsperado: entries.length
      }
    }),
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

  // Posting automatico no CRM e OPT-IN via env var.
  // Default: NAO posta — usuario aprova manualmente atraves de acao explicita na UI.
  // Setar TC_AUTO_POST_KOMMO_NOTE=true para restaurar comportamento automatico.
  const autoPostEnabled = String(process.env.TC_AUTO_POST_KOMMO_NOTE || 'false').toLowerCase() === 'true'
  if (autoPostEnabled) {
    progress('posting_note')
    try {
      const noteText = await generateNote(parsed)
      await updateLeadNote(leadId, noteText)
      await pool.query(
        `UPDATE dashboards_hub.tc_analises_ia SET nota_kommo = $1 WHERE id = $2`,
        [noteText, analise.id]
      )
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] [tc-analyzer] posting_note falhou (nao-fatal): ${err.message}`)
    }
  } else {
    // Apenas gera o texto da nota e armazena no banco, sem enviar ao Kommo.
    // A UI pode acionar o post manualmente depois (endpoint separado a implementar).
    try {
      const noteText = await generateNote(parsed)
      await pool.query(
        `UPDATE dashboards_hub.tc_analises_ia SET nota_kommo = $1 WHERE id = $2`,
        [noteText, analise.id]
      )
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] [tc-analyzer] generateNote falhou (nao-fatal): ${err.message}`)
    }
  }

  // Emite evento de alerta se analise tem qualidade insuficiente OU materiais importantes faltaram.
  // Alert-dispatcher decide se envia mensagem (baseado em config + dedup).
  const failedPlatforms = (extractionReport.failed || []).map((f) => f.plataforma)
  const shouldAlert = statusAvaliacao === 'incompleta' || failedPlatforms.length > 0
  if (shouldAlert) {
    const motivos = []
    if (statusAvaliacao === 'incompleta') motivos.push('analise marcada como incompleta')
    if (failedPlatforms.length) motivos.push(`extracao falhou em: ${failedPlatforms.join(', ')}`)
    bus.emitSafe('analysis.bad_quality', {
      leadId,
      faseSlug: fase,
      faseNome: fase,
      analiseId: analise.id,
      missing: failedPlatforms,
      motivo: motivos.join(' · ')
    })
  }

  progress('done')
  return { analiseId: analise.id, versao: novaVersao, score: parsed.score }
}
