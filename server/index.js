import 'dotenv/config' // Deve ser o primeiro import — carrega .env antes de qualquer modulo que use process.env
import express from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pool from './lib/db.js'
import apiRoutes from './routes/api.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import adminAlertasRoutes from './routes/admin-alertas.js'
import adminActivityRoutes from './routes/admin-activity.js'
import activityRoutes from './routes/activity.js'
import torreControleRoutes from './routes/torre-controle.js'
import { requireAuth } from './middleware/requireAuth.js'
import { startJobWorker, stopJobWorker } from './services/tc-job-worker.js'
import { startCollaboratorCron } from './jobs/collaborator-analysis-cron.js'
import { startSyncCron, rodarSync } from './services/kommo-sync.js'
import { startAlertDispatcher } from './services/alert-dispatcher.js'
import { startAutoAnalyzer } from './services/auto-analyzer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Trust proxy (Easypanel/nginx/traefik termina SSL antes do Express)
if (NODE_ENV === 'production') app.set('trust proxy', 1)

// Middleware
app.use(express.json())

// Session store — Postgres (schema dashboards_hub)
const PgStore = connectPgSimple(session)
const sessionStore = process.env.DATABASE_URL
  ? new PgStore({ pool, schemaName: 'dashboards_hub', tableName: 'sessions' })
  : undefined // fallback MemoryStore se sem DATABASE_URL

if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET nao definido. Defina a variavel de ambiente antes de iniciar.')
  process.exit(1)
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8h
  }
}))

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  })
})

// Auth routes (open)
app.use('/api/auth', authRoutes)

// Protected API routes
app.use('/api/dashboards', requireAuth)
app.use('/api/data', requireAuth)
app.use('/api/cache', requireAuth)
app.use('/api/update-status', requireAuth)
app.use('/api/admin', requireAuth)
app.use('/api/activity', requireAuth)

// Beacon endpoint: navigator.sendBeacon envia como text/plain por padrao.
// Aceita text/plain E application/json (este ultimo ja coberto pelo express.json acima).
app.use('/api/activity', express.text({ type: 'text/plain', limit: '10kb' }))

// API routes
app.use('/api', apiRoutes)
app.use('/api/admin/alertas', adminAlertasRoutes)
app.use('/api/admin/activity', adminActivityRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/tc', torreControleRoutes)

// Serve static files in production
if (NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist', 'client')
  app.use(express.static(distPath))

  // Serve index.html for all non-API routes (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString()
  console.error(`[${timestamp}] Error:`, err.message)
  console.error(err.stack)

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      timestamp
    }
  })
})

// Start server
app.listen(PORT, async () => {
  console.log(`[${new Date().toISOString()}] Server running on http://localhost:${PORT}`)
  console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`)
  startJobWorker()
  startCollaboratorCron()
  startSyncCron()
  startAlertDispatcher()
  startAutoAnalyzer()

  // Sync inicial se DB estiver vazio
  try {
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM dashboards_hub.tc_kommo_leads`
    )
    if (parseInt(count, 10) === 0) {
      console.log(`[${new Date().toISOString()}] [kommo-sync] DB vazio — rodando sync inicial em background`)
      rodarSync().catch(err =>
        console.error(`[${new Date().toISOString()}] [kommo-sync] sync inicial falhou:`, err.message)
      )
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [kommo-sync] check inicial falhou:`, err.message)
  }
})

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM — parando worker`)
  stopJobWorker()
  process.exit(0)
})
