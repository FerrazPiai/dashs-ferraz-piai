// scripts/apply-migration.js
// Usage: node scripts/apply-migration.js migrations/015_tc_alert_system.sql
// Aplica um arquivo SQL no DB configurado em DATABASE_URL.
// Migrations devem ser idempotentes (IF NOT EXISTS, ON CONFLICT DO NOTHING).

import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Uso: node scripts/apply-migration.js <caminho-do-sql>')
  process.exit(1)
}
if (!fs.existsSync(file)) {
  console.error(`Arquivo nao encontrado: ${file}`)
  process.exit(1)
}

const sql = fs.readFileSync(file, 'utf8')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  console.log(`Aplicando ${file}...`)
  await pool.query(sql)
  console.log('OK — migration aplicada.')
} catch (err) {
  console.error('ERR:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
