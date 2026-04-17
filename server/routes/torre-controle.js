import { Router } from 'express'
import pool from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { enqueueJob } from '../services/tc-job-worker.js'
import {
  createLead,
  getCustomFieldValue,
  CUSTOM_FIELD_IDS,
  STAGE_TO_FASE,
  STAGE_PRE_PROJETO,
  PIPELINE_SABER
} from '../services/kommo-client.js'
import { rodarSync, getSyncState } from '../services/kommo-sync.js'

const router = Router()
router.use(requireAuth)

function sessionRole(req) {
  return req.session?.user?.role || (req.session?.authenticated ? 'admin' : null)
}

function sessionUserId(req) {
  return req.session?.user?.id || null
}

const STAGE_PRE_PROJETO_ARRAY = [...STAGE_PRE_PROJETO]

// ──────────────────────────────────────────────────────────
// Sync endpoints
// ──────────────────────────────────────────────────────────

router.get('/status-atualizacao', async (req, res, next) => {
  try {
    const { ativo, estado } = await getSyncState()
    res.json({
      ativo,
      ultima_sync_iniciada: estado?.ultima_sync_iniciada,
      ultima_sync_concluida: estado?.ultima_sync_concluida,
      ultima_sync_erro: estado?.ultima_sync_erro,
      stats: estado ? {
        total: estado.leads_total,
        novos: estado.leads_novos,
        atualizados: estado.leads_atualizados,
        companies: estado.companies_total,
        duracao_ms: estado.duracao_ms
      } : null
    })
  } catch (err) { next(err) }
})

router.post('/atualizar', async (req, res, next) => {
  try {
    const force = req.body?.force === true
    // Fire-and-forget: dispara em background, retorna imediatamente
    rodarSync({ force }).catch(err => {
      console.error(`[${new Date().toISOString()}] [sync] falhou:`, err.message)
    })
    // Aguarda 200ms para o lock ser adquirido antes de retornar
    await new Promise(r => setTimeout(r, 200))
    const { ativo, estado } = await getSyncState()
    res.json({
      iniciado: ativo,
      mensagem: ativo ? 'Sincronizacao iniciada' : (estado?.ultima_sync_erro || 'Outra sincronizacao em andamento'),
      ativo
    })
  } catch (err) { next(err) }
})

// ──────────────────────────────────────────────────────────
// Matriz (le do DB)
// ──────────────────────────────────────────────────────────

