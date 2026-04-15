import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

// Seta search_path para o schema do hub em cada conexao
pool.on('connect', (client) => {
  client.query('SET search_path TO dashboards_hub, public')
})

pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Postgres pool error:`, err.message)
})

export default pool
