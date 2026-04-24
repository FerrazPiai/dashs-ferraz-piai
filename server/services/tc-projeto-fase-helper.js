// server/services/tc-projeto-fase-helper.js
//
// Helper de setup minimo pra criar tc_cliente + tc_projeto + tc_projeto_fase
// quando o auto-analyzer detecta avanco de fase e precisa enfileirar analise.
// Replica (simplificada) a logica de server/routes/torre-controle.js.

import pool from '../lib/db.js'

/**
 * Garante que existe um tc_projeto_fases para (leadId, ordem) e retorna seu ID.
 * Cria tc_clientes, tc_projetos e tc_projeto_fases se faltarem.
 * Retorna null se lead nao existe em tc_kommo_leads ou fase_config ausente.
 *
 * @param {number|string} leadId
 * @param {number} ordem  (1..6 — vindo de STAGE_TO_FASE[status_id].ordem)
 * @returns {Promise<number|null>}
 */
export async function getOrCreateProjetoFase(leadId, ordem) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Busca dados minimos do lead no cache do sync
    const { rows: leadRows } = await client.query(
      `SELECT l.id, l.name, l.company_id, c.name AS company_name
         FROM dashboards_hub.tc_kommo_leads l
         LEFT JOIN dashboards_hub.tc_kommo_companies c ON c.id = l.company_id
        WHERE l.id = $1`,
      [leadId]
    )
    const lead = leadRows[0]
    if (!lead) {
      await client.query('ROLLBACK')
      return null
    }
    const companyName = lead.company_name || lead.name || `Lead ${leadId}`

    // 2. Upsert tc_clientes
    await client.query(
      `INSERT INTO dashboards_hub.tc_clientes (id_externo, nome)
       VALUES ($1, $2)
       ON CONFLICT (id_externo) DO UPDATE SET nome = EXCLUDED.nome, updated_at = NOW()`,
      [leadId, companyName]
    )
    const { rows: [{ id: clienteId }] } = await client.query(
      `SELECT id FROM dashboards_hub.tc_clientes WHERE id_externo = $1`,
      [leadId]
    )

    // 3. Obtem/cria tc_projetos (produto='saber')
    const { rows: [projExisting] } = await client.query(
      `SELECT id FROM dashboards_hub.tc_projetos WHERE cliente_id = $1 AND produto = 'saber' LIMIT 1`,
      [clienteId]
    )
    let projetoId = projExisting?.id
    if (!projetoId) {
      const { rows: [p] } = await client.query(
        `INSERT INTO dashboards_hub.tc_projetos (cliente_id, produto, status)
         VALUES ($1, 'saber', 'em_andamento') RETURNING id`,
        [clienteId]
      )
      projetoId = p.id
    }

    // 4. Resolve fase_config
    const { rows: [fc] } = await client.query(
      `SELECT id FROM dashboards_hub.tc_fases_config WHERE produto = 'saber' AND ordem = $1`,
      [ordem]
    )
    if (!fc) {
      await client.query('ROLLBACK')
      return null
    }

    // 5. Obtem/cria tc_projeto_fases
    const { rows: [pfExisting] } = await client.query(
      `SELECT id FROM dashboards_hub.tc_projeto_fases WHERE projeto_id = $1 AND fase_config_id = $2`,
      [projetoId, fc.id]
    )
    let projetoFaseId = pfExisting?.id
    if (!projetoFaseId) {
      const { rows: [pf] } = await client.query(
        `INSERT INTO dashboards_hub.tc_projeto_fases (projeto_id, fase_config_id)
         VALUES ($1, $2) RETURNING id`,
        [projetoId, fc.id]
      )
      projetoFaseId = pf.id
    }

    await client.query('COMMIT')
    return projetoFaseId
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`[${new Date().toISOString()}] [tc-projeto-fase-helper] erro: ${err.message}`)
    throw err
  } finally {
    client.release()
  }
}
