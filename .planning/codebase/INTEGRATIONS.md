# External Integrations

**Analysis Date:** 2026-04-16

## APIs & External Services

**n8n Webhooks (Data Source):**
All dashboard data flows through n8n self-hosted webhooks. Each dashboard has two types of webhook:

- **GET Webhooks** (data retrieval) - Configured via `API_ENDPOINT_*` env vars, consumed by `server/lib/api-client.js`
  - `API_ENDPOINT_CONV_SABER_MONETIZACAO` - Tx Conv Saber -> Monetizacao data
  - `API_ENDPOINT_GTM_MOTION` - GTM Motion funnel/KPI data
  - `API_ENDPOINT_MARKETING_VENDAS` - Marketing & Vendas tables
  - `API_ENDPOINT_DIAGRAMA_SANKEY` - Raio-X Financeiro Sankey data
  - `API_ENDPOINT_COMPARATIVO_SQUADS` - Comparativo Squads monthly data
  - `API_ENDPOINT_NPS_SATISFACAO` - NPS Satisfaction data
  - `API_ENDPOINT_TORRE_DE_CONTROLE` - Torre de Controle data

- **POST Webhooks** (manual update triggers) - Configured via `WEBHOOK_POST_*` env vars, triggered from `server/routes/api.js`
  - `WEBHOOK_POST_TX_CONV_SABER_MONETIZACAO` - workflowId: `rwnQ8GfuDdSuVZv-h4PR2` (~2-5 min)
  - `WEBHOOK_POST_GTM_MOTION` - workflowId: `2sVzeUPxpwI6lsK2` (~9-12 min)
  - `WEBHOOK_POST_MARKETING_VENDAS` - no workflowId configured
  - `WEBHOOK_POST_DIAGRAMA_SANKEY` - workflowId: `SdLdkXrCmlm0VL1zWp668` (~1 sec)
  - `WEBHOOK_POST_COMPARATIVO_SQUADS` - workflowId: `k13lPwqDqCfQoD8p` (~1 sec)
  - `WEBHOOK_POST_NPS_SATISFACAO` - no workflowId configured

- **N8N Execution Status Check** - `N8N_CHECK_STATUS_URL` - POST with `{ workflowId }` to check if workflow is running
  - Used in `server/routes/api.js` (`isN8nWorkflowRunning()`)
  - Timeout: 8 seconds (`AbortSignal.timeout(8000)`)

**API Client Details:**
- Implementation: `server/lib/api-client.js`
- HTTP client: `node-fetch` v3 (ESM, dynamic import)
- Default timeout: 5 minutes (300,000ms)
- User-Agent: `Dashboards-V4/1.0`
- Retry support: `fetchDataWithRetry()` with configurable retries/delay (not retried on 4xx)
- Accepts: `application/json`

**Google OAuth 2.0:**
- Service: Google Identity Platform
  - Endpoints: `accounts.google.com/o/oauth2/v2/auth`, `oauth2.googleapis.com/token`, `www.googleapis.com/oauth2/v2/userinfo`
  - Scopes: `openid email profile`
  - Auth flow: Authorization Code with `access_type: offline`
  - Implementation: `server/routes/auth.js` (manual OAuth, no Passport)
  - Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - Domain restriction: `GOOGLE_ALLOWED_DOMAINS` (default: `v4company.com`)

## Data Storage

**Database:**
- PostgreSQL (Easypanel managed)
  - Connection: `DATABASE_URL` env var
  - Client: `pg` (`^8.20.0`) connection pool in `server/lib/db.js`
  - Schema: `dashboards_hub` (set via `SET search_path TO dashboards_hub, public` on every connection)
  - Tables:
    - `users` (id, email, name, password_hash, role, oauth_provider, oauth_id, active, created_at, updated_at)
    - `sessions` (managed by `connect-pg-simple`)
    - `profiles` (name, label, allowed_dashboards)
  - Roles: `admin`, `board`, `operacao` (default for new OAuth users)