router.get('/matriz', async (req, res, next) => {
  try {
    const role = sessionRole(req)
    const userId = sessionUserId(req)

    const fases = Object.entries(STAGE_TO_FASE).map(([stageId, info]) => ({
      id: parseInt(stageId, 10),
      nome: info.nome,
      ordem: info.ordem,
      slug: info.slug
    }))

    // Le todos os leads + companies + users do DB com JOIN
    const { rows } = await pool.query(`
      SELECT
        l.id, l.status_id, l.responsible_user_id, l.company_id,
        l.custom_fields, l.price, l.name AS lead_name,
        c.name AS company_name,
        u.name AS account_user_name
      FROM dashboards_hub.tc_kommo_leads l
      LEFT JOIN dashboards_hub.tc_kommo_companies c ON c.id = l.company_id
      LEFT JOIN dashboards_hub.tc_kommo_users u ON u.id = l.responsible_user_id
      WHERE l.pipeline_id = $1
        AND l.removed_from_kommo = false
        AND l.status_id <> 143
        AND l.status_id <> ALL($2::bigint[])
      ORDER BY c.name NULLS LAST, l.id
    `, [PIPELINE_SABER, STAGE_PRE_PROJETO_ARRAY])

    // Carrega analises por lead
    const leadIds = rows.map(r => String(r.id))
    const { rows: analises } = leadIds.length
      ? await pool.query(`
          SELECT DISTINCT ON (a.projeto_fase_id)
            a.projeto_fase_id, a.score, a.id AS analise_id, pf.id AS pf_id,
            a.status_avaliacao,
            c.id_externo AS lead_id, fc.ordem AS fase_ordem
          FROM dashboards_hub.tc_analises_ia a
          JOIN dashboards_hub.tc_projeto_fases pf ON pf.id = a.projeto_fase_id
          JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
          JOIN dashboards_hub.tc_clientes c ON c.id = p.cliente_id
          JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
          WHERE c.id_externo = ANY($1)
          ORDER BY a.projeto_fase_id, a.versao DESC
        `, [leadIds])
      : { rows: [] }

    // Mapa { lead_id: { ordem -> analise } }
    const analisePorLead = new Map()
    for (const a of analises) {
      if (!analisePorLead.has(a.lead_id)) analisePorLead.set(a.lead_id, {})
      analisePorLead.get(a.lead_id)[a.fase_ordem] = a
    }

    // Fase ordem -> stage_id
    const ordemToStage = {}
    for (const [stageId, info] of Object.entries(STAGE_TO_FASE)) {
      ordemToStage[info.ordem] = parseInt(stageId, 10)
    }

    const clientes = rows.map(lead => {
      const cf = lead.custom_fields || []
      const account = getCustomFieldValue(cf, CUSTOM_FIELD_IDS.ACCOUNT) || ''
      const squad = getCustomFieldValue(cf, CUSTOM_FIELD_IDS.SQUAD) || ''
      const coordenador = getCustomFieldValue(cf, CUSTOM_FIELD_IDS.COORDENADOR) || ''
      const tier = getCustomFieldValue(cf, 1989461) || ''
      const flag = getCustomFieldValue(cf, 1989972) || ''

      const analisesLead = analisePorLead.get(String(lead.id)) || {}
      const fasesDados = {}
      for (const f of fases) {
        const a = analisesLead[f.ordem]
        const score = a?.score != null ? Number(a.score) : null
        const incompleta = a?.status_avaliacao === 'incompleta'
        let statusCor = null
        if (a) {
          if (incompleta) statusCor = 'incompleta'
          else if (score == null) statusCor = null
          else statusCor = score >= 7 ? 'verde' : score >= 5 ? 'amarelo' : 'vermelho'
        }
        fasesDados[f.id] = {
          status_cor: statusCor,
          status_avaliacao: a?.status_avaliacao || null,
          score: incompleta ? null : score,
          analise_id: a?.analise_id || null,
          is_fase_atual: parseInt(lead.status_id, 10) === f.id
        }
      }

      const faseAtual = STAGE_TO_FASE[lead.status_id]
      return {
        id: Number(lead.id),
        lead_id: String(lead.id),
        company_id: lead.company_id ? Number(lead.company_id) : null,
        nome: lead.company_name || lead.lead_name || `Lead #${lead.id}`,
        account,
        squad,
        coordenador,
        tier,
        flag,
        responsible_user_id: lead.responsible_user_id ? Number(lead.responsible_user_id) : null,
        responsavel_kommo: lead.account_user_name || null,
        status_id: Number(lead.status_id),
        fase_atual: faseAtual?.nome || null,
        fase_atual_slug: faseAtual?.slug || null,
        fase_atual_stage_id: Number(lead.status_id),
        fase_atual_ordem: faseAtual?.ordem || 0,
        price: lead.price,
        fases: fasesDados,
        custom_fields: cf
      }
    })

    let visibles = clientes
    if (role !== 'admin' && role !== 'board') {
      if (!userId) {
        visibles = []
      } else {
        const { rows: userRow } = await pool.query(
          `SELECT kommo_user_id FROM dashboards_hub.users WHERE id = $1`,
          [userId]
        ).catch(() => ({ rows: [] }))
        const kommoUid = userRow?.[0]?.kommo_user_id
        visibles = kommoUid ? clientes.filter(c => c.responsible_user_id === Number(kommoUid)) : []
      }
    }

    res.json({ clientes: visibles, fases })
  } catch (err) { next(err) }
})

// ──────────────────────────────────────────────────────────
// Detalhe de fase (auto-cria projeto/fase no DB)
// ──────────────────────────────────────────────────────────

