// kommo-sync.js — Sincroniza leads/companies/users do Kommo para o DB local.
// Usa lock em tc_sync_state para evitar execucoes concorrentes. Cron agendado.

import pool from '../lib/db.js'
import {
  getLeadsSaberCompleto,
  getKommoUsers,
  getCompaniesByIds,
  PIPELINE_SABER
} from './kommo-client.js'

const LOCK_TTL_MS = 10 * 60 * 1000 // 10min

// Tenta adquirir lock atomicamente — retorna true se conseguiu
async function adquirirLock() {
  const { rows } = await pool.query(`
    UPDATE dashboards_hub.tc_sync_state
    SET ultima_sync_iniciada = NOW(), ultima_sync_erro = NULL
    WHERE id = 1
      AND (
        ultima_sync_iniciada IS NULL
        OR ultima_sync_concluida IS NULL
        OR ultima_sync_concluida >= ultima_sync_iniciada
        OR ultima_sync_iniciada < NOW() - ($1 || ' milliseconds')::interval
      )
    RETURNING id
  `, [String(LOCK_TTL_MS)])
  return rows.length > 0
}

async function liberarLock(stats, erro) {
  await pool.query(`
    UPDATE dashboards_hub.tc_sync_state SET
      ultima_sync_concluida = NOW(),
      ultima_sync_erro = $1,
      leads_total = $2,
      leads_novos = $3,
      leads_atualizados = $4,
      companies_total = $5,
      duracao_ms = $6
    WHERE id = 1
  `, [
    erro || null,
    stats.total || 0,
    stats.novos || 0,
    stats.atualizados || 0,
    stats.companies || 0,
    stats.duracao || 0
  ])
}

// Consulta status atual (usado pelo frontend para polling)
export async function getSyncState() {
  const { rows: [s] } = await pool.query(`SELECT * FROM dashboards_hub.tc_sync_state WHERE id = 1`)
  if (!s) return { ativo: false, estado: null }
  const iniciada = s.ultima_sync_iniciada ? new Date(s.ultima_sync_iniciada).getTime() : 0
  const concluida = s.ultima_sync_concluida ? new Date(s.ultima_sync_concluida).getTime() : 0
  const agora = Date.now()
  const ativo = iniciada > 0 && concluida < iniciada && (agora - iniciada) < LOCK_TTL_MS
  return { ativo, estado: s }
}

export async function isSyncEmAndamento() {
  const r = await getSyncState()
  return r.ativo
}

// Roda sync completo (leads + companies + users)
export async function rodarSync({ force = false } = {}) {
  if (!force && (await isSyncEmAndamento())) {
    const err = new Error('sync ja em andamento')
    err.code = 'SYNC_ACTIVE'
    throw err
  }
  if (!(await adquirirLock())) {
    const err = new Error('nao foi possivel adquirir lock — outra sync ativa')
    err.code = 'LOCK_BUSY'
    throw err
  }

  const t0 = Date.now()
  const stats = { novos: 0, atualizados: 0, companies: 0, total: 0, duracao: 0 }

  try {
    const [leads, kommoUsers] = await Promise.all([
      getLeadsSaberCompleto(),
      getKommoUsers()
    ])
    const companyIds = [...new Set(
      leads.map(l => l._embedded?.companies?.[0]?.id).filter(Boolean)
    )]
    const companies = await getCompaniesByIds(companyIds)
    stats.companies = companies.length
    stats.total = leads.length

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Users
      for (const u of kommoUsers) {
        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_users (id, name, email, raw, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `, [u.id, u.name || null, u.email || null, JSON.stringify(u)])
      }

      // Companies
      for (const c of companies) {
        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_companies (id, name, responsible_user_id, custom_fields, raw, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            responsible_user_id = EXCLUDED.responsible_user_id,
            custom_fields = EXCLUDED.custom_fields,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `, [
          c.id,
          c.name || '(sem nome)',
          c.responsible_user_id || null,
          JSON.stringify(c.custom_fields_values || []),
          JSON.stringify(c)
        ])
      }

      // Leads — conta novos vs atualizados via SELECT prévio
      for (const l of leads) {
        const companyId = l._embedded?.companies?.[0]?.id || null
        const exist = await client.query(
          `SELECT 1 FROM dashboards_hub.tc_kommo_leads WHERE id = $1`,
          [l.id]
        )
        const isNovo = exist.rows.length === 0

        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_leads
            (id, company_id, pipeline_id, status_id, name, price, responsible_user_id,
             custom_fields, raw, removed_from_kommo, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
          ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            status_id = EXCLUDED.status_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            responsible_user_id = EXCLUDED.responsible_user_id,
            custom_fields = EXCLUDED.custom_fields,
            raw = EXCLUDED.raw,
            removed_from_kommo = false,
            updated_at = NOW()
        `, [
          l.id,
          companyId,
          l.pipeline_id || PIPELINE_SABER,
          l.status_id,
          l.name || null,
          l.price || null,
          l.responsible_user_id || null,
          JSON.stringify(l.custom_fields_values || []),
          JSON.stringify(l)
        ])

        if (isNovo) stats.novos++
        else stats.atualizados++
      }

      // Soft-delete: marca leads sumidos do Kommo como removed
      const idsAtuais = leads.map(l => l.id)
      if (idsAtuais.length > 0) {
        await client.query(`
          UPDATE dashboards_hub.tc_kommo_leads
          SET removed_from_kommo = true, updated_at = NOW()
          WHERE pipeline_id = $1
            AND id <> ALL($2::bigint[])
            AND removed_from_kommo = false
        `, [PIPELINE_SABER, idsAtuais])
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    stats.duracao = Date.now() - t0
    await liberarLock(stats, null)
    return stats
  } catch (err) {
    stats.duracao = Date.now() - t0
    try { await liberarLock(stats, err.message) } catch {}
    throw err
  }
}

// Cron: chama a cada N minutos (default 60)
let _cronInterval = null
export function startSyncCron() {
  if (_cronInterval) return
  const minutos = parseInt(process.env.TC_SYNC_CRON_MINUTES || '60', 10)
  if (minutos <= 0) {
    console.log(`[${new Date().toISOString()}] [kommo-sync] cron desativado (TC_SYNC_CRON_MINUTES=${minutos})`)
    return
  }
  console.log(`[${new Date().toISOString()}] [kommo-sync] cron ativo: cada ${minutos}min`)
  _cronInterval = setInterval(async () => {
    try {
      const stats = await rodarSync()
      console.log(`[${new Date().toISOString()}] [kommo-sync] auto-sync ok:`, stats)
    } catch (err) {
      if (err.code !== 'SYNC_ACTIVE' && err.code !== 'LOCK_BUSY') {
        console.error(`[${new Date().toISOString()}] [kommo-sync] auto-sync falhou:`, err.message)
      }
    }
  }, minutos * 60 * 1000)
}

export function stopSyncCron() {
  if (_cronInterval) {
    clearInterval(_cronInterval)
    _cronInterval = null
  }
}
