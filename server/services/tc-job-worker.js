// Postgres job queue processor. Roda no mesmo processo do Express.
import pool from '../lib/db.js'
import { runAnalysis, runFinalReport } from './tc-analyzer.js'

const POLL_INTERVAL = parseInt(process.env.JOB_POLL_INTERVAL || '3000', 10)
const BATCH_SIZE    = parseInt(process.env.JOB_BATCH_SIZE || '2', 10)
const MAX_RETRIES   = parseInt(process.env.JOB_MAX_RETRIES || '3', 10)
const LOCK_TTL_MS   = parseInt(process.env.JOB_LOCK_TTL_MS || '600000', 10)

let running = false
let stopRequested = false

async function pickJobs() {
  const { rows } = await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'processing', updated_at = NOW()
    WHERE id IN (
      SELECT id FROM dashboards_hub.tc_jobs
      WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    )
    RETURNING *
  `, [BATCH_SIZE])
  return rows
}

async function reviveStuck() {
  await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'pending', tentativas = tentativas + 1, updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - ($1 || ' milliseconds')::interval
      AND tentativas < $2
  `, [String(LOCK_TTL_MS), MAX_RETRIES])
  await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'failed', updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - ($1 || ' milliseconds')::interval
      AND tentativas >= $2
  `, [String(LOCK_TTL_MS), MAX_RETRIES])
}

async function updateProgress(jobId, progresso) {
  await pool.query(
    `UPDATE dashboards_hub.tc_jobs
     SET progresso = progresso || $1::jsonb, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(progresso), jobId]
  )
}

async function processJob(job) {
  const onProgress = (data) => updateProgress(job.id, data).catch(() => {})
  const projetoFaseId = job.progresso?.payload?.projetoFaseId || null
  try {
    let resultado
    if (job.tipo === 'analyze_phase') {
      const payload = job.progresso?.payload || {}
      resultado = await runAnalysis({
        projetoFaseId: payload.projetoFaseId,
        leadId: job.lead_id,
        fase: payload.fase,
        onProgress
      })
    } else if (job.tipo === 'analyze_final') {
      const payload = job.progresso?.payload || {}
      resultado = await runFinalReport({
        projetoFaseId: payload.projetoFaseId,
        leadId: job.lead_id,
        onProgress
      })
    } else if (job.tipo === 'analyze_bulk') {
      const items = job.progresso?.payload?.items || []
      for (const it of items) {
        const lockKey = `analyze:${it.leadId}:${it.fase}`
        await pool.query(`
          INSERT INTO dashboards_hub.tc_jobs (tipo, lead_id, lock_key, progresso)
          VALUES ('analyze_phase', $1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [it.leadId, lockKey, JSON.stringify({ payload: it })])
      }
      resultado = { fanout: items.length }
    } else {
      throw new Error(`tipo de job desconhecido: ${job.tipo}`)
    }

    await pool.query(
      `UPDATE dashboards_hub.tc_jobs
       SET status = 'completed', resultado = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(resultado), job.id]
    )

    // Sucesso: limpa ultima_falha da fase (se era analyze_phase/final)
    if (projetoFaseId && (job.tipo === 'analyze_phase' || job.tipo === 'analyze_final')) {
      await pool.query(
        `UPDATE dashboards_hub.tc_projeto_fases
         SET ultima_falha_em = NULL, ultima_falha_msg = NULL
         WHERE id = $1`,
        [projetoFaseId]
      ).catch(() => {})
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [worker] job ${job.id} falhou:`, err.message)
    const proxima = job.tentativas + 1 >= MAX_RETRIES ? 'failed' : 'pending'
    await pool.query(
      `UPDATE dashboards_hub.tc_jobs
       SET status = $1, tentativas = tentativas + 1,
           progresso = progresso || $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      [proxima, JSON.stringify({ ultimo_erro: err.message }), job.id]
    )

    // Persiste ultima_falha na fase para banner inline no SuperPainel
    if (projetoFaseId && (job.tipo === 'analyze_phase' || job.tipo === 'analyze_final')) {
      await pool.query(
        `UPDATE dashboards_hub.tc_projeto_fases
         SET ultima_falha_em = NOW(), ultima_falha_msg = $1
         WHERE id = $2`,
        [String(err.message || err).slice(0, 1000), projetoFaseId]
      ).catch(() => {})
    }
  }
}

async function tick() {
  if (stopRequested) return
  try {
    await reviveStuck()
    const jobs = await pickJobs()
    if (jobs.length > 0) {
      await Promise.all(jobs.map(processJob))
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [worker] tick error:`, err.message)
  }
}

export function startJobWorker() {
  if (running) return
  running = true
  stopRequested = false
  console.log(`[${new Date().toISOString()}] [worker] started — poll=${POLL_INTERVAL}ms batch=${BATCH_SIZE}`)
  const loop = async () => {
    while (!stopRequested) {
      await tick()
      await new Promise(r => setTimeout(r, POLL_INTERVAL))
    }
    running = false
  }
  loop()
}

export function stopJobWorker() {
  stopRequested = true
}

export async function enqueueJob({ tipo, leadId, lockKey, payload }) {
  const { rows } = await pool.query(`
    INSERT INTO dashboards_hub.tc_jobs (tipo, lead_id, lock_key, progresso)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT DO NOTHING
    RETURNING id, status
  `, [tipo, leadId || null, lockKey || null, JSON.stringify({ payload })])

  if (rows[0]) return rows[0]

  // Conflito — retorna o job ativo existente
  const { rows: existing } = await pool.query(`
    SELECT id, status FROM dashboards_hub.tc_jobs
    WHERE lock_key = $1 AND status IN ('pending','processing')
    ORDER BY created_at DESC LIMIT 1
  `, [lockKey])
  return existing[0] || { id: null, status: 'duplicate' }
}
