# Architecture

**Analysis Date:** 2026-04-16

## Pattern Overview

**Overall:** Monolithic SPA with Express API gateway + Vue 3 frontend. The Express server acts as a proxy/cache layer between the Vue SPA and external n8n webhooks. Data flows unidirectionally: n8n webhooks -> Express cache -> Vue frontend.

**Key Characteristics:**
- Config-driven dashboard registration via `config/dashboards.json`
- Auto-generated routes from the dashboard registry (no manual route definitions per dashboard)
- Two-tier caching: server-side file cache (`dashboards-data/`) + client-side Pinia store
- Role-based access control (RBAC) with 3 tiers: admin, board, operacao
- Session-based auth with PostgreSQL persistence (Pg sessions) + Google OAuth
- All external data fetched through Express proxy (frontend never calls n8n directly)

## Layers

**Presentation Layer (Vue 3 SPA):**
- Purpose: Render dashboards, handle user interaction, client-side routing
- Location: `client/`
- Contains: Vue components, composables, Pinia stores, router, CSS
- Depends on: Express API (`/api/*` endpoints)
- Used by: End users via browser

**API Gateway Layer (Express):**
- Purpose: Proxy external APIs, manage cache, handle auth, serve static files in production
- Location: `server/`
- Contains: Route handlers, middleware, cache manager, API client, DB connection
- Depends on: PostgreSQL (auth/sessions), n8n webhooks (data), file system (cache)
- Used by: Vue SPA frontend

**Configuration Layer:**
- Purpose: Define dashboard registry, map endpoints to components
- Location: `config/dashboards.json`
- Contains: Dashboard metadata, API endpoint env var names, cache TTLs, workflow IDs, role permissions
- Depends on: Nothing
- Used by: Both server routes (`loadDashboardRegistry()`) and client router (static import)

**Data Persistence Layer:**
- Purpose: Store users, sessions, profiles, access control
- Location: PostgreSQL database (schema `dashboards_hub`)
- Contains: `users`, `sessions`, `profiles` tables
- Depends on: PostgreSQL (via `DATABASE_URL` env var)
- Used by: Auth routes, admin routes, access control checks

**Cache Layer:**
- Purpose: Reduce external API calls, improve response time
- Location: `dashboards-data/{dashboardId}/cache.json` (file-based)
- Contains: Timestamped JSON data per dashboard
- Depends on: File system
- Used by: API route handler (`server/routes/api.js`)

## Data Flow

**Dashboard Data Loading:**

1. User navigates to `/{dashboard-id}` in browser
2. Vue Router guard calls `authStore.check()` -> `GET /api/auth/check` to validate session
3. Dashboard component mounts, calls `useDashboardData(dashboardId).fetchData()`
4. Frontend fetches `GET /api/data/{dashboardId}` (with optional `?refresh=true`)
5. Express finds dashboard config in registry, resolves API endpoint from env var
6. Cache manager checks `dashboards-data/{id}/cache.json` for valid cached data (TTL-based)
7. If cache miss/expired: `api-client.js` fetches from n8n webhook URL (GET, 5min timeout)
8. Response cached to file, returned to frontend as `{ data, fromCache, timestamp }`
9. Dashboard component transforms raw data and renders charts/tables

**Dashboard Update Trigger:**

1. User clicks "Atualizar" button in dashboard
2. Frontend calls `GET /api/update-status/{dashboardId}` to check if already running
3. If not running: frontend calls `GET /api/{dashboardId}/trigger-update`
4. Express checks file lock + n8n workflow status (double-check)
5. Sets file lock (`dashboards-data/{id}/update.lock`)
6. POSTs to n8n webhook (`WEBHOOK_POST_*` env var) with 5min timeout
7. If webhook returns data, caches it immediately
8. Clears file lock
9. Frontend re-fetches data on next load

**Authentication Flow (Google OAuth):**

1. User clicks "Login com Google" -> `GET /api/auth/google`
2. Express redirects to Google OAuth consent screen
3. Google redirects to `GET /api/auth/google/callback` with auth code
4. Express exchanges code for tokens, fetches user info from Google
5. Checks if user exists in `dashboards_hub.users` table
6. If new user with allowed domain: auto-creates as `operacao` role
7. Sets session with user object, redirects to `/` (or `/criar-senha` if no password)
8. Subsequent requests validated via `express-session` + `connect-pg-simple`

**State Management:**
- **Server state:** Express session (PostgreSQL-backed via `connect-pg-simple`)
- **Client auth state:** Pinia `auth` store (`client/stores/auth.js`) -- mirrors server session
- **Client data state:** Pinia `dashboardData` store + `useDashboardData` composable
- **Cache state:** File-based per-dashboard JSON in `dashboards-data/`

## Key Abstractions