router.get('/cliente/:id/fase/:faseId', async (req, res, next) => {
  try {
    const leadId = String(req.params.id)
    const stageId = parseInt(req.params.faseId, 10)
    const stageInfo = STAGE_TO_FASE[stageId]
    if (!stageInfo) return res.status(400).json({ error: 'stage_id invalido' })

    // Le lead do DB
    const { rows: [lead] } = await pool.query(`
      SELECT l.*, c.name AS company_name
      FROM dashboards_hub.tc_kommo_leads l
      LEFT JOIN dashboards_hub.tc_kommo_companies c ON c.id = l.company_id
      WHERE l.id = $1
    `, [parseInt(leadId, 10)])
    if (!lead) return res.status(404).json({ error: 'lead nao encontrado no DB — atualize a sincronizacao' })

    const cf = lead.custom_fields || []
    const companyName = lead.company_name || lead.name || `Lead #${leadId}`
    const squad = getCustomFieldValue(cf, CUSTOM_FIELD_IDS.SQUAD)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(`
        INSERT INTO dashboards_hub.tc_clientes (id_externo, nome, ativo)
        VALUES ($1, $2, true)
        ON CONFLICT (id_externo) WHERE id_externo IS NOT NULL
        DO UPDATE SET nome = EXCLUDED.nome, updated_at = NOW()
      `, [leadId, companyName])
      const { rows: [{ id: clienteId }] } = await client.query(
        `SELECT id FROM dashboards_hub.tc_clientes WHERE id_externo = $1`,
        [leadId]
      )

      let squadId = null
      if (squad) {
        await client.query(
          `INSERT INTO dashboards_hub.tc_squads (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING`,
          [squad]
        )
        const { rows: [s] } = await client.query(
          `SELECT id FROM dashboards_hub.tc_squads WHERE nome = $1`, [squad]
        )
        squadId = s?.id || null
      }

      const { rows: [projExisting] } = await client.query(
        `SELECT id FROM dashboards_hub.tc_projetos WHERE cliente_id = $1 AND produto = 'saber' LIMIT 1`,
        [clienteId]
      )
      let projetoId = projExisting?.id
      if (!projetoId) {
        const { rows: [p] } = await client.query(`
          INSERT INTO dashboards_hub.tc_projetos (cliente_id, squad_id, produto, status)
          VALUES ($1, $2, 'saber', 'em_andamento') RETURNING id
        `, [clienteId, squadId])
        projetoId = p.id
      } else if (squadId) {
        await client.query(
          `UPDATE dashboards_hub.tc_projetos SET squad_id = $1, updated_at = NOW() WHERE id = $2`,
          [squadId, projetoId]
        )
      }

      const { rows: [fc] } = await client.query(
        `SELECT id, nome FROM dashboards_hub.tc_fases_config WHERE produto = 'saber' AND ordem = $1`,
        [stageInfo.ordem]
      )
      if (!fc) {
        await client.query('ROLLBACK')
        return res.status(500).json({ error: `fase ordem ${stageInfo.ordem} nao configurada em tc_fases_config` })
      }

      const { rows: [pfExisting] } = await client.query(
        `SELECT id FROM dashboards_hub.tc_projeto_fases WHERE projeto_id = $1 AND fase_config_id = $2`,
        [projetoId, fc.id]
      )
      let projetoFaseId = pfExisting?.id
      if (!projetoFaseId) {
        const { rows: [pf] } = await client.query(`
          INSERT INTO dashboards_hub.tc_projeto_fases (projeto_id, fase_config_id)
          VALUES ($1, $2) RETURNING id
        `, [projetoId, fc.id])
        projetoFaseId = pf.id
      }

      await client.query('COMMIT')

      const { rows: analises } = await pool.query(`
        SELECT * FROM dashboards_hub.tc_analises_ia
        WHERE projeto_fase_id = $1 ORDER BY versao DESC
      `, [projetoFaseId])

      res.json({
        fase: {
          id: projetoFaseId,
          projeto_id: projetoId,
          cliente_id: clienteId,
          lead_id: leadId,
          fase_nome: stageInfo.nome,
          fase_slug: stageInfo.slug,
          stage_id: stageId
        },
        analises
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) { next(err) }
})

// ──────────────────────────────────────────────────────────
// Analyzer endpoints
// ──────────────────────────────────────────────────────────

router.post('/analisar', async (req, res, next) => {
  try {
    const { projetoFaseId, leadId, fase } = req.body || {}
    if (!projetoFaseId || !leadId || !fase) {
      return res.status(400).json({ error: 'projetoFaseId, leadId e fase obrigatorios' })
    }
    const lockKey = `analyze:${leadId}:${fase}`
    const job = await enqueueJob({
      tipo: 'analyze_phase', leadId, lockKey,
      payload: { projetoFaseId, fase }
    })
    res.json({ jobId: job.id, status: job.status })
  } catch (err) { next(err) }
})

router.post('/analisar-final', async (req, res, next) => {
  try {
    const { projetoFaseId, leadId } = req.body || {}
    if (!projetoFaseId || !leadId) {
      return res.status(400).json({ error: 'projetoFaseId e leadId obrigatorios' })
    }
    const lockKey = `analyze-final:${leadId}`
    const job = await enqueueJob({
      tipo: 'analyze_final', leadId, lockKey,
      payload: { projetoFaseId }
    })
    res.json({ jobId: job.id, status: job.status })
  } catch (err) { next(err) }
})

router.post('/analisar-massa', async (req, res, next) => {
  try {
    const { items } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array obrigatorio' })
    }
    const job = await enqueueJob({
      tipo: 'analyze_bulk',
      lockKey: `bulk:${Date.now()}`,
      payload: { items }
    })
    res.json({ jobId: job.id, total: items.length })
  } catch (err) { next(err) }
})

router.get('/job/:id', async (req, res, next) => {
  try {
    const { rows: [job] } = await pool.query(
      `SELECT id, tipo, status, progresso, resultado, tentativas, created_at, updated_at
       FROM dashboards_hub.tc_jobs WHERE id = $1`,
      [req.params.id]
    )
    if (!job) return res.status(404).json({ error: 'job nao encontrado' })
    res.json(job)
  } catch (err) { next(err) }
})

router.post('/kommo/lead', async (req, res, next) => {
  try {
    const { pipelineId, statusId, ...leadData } = req.body || {}
    if (!pipelineId || !statusId) {
      return res.status(400).json({ error: 'pipelineId e statusId obrigatorios' })
    }
    const lead = await createLead(pipelineId, statusId, leadData)
    res.json({ lead })
  } catch (err) { next(err) }
})

// ──────────────────────────────────────────────────────────
// Painel Geral (le agregados do DB)
// ──────────────────────────────────────────────────────────

function agregarFinanceiro(leads) {
  const sum = (fid) => leads.reduce((a, l) => {
    const cf = l.custom_fields || []
    const v = cf.find(x => x.field_id === fid)?.values?.[0]?.value
    return a + (parseFloat(v) || 0)
  }, 0)
  const avg = (fid) => {
    const vals = leads
      .map(l => parseFloat((l.custom_fields || []).find(x => x.field_id === fid)?.values?.[0]?.value))
      .filter(n => !isNaN(n) && n > 0)
    return vals.length ? vals.reduce((a, b) => a + b) / vals.length : 0
  }
  return {
    receita_contratada: sum(1989767),
    ticket_medio: avg(1989908),
    lucro_liquido: sum(1989910),
    verba_trafego: sum(1989896)
  }
}

function agregarDistribuicao(leads) {
  const count = (fid) => {
    const m = new Map()
    for (const l of leads) {
      const cf = l.custom_fields || []
      const v = cf.find(x => x.field_id === fid)?.values?.[0]?.value
      if (!v) continue
      m.set(v, (m.get(v) || 0) + 1)
    }
    return [...m.entries()].map(([label, value]) => ({ label, value }))
  }
  return {
    tier:     count(1989461),
    canal:    count(1989435),
    flag:     count(1989972),
    urgencia: count(1989918)
  }
}

router.get('/painel-geral', async (req, res, next) => {
  try {
    const role = sessionRole(req)
    const userId = sessionUserId(req)

    // Le leads do DB para agregados Kommo
    const { rows: kommoLeads } = await pool.query(`
      SELECT custom_fields FROM dashboards_hub.tc_kommo_leads
      WHERE pipeline_id = $1
        AND removed_from_kommo = false
        AND status_id <> 143
        AND status_id <> ALL($2::bigint[])
    `, [PIPELINE_SABER, STAGE_PRE_PROJETO_ARRAY])

    const financeiro = agregarFinanceiro(kommoLeads)
    const distribuicao = agregarDistribuicao(kommoLeads)

    // Visibilidade de tc_clientes (DB local)
    let ids = []
    if (role === 'admin' || role === 'board') {
      const r = await pool.query('SELECT id FROM dashboards_hub.tc_clientes WHERE ativo = true')
      ids = r.rows.map(x => x.id)
    } else if (userId) {
      const r = await pool.query(
        `SELECT cliente_id AS id FROM dashboards_hub.tc_usuario_clientes WHERE user_id = $1`,
        [userId]
      )
      ids = r.rows.map(x => x.id)
    }

    if (ids.length === 0) {
      return res.json({ ...emptyPainel(), financeiro, distribuicao })
    }

    const scorecards = await pool.query(`
      SELECT
        COUNT(DISTINCT c.id) AS clientes_ativos,
        ROUND(AVG(a.score)::numeric, 1) AS score_medio,
        COUNT(DISTINCT c.id) FILTER (WHERE a.score < 5) AS em_risco,
        COALESCE(SUM(o.valor_estimado) FILTER (WHERE o.status IN ('identificada','qualificada')), 0) AS oportunidades_brl,
        ROUND(
          100.0 * COUNT(DISTINCT a.projeto_fase_id) /
          NULLIF(COUNT(DISTINCT pf.id), 0)
        , 1) AS taxa_analise
      FROM dashboards_hub.tc_clientes c
      LEFT JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
      LEFT JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      LEFT JOIN dashboards_hub.tc_analises_ia a
        ON a.projeto_fase_id = pf.id
        AND COALESCE(a.status_avaliacao, 'completa') <> 'incompleta'
      LEFT JOIN dashboards_hub.tc_oportunidades o ON o.projeto_fase_id = pf.id
      WHERE c.id = ANY($1) AND c.ativo = true
    `, [ids])

    const churn = await pool.query(`
      SELECT c.id, c.nome, a.score, a.veredicto,
             (SELECT COUNT(*) FROM dashboards_hub.tc_insatisfacoes i
              WHERE i.projeto_fase_id = pf.id AND i.gravidade IN ('alta','critica')) AS dores_graves
      FROM dashboards_hub.tc_clientes c
      JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
      JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
      WHERE c.id = ANY($1)
        AND a.score < 6
        AND COALESCE(a.status_avaliacao, 'completa') <> 'incompleta'
      ORDER BY a.score ASC, dores_graves DESC
      LIMIT 50
    `, [ids])

    const oportunidades = await pool.query(`
      SELECT status, COUNT(*) AS total, COALESCE(SUM(valor_estimado), 0) AS valor
      FROM dashboards_hub.tc_oportunidades o
      JOIN dashboards_hub.tc_projeto_fases pf ON pf.id = o.projeto_fase_id
      JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
      WHERE p.cliente_id = ANY($1)
      GROUP BY status
    `, [ids])

    const heatmap = await pool.query(`
      SELECT fc.nome AS fase, pf.status_cor, COUNT(*) AS total
      FROM dashboards_hub.tc_projeto_fases pf
      JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
      JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
      WHERE p.cliente_id = ANY($1) AND pf.status_cor IS NOT NULL
      GROUP BY fc.nome, fc.ordem, pf.status_cor
      ORDER BY fc.ordem
    `, [ids])

    res.json({
      scorecards: scorecards.rows[0] || emptyPainel().scorecards,
      squads: [],
      churn: churn.rows,
      oportunidades: oportunidades.rows,
      heatmap: heatmap.rows,
      financeiro,
      distribuicao
    })
  } catch (err) { next(err) }
})

// ──────────────────────────────────────────────────────────
// Colaboradores (Accounts agregados do DB)
// ──────────────────────────────────────────────────────────

router.get('/colaboradores', async (req, res, next) => {
  try {
    if (!['admin', 'board'].includes(sessionRole(req))) {
      return res.status(403).json({ error: 'somente admin/board' })
    }

    // Lista accounts agregando leads + analises do DB
    const { rows } = await pool.query(`
      SELECT
        u.id AS kommo_user_id,
        u.name,
        u.email,
        COUNT(DISTINCT l.id) AS total_clientes,
        COUNT(DISTINCT l.id) FILTER (WHERE EXISTS (
          SELECT 1 FROM dashboards_hub.tc_clientes c
          JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
          JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
          JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
          WHERE c.id_externo = l.id::text
        )) AS clientes_com_analise,
        ROUND(AVG(a.score)::numeric, 1) AS score_medio,
        COUNT(DISTINCT l.id) FILTER (WHERE a.score < 5) AS clientes_risco
      FROM dashboards_hub.tc_kommo_users u
      LEFT JOIN dashboards_hub.tc_kommo_leads l
        ON l.responsible_user_id = u.id
        AND l.pipeline_id = $1
        AND l.removed_from_kommo = false
        AND l.status_id <> 143
        AND l.status_id <> ALL($2::bigint[])
      LEFT JOIN dashboards_hub.tc_clientes c ON c.id_externo = l.id::text
      LEFT JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
      LEFT JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      LEFT JOIN dashboards_hub.tc_analises_ia a
        ON a.projeto_fase_id = pf.id
        AND COALESCE(a.status_avaliacao, 'completa') <> 'incompleta'
      WHERE u.id IS NOT NULL
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(DISTINCT l.id) > 0
      ORDER BY score_medio ASC NULLS LAST, total_clientes DESC
    `, [PIPELINE_SABER, STAGE_PRE_PROJETO_ARRAY])

    // Cache de analise IA semanal
    const colaboradores = []
    for (const r of rows) {
      const { rows: [cache] } = await pool.query(`
        SELECT periodo, pontos_fortes, pontos_atencao, recomendacoes, distribuicao
        FROM dashboards_hub.tc_analise_colaboradores
        WHERE kommo_user_id = $1
        ORDER BY periodo DESC LIMIT 1
      `, [r.kommo_user_id]).catch(() => ({ rows: [] }))

      colaboradores.push({
        id: Number(r.kommo_user_id),
        kommo_user_id: Number(r.kommo_user_id),
        name: r.name,
        email: r.email,
        total_clientes: Number(r.total_clientes) || 0,
        clientes_com_analise: Number(r.clientes_com_analise) || 0,
        score_medio: r.score_medio !== null ? Number(r.score_medio) : null,
        clientes_risco: Number(r.clientes_risco) || 0,
        pontos_fortes: cache?.pontos_fortes || [],
        pontos_atencao: cache?.pontos_atencao || [],
        recomendacoes: cache?.recomendacoes || [],
        distribuicao: cache?.distribuicao || {},
        periodo: cache?.periodo || null
      })
    }

    res.json({ colaboradores })
  } catch (err) { next(err) }
})

function emptyPainel() {
  return {
    scorecards: { clientes_ativos: 0, score_medio: null, em_risco: 0, oportunidades_brl: 0, taxa_analise: 0 },
    squads: [], churn: [], oportunidades: [], heatmap: []
  }
}

// ──────────────────────────────────────────────────────────
// Lead Notes — anotacoes humanas que alimentam o RAG
// ──────────────────────────────────────────────────────────

const TIPOS_VALIDOS = ['observacao', 'insight', 'decisao', 'acao', 'risco', 'contexto-cliente']

router.get('/lead/:leadId/notes', async (req, res, next) => {
  try {
    const leadId = parseInt(req.params.leadId, 10)
    if (!leadId) return res.status(400).json({ error: 'leadId invalido' })
    const { rows } = await pool.query(`
      SELECT n.*, u.name AS author_user_name
      FROM dashboards_hub.tc_lead_notes n
      LEFT JOIN dashboards_hub.users u ON u.id = n.author_user_id
      WHERE n.lead_id = $1
      ORDER BY n.pinned DESC, n.created_at DESC
    `, [leadId])
    res.json({ notes: rows })
  } catch (err) { next(err) }
})

router.post('/lead/:leadId/notes', async (req, res, next) => {
  try {
    const leadId = parseInt(req.params.leadId, 10)
    if (!leadId) return res.status(400).json({ error: 'leadId invalido' })
    const { conteudo, tipo = 'observacao', fase_ordem = null, importante = false, pinned = false } = req.body || {}
    if (!conteudo || !String(conteudo).trim()) {
      return res.status(400).json({ error: 'conteudo obrigatorio' })
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: 'tipo invalido' })
    }
    const userId = sessionUserId(req)
    const userName = req.session?.user?.name || 'Anonimo'
    const { rows: [note] } = await pool.query(`
      INSERT INTO dashboards_hub.tc_lead_notes
        (lead_id, author_user_id, author_name, tipo, conteudo, fase_ordem, importante, pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [leadId, userId, userName, tipo, String(conteudo).trim(), fase_ordem, !!importante, !!pinned])
    res.json({ note })
  } catch (err) { next(err) }
})

router.patch('/lead/:leadId/notes/:noteId', async (req, res, next) => {
  try {
    const noteId = parseInt(req.params.noteId, 10)
    const userId = sessionUserId(req)
    const role = sessionRole(req)
    const isAdmin = ['admin', 'board'].includes(role)

    const { rows: [existing] } = await pool.query(
      `SELECT * FROM dashboards_hub.tc_lead_notes WHERE id = $1`, [noteId]
    )
    if (!existing) return res.status(404).json({ error: 'note nao encontrada' })
    if (!isAdmin && existing.author_user_id !== userId) {
      return res.status(403).json({ error: 'sem permissao' })
    }

    const { conteudo, tipo, importante, pinned } = req.body || {}
    const newConteudo = conteudo != null ? String(conteudo).trim() : existing.conteudo
    const newTipo = tipo && TIPOS_VALIDOS.includes(tipo) ? tipo : existing.tipo
    const newImp = importante != null ? !!importante : existing.importante
    const newPin = pinned != null ? !!pinned : existing.pinned

    const { rows: [note] } = await pool.query(`
      UPDATE dashboards_hub.tc_lead_notes
      SET conteudo = $1, tipo = $2, importante = $3, pinned = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [newConteudo, newTipo, newImp, newPin, noteId])
    res.json({ note })
  } catch (err) { next(err) }
})

router.delete('/lead/:leadId/notes/:noteId', async (req, res, next) => {
  try {
    const noteId = parseInt(req.params.noteId, 10)
    const userId = sessionUserId(req)
    const role = sessionRole(req)
    const isAdmin = ['admin', 'board'].includes(role)

    const { rows: [existing] } = await pool.query(
      `SELECT author_user_id FROM dashboards_hub.tc_lead_notes WHERE id = $1`, [noteId]
    )
    if (!existing) return res.status(404).json({ error: 'note nao encontrada' })
    if (!isAdmin && existing.author_user_id !== userId) {
      return res.status(403).json({ error: 'sem permissao' })
    }
    await pool.query(`DELETE FROM dashboards_hub.tc_lead_notes WHERE id = $1`, [noteId])
    res.json({ deleted: true })
  } catch (err) { next(err) }
})

export default router