**File Storage (Cache):**
- File-based cache in `dashboards-data/{dashboardId}/cache.json`
  - Managed by `server/lib/cache-manager.js`
  - Format: `{ timestamp, data }` (JSON)
  - Default TTL: 30 minutes (overridden per dashboard in `config/dashboards.json`)
  - Dashboard-specific TTLs: 300,000ms (5 min) to 1,800,000ms (30 min)
  - Cache key supports query params: `{dashboardId}--{param1}--{param2}`
  - Bypass: `?refresh=true` query parameter
  - Fallback: Serves stale cache if fresh API fetch returns empty/null data
  - Volume-mountable in Docker for persistence across deploys

**File-Based Update Locks:**
- Lock files in `dashboards-data/{dashboardId}/update.lock`
  - TTL: 10 minutes (auto-expires)
  - Prevents concurrent webhook triggers for same dashboard
  - Managed in `server/routes/api.js`

**Caching:**
- In-memory profile cache in `server/routes/api.js` (`_profilesCache`, 30s TTL)
- No Redis/Memcached (by design - avoids external dependencies for internal tools)

## Authentication & Identity

**Primary Auth: Google OAuth 2.0**
- Auto-creates users from allowed domains as `operacao` role
- Stores `oauth_provider` and `oauth_id` in `users` table
- Users without password after OAuth login are redirected to `/criar-senha`
- Implementation: `server/routes/auth.js` (routes `/api/auth/google`, `/api/auth/google/callback`)

**Secondary Auth: Email/Password (Database)**
- Password hashing: bcrypt (10 rounds) via `bcryptjs`
- Login: `POST /api/auth/login` - checks DB users table
- Password management: `POST /api/auth/set-password` (create or change)
- Implementation: `server/routes/auth.js`

**Emergency Auth: Admin Backdoor (.env)**
- `USER_NAME` + `USER_PASSWORD` env vars
- Creates session with `{ id: 0, email: 'admin@local', name: 'Admin', role: 'admin' }`
- Checked before database lookup in login flow

**Session Management:**
- `express-session` with `connect-pg-simple` PostgreSQL store
- Cookie: httpOnly, secure (production), sameSite: lax, maxAge: 8h
- Session schema: `dashboards_hub.sessions`
- Fallback: in-memory MemoryStore if `DATABASE_URL` not set
- Auth check: `GET /api/auth/check` (revalidates `needsPassword` against DB)

**Role-Based Access Control:**
- Roles: `admin` (full access), `board` (financial + operational), `operacao` (operational only)
- Profile system: `profiles` table with `allowed_dashboards` array
- Middleware: `server/middleware/requireAuth.js` (session check), `server/middleware/requireRole.js` (role check)
- Dashboard-level: `allowedRoles` in `config/dashboards.json` + DB `profiles.allowed_dashboards`
- Admin routes: `server/routes/admin.js` (user CRUD, profile CRUD, bulk actions)

**Protected Routes:**
- `/api/dashboards`, `/api/data/*`, `/api/cache/*`, `/api/update-status/*`, `/api/admin/*` - Require session
- `/api/admin/*` - Require `admin` role

**Open Routes:**
- `/api/auth/*` - All auth endpoints
- `/health` - Health check

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)
- Errors logged to stdout via `console.error`

**Logs:**
- `console.log`/`console.error` to stdout
- Format: `[ISO timestamp] message`
- Request logging middleware in `server/index.js` (all requests)
- Cache operations logged (HIT/MISS/WRITE/EXPIRED)
- API fetch operations logged (URL, size, errors)

**Health Check:**
- `GET /health` - Returns `{ status: 'ok', timestamp, environment }`
- Docker HEALTHCHECK: 30s interval, 5s timeout, 3 retries, 15s start period

## CI/CD & Deployment