**Dashboard Registry (`config/dashboards.json`):**
- Purpose: Single source of truth for all dashboard configuration
- Each entry maps: `id` -> `componentPath` (Vue), `apiEndpoint` (env var), `webhookEndpoint` (env var), `workflowId` (n8n), `cacheTTL`, `status`, `allowedRoles`
- Pattern: Convention-over-configuration -- add a JSON entry + Vue component to create a new dashboard
- Used by: `server/routes/api.js` (data fetching), `client/router/index.js` (route generation), `client/App.vue` (sidebar)

**Dashboard Component Pattern:**
- Purpose: Each dashboard is a self-contained Vue module
- Location: `client/dashboards/{DashboardName}/`
- Pattern: Each has `index.vue` (main view), `config.js` (metadata), optional `components/` (sub-components), optional `mock-data.js`
- Examples: `client/dashboards/TxConvSaberMonetizacao/`, `client/dashboards/GtmMotion/`, `client/dashboards/DreFluxoCaixa/`

**Composables:**
- `client/composables/useDashboardData.js`: Manages fetch lifecycle (loading, error, retry, 401 redirect)
- `client/composables/useFormatters.js`: pt-BR formatting (currency, percentage, dates, numbers)
- `client/composables/useChartDefaults.js`: Chart.js config aligned with V4 design system

**Reusable UI Components:**
- Purpose: Shared visual building blocks across all dashboards
- Location: `client/components/`
- Pattern: `V`-prefixed components (VScorecard, VDataTable, VBarChart, etc.)
- Examples: `client/components/ui/VScorecard.vue`, `client/components/charts/VBarChart.vue`

**File-Based Cache (`server/lib/cache-manager.js`):**
- Purpose: Avoid repeated n8n API calls within TTL window
- Pattern: Read/write JSON files with timestamp-based TTL validation
- Key: `dashboardId` (or `dashboardId--param1--param2` for parameterized queries)

## Entry Points

**Server Entry (`server/index.js`):**
- Location: `server/index.js`
- Triggers: `node server/index.js` (production), `nodemon` (development via `npm run dev`)
- Responsibilities: Initialize Express, configure session store (Pg or memory), mount routes, serve SPA in production

**Client Entry (`client/main.js`):**
- Location: `client/main.js`
- Triggers: Vite dev server or built `index.html`
- Responsibilities: Create Vue app, register Pinia + Router, mount to `#app`, initialize Chart.js datalabels + Lucide icons

**HTML Entry (`client/index.html`):**
- Location: `client/index.html`
- Triggers: Browser navigation
- Responsibilities: Load CDN dependencies (Lucide, Chart.js, ECharts), link design system CSS, mount Vue app

**Docker Entry (`Dockerfile`):**
- Location: `Dockerfile`
- Triggers: Docker build/run for Easypanel deployment
- Responsibilities: Multi-stage build (npm ci + vite build -> production image with Express serving static + API)

## Error Handling

**Strategy:** Layered error handling -- composable retry at client level, Express error middleware at server level, graceful fallbacks for cache misses.

**Patterns:**
- `useDashboardData` composable retries once (1.5s delay) on transient errors (empty response, fetch failure)
- `useDashboardData` redirects to `/login` on 401 responses
- Express has global error middleware that logs and returns structured JSON errors with timestamp
- API route falls back to expired cache when fresh fetch returns empty/null data
- Server returns 503 when no data available (fresh or cached) with user-friendly message
- File lock on update operations auto-expires after 10 minutes (prevents stuck locks)

## Cross-Cutting Concerns

**Logging:**
- Server: `console.log/error` with ISO timestamp prefix `[YYYY-MM-DDTHH:mm:ss.sssZ]`
- Client: `console.log` with `[Store]` or `[Router]` prefix
- Request logging middleware logs method + URL for every request

**Validation:**
- Dashboard access: DB-first profile check (`profiles.allowed_dashboards`), fallback to `dashboards.json` `allowedRoles`
- Auth: Session cookie validation + `requireAuth` middleware on protected routes
- Admin routes: `requireRole(['admin'])` middleware
- Input validation in auth routes (email/password presence, password length >= 6)

**Authentication:**
- Dual auth: email/password (bcrypt) + Google OAuth
- Emergency admin backdoor via `.env` (`USER_NAME` + `USER_PASSWORD`)
- Session stored in PostgreSQL (`dashboards_hub.sessions` table) via `connect-pg-simple`
- Cookie: httpOnly, secure in production, sameSite lax, 8h TTL
- New OAuth users auto-created as `operacao` role (domain-restricted)
- First-login flow: OAuth users without password redirected to `/criar-senha`

**Role-Based Access Control (RBAC):**
- 3 built-in roles: `admin` (full access), `board` (financial + operational dashboards), `operacao` (operational dashboards only)
- Profiles table in DB allows dynamic dashboard permission management
- Admin panel at `/admin` for user/profile CRUD
- Admin always bypasses all access checks
- Dashboard visibility filtered server-side in `GET /api/dashboards`
- Dashboard data access checked server-side in `GET /api/data/:dashboardId`
- Client-side router guard redirects unauthorized users silently

---

*Architecture analysis: 2026-04-16*
