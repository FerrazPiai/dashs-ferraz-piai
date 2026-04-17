// Analise semanal de colaboradores — domingo 03:00 BRT (configuravel via COLLAB_ANALYSIS_CRON).
// Polling 60s verifica se e hora de rodar. Simples, sem dependencia extra de lib cron.
import pool from '../lib/db.js'
import { analyzeCollaborator, getActiveProviderConfig } from '../services/ai-client.js'

const CRON_EXPR = process.env.COLLAB_ANALYSIS_CRON || '0 3 * * 0'
let lastRunKey = null // evita rodar multiplas vezes no mesmo minuto

function shouldRunNow() {
  const parts = CRON_EXPR.split(/\s+/)
  if (parts.length < 5) return false
  const [min, hour, , , dow] = parts
  const now = new Date()
  const utcHourForBrt3am = (parseInt(hour, 10) + 3) % 24 // BRT (UTC-3) -> UTC
  const match =
    now.getUTCMinutes() === parseInt(min, 10) &&
    now.getUTCHours() === utcHourForBrt3am &&
    now.getUTCDay() === parseInt(dow, 10)

  if (!match) return false
  const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`
  if (lastRunKey === key) return false
  lastRunKey = key
  return true
}

export async function runWeeklyAnalysis() {
  const periodo = new Date().toISOString().slice(0, 10)
  const { rows: users } = await pool.query(`
    SELECT DISTINCT u.id, u.name, u.email
    FROM dashboards_hub.users u
    JOIN dashboards_hub.tc_usuario_clientes uc ON uc.user_id = u.id
    WHERE u.active = true
  `)
  for (const u of users) {
    try {
      const { rows: [agg] } = await pool.query(`
        SELECT
          ROUND(AVG(a.score)::numeric, 1) AS score_medio,
          COUNT(DISTINCT c.id) AS total_clientes,
          COUNT(DISTINCT c.id) FILTER (WHERE a.score < 5) AS clientes_risco,
          json_agg(json_build_object(
            'cliente', c.nome, 'score', a.score, 'resumo', a.resumo
          )) AS clientes_data
        FROM dashboards_hub.tc_usuario_clientes uc
        JOIN dashboards_hub.tc_clientes c ON c.id = uc.cliente_id
        JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
        JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
        JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
        WHERE uc.user_id = $1
      `, [u.id])

      if (!agg || !agg.total_clientes) continue

      const analise = await analyzeCollaborator({
        usuario: u.name, email: u.email, ...agg
      })

      const cfg = await getActiveProviderConfig()
      const modeloUsado = process.env.COLLAB_ANALYSIS_MODEL
        || `${cfg.provider}:${cfg.model_coordinator || cfg.model_analysis}`

      await pool.query(`
        INSERT INTO dashboards_hub.tc_analise_colaboradores
          (user_id, periodo, score_medio, total_clientes, clientes_risco,
           pontos_fortes, pontos_atencao, recomendacoes, distribuicao, modelo_usado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, periodo) DO UPDATE SET
          score_medio = EXCLUDED.score_medio,
          pontos_fortes = EXCLUDED.pontos_fortes,
          pontos_atencao = EXCLUDED.pontos_atencao,
          recomendacoes = EXCLUDED.recomendacoes,
          distribuicao = EXCLUDED.distribuicao
      `, [
        u.id, periodo, agg.score_medio, agg.total_clientes, agg.clientes_risco,
        JSON.stringify(analise.pontos_fortes || []),
        JSON.stringify(analise.pontos_atencao || []),
        JSON.stringify(analise.recomendacoes || []),
        JSON.stringify(analise.distribuicao || {}),
        modeloUsado
      ])
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [collab-cron] user ${u.id}:`, err.message)
    }
  }
}

export function startCollaboratorCron() {
  setInterval(async () => {
    if (shouldRunNow()) {
      console.log(`[${new Date().toISOString()}] [collab-cron] iniciando analise semanal`)
      try { await runWeeklyAnalysis() }
      catch (err) { console.error('[collab-cron] fatal:', err.message) }
    }
  }, 60000)
}