**Hosting:**
- Easypanel (Docker containers with auto-SSL via Let's Encrypt)
- Internal Postgres: `ferrazpiai_postgres:5432`
- External Postgres (dev): `uyk8ty.easypanel.host:5433`

**Docker:**
- Multi-stage Dockerfile at project root
- Stage 1 (builder): `node:20-alpine`, `npm ci`, `npm run build` (Vite)
- Stage 2 (production): `node:20-alpine`, `npm ci --omit=dev`, copies built frontend + server + config
- Exposed port: 80 (configurable via `PORT`)
- Cache directory: `dashboards-data/` (created in image, should be volume-mounted)

**CI Pipeline:**
- None detected (no GitHub Actions, no `.github/workflows/`)

## Environment Configuration

**Required env vars:**
- `SESSION_SECRET` - Fatal error if missing (server won't start)
- `DATABASE_URL` - PostgreSQL connection string (fallback to MemoryStore without it)
- `PORT` - Server port (default: 3000 dev, 80 production)

**Auth env vars:**
- `USER_NAME`, `USER_PASSWORD` - Admin backdoor credentials
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` - Google OAuth
- `GOOGLE_ALLOWED_DOMAINS` - Comma-separated allowed email domains (default: `v4company.com`)

**API endpoint env vars (one per dashboard):**
- `API_ENDPOINT_CONV_SABER_MONETIZACAO`
- `API_ENDPOINT_GTM_MOTION`
- `API_ENDPOINT_MARKETING_VENDAS`
- `API_ENDPOINT_DIAGRAMA_SANKEY`
- `API_ENDPOINT_COMPARATIVO_SQUADS`
- `API_ENDPOINT_NPS_SATISFACAO`
- `API_ENDPOINT_TORRE_DE_CONTROLE`

**Webhook trigger env vars:**
- `WEBHOOK_POST_GTM_MOTION`
- `WEBHOOK_POST_MARKETING_VENDAS`
- `WEBHOOK_POST_DIAGRAMA_SANKEY`
- `WEBHOOK_POST_TX_CONV_SABER_MONETIZACAO`
- `WEBHOOK_POST_COMPARATIVO_SQUADS`
- `WEBHOOK_POST_NPS_SATISFACAO`
- `N8N_CHECK_STATUS_URL`

**Secrets location:**
- `.env` file (gitignored)
- `.env.example` provides template with placeholder values
- Production: Docker env vars via Easypanel

## Webhooks & Callbacks

**Incoming (this app receives):**
- `GET /api/auth/google/callback` - Google OAuth callback (receives authorization code)

**Outgoing (this app sends):**
- `GET {API_ENDPOINT_*}` - Fetch dashboard data from n8n webhooks (via `server/lib/api-client.js`)
- `POST {WEBHOOK_POST_*}` - Trigger n8n workflow updates (via `server/routes/api.js`, 5min timeout)
- `POST {N8N_CHECK_STATUS_URL}` - Check if n8n workflow is currently running (8s timeout)
- `POST https://oauth2.googleapis.com/token` - Exchange OAuth code for tokens
- `GET https://www.googleapis.com/oauth2/v2/userinfo` - Fetch Google user profile

## CDN Dependencies

These are loaded from CDN in `client/index.html` (not bundled by Vite):

| Library | Version | CDN | Purpose |
|---------|---------|-----|---------|
| Lucide Icons | latest | unpkg.com | Icon library (`window.lucide.createIcons()`) |
| Chart.js | 4.4.1 | jsdelivr.net | Bar/line charts (`window.Chart`) |
| chartjs-plugin-datalabels | 2.2.0 | jsdelivr.net | Data labels on charts (`window.ChartDataLabels`) |
| Apache ECharts | 5.5.0 | jsdelivr.net | Sankey diagrams (`window.echarts`) |
| Google Fonts (Ubuntu) | - | fonts.googleapis.com | Primary typeface |

**Note:** These CDN libraries are accessed as globals (`window.Chart`, `window.echarts`, `window.lucide`), not via npm imports. This means they are not tree-shaken or version-locked by the build system.

---

## Phase 04 — Internalizacao do Extrator Torre de Controle (2026-04-20)

**Cutover:** Extratores de materiais do Torre de Controle (Slides/Docs/Figma/Miro) agora rodam **nativos em Node** no backend; o workflow n8n `uiUUXegcBHe3z2fg` foi arquivado (nao deletado) como referencia historica. Dispatcher central: `server/services/extractors/index.js` com feature flag `INTERNAL_EXTRACTORS` (csv de plataformas ou `all`).

### Novas integracoes ativas

| Servico | Endpoint base | Auth | Consumidor | Notas |
|---------|---------------|------|------------|-------|
| **Google OAuth 2.0 (Drive/Docs/Slides)** | `accounts.google.com`, `oauth2.googleapis.com` | per-user refresh token (AES-256-GCM em Postgres `google_oauth_tokens`) | `server/services/google-oauth.js`, `server/routes/google.js` | Flow secundario (distinto do login). Scopes: `drive.readonly`, `documents.readonly`, `presentations.readonly`. Cache de access_token em memoria com margem de 60s. |
| **Google Docs API v1** | `https://docs.googleapis.com/v1/documents/{id}` | Bearer token per-user | `server/services/extractors/google-docs.js` | Walk recursivo em `body.content[]` (paragraph/table/sectionBreak/tableOfContents). Sem download de PDF, sem OCR. 401/403 -> `GoogleReauthRequiredError`. |
| **Google Slides API v1** | `https://slides.googleapis.com/v1/presentations/{id}` | Bearer token per-user | `server/services/extractors/google-slides.js` | Extrai pageElements (shape.text, table, elementGroup, image) + speaker notes. Cada imagem -> GPT-4o vision `detail=high`. Narrativa final via gpt-4.1. |
| **Figma REST API** | `https://api.figma.com/v1/files/{fileKey}` + `/v1/images/{fileKey}?ids=...&format=png` | `X-Figma-Token` (FIGMA_TOKEN centralizado) | `server/services/extractors/figma.js` | Export PNG por pagina + vision GPT-4o + narrativa gpt-4.1. Rate limit: 2 req/s (OK no uso atual). |
| **Miro REST API v2** | `https://api.miro.com/v2/boards/{boardId}/items` | `Bearer MIRO_TOKEN` | `server/services/extractors/miro.js` | **Cursor pagination obrigatoria** — corrige bug do workflow n8n legado que so lia pagina 1. Loop `do { ... } while (cursor)` com `limit=50`. |
| **OpenAI Chat Completions (GPT-4o vision)** | `https://api.openai.com/v1/chat/completions` | `Bearer OPENAI_API_KEY` | `google-slides.js`, `figma.js` | Model `gpt-4o` com `detail: 'high'` fixo. Prompt em `openai-prompts.js` (VISION_IMAGE_PROMPT). Rate-limit via `createRateLimiter` (3 concurrent / 60 rpm configuravel). |
| **OpenAI Chat Completions (GPT-4.1 narrativa)** | mesmo endpoint | mesmo Bearer | `google-slides.js`, `figma.js` | Model `gpt-4.1` `temperature=0`. Prompt AUDITORIA_NARRATIVA_PROMPT. Step final apos concatenacao das descricoes de imagens. |

### Removido (Phase 04)

| Integracao | Substituicao | Obs |
|------------|--------------|-----|
| **n8n extract webhook `uiUUXegcBHe3z2fg`** | dispatcher interno (`server/services/extractors/index.js` + 4 extratores nativos) | `N8N_EXTRACT_WEBHOOK_URL` e `N8N_MAX_CONCURRENT` removidos do `.env.example`. `extractViaN8n`, `PLATFORM_TO_N8N` e `n8nLimiter` removidos de `tc-analyzer.js`. Workflow arquivado em n8n editor (nao deletado). |

### Contrato do dispatcher

`dispatchExtractor(platform, url, { userId })` roteia por `INTERNAL_EXTRACTORS`:
- `transcricao` -> `extractGoogleDoc` (requer userId)
- `slides` / `reuniao` -> `extractGoogleSlides` (requer userId)
- `figma` -> `extractFigma` (token central)
- `miro` -> `extractMiro` (token central)

`GoogleReauthRequiredError` (code `google_reauth_required`) capturado em `runAnalysis` persiste `tc_analises_ia.status_avaliacao='incompleta'` + `erro_code='google_reauth_required'` para o frontend ativar banner de reauth.

### Job worker ownership (D-01/D-02)

`tc_jobs.triggered_by_user_id` armazena o user que disparou a analise. Worker resolve user_id para OAuth Google em 2 etapas:
1. trigger_owner (direto do job)
2. fallback Kommo: `users.kommo_user_id = tc_leads.responsible_user_id`

Se nenhum, job falha limpo com mensagem `sem user_id para autenticar Google`.

---

*Integration audit: 2026-04-16*
