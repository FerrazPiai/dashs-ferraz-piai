# Codebase Structure

**Analysis Date:** 2026-04-16

## Directory Layout

```
dashboards-v4/
├── client/                         # Vue 3 frontend (Vite root)
│   ├── index.html                  # HTML entry (CDN scripts: Chart.js, Lucide, ECharts)
│   ├── main.js                     # Vue app bootstrap (Pinia, Router, mount)
│   ├── App.vue                     # Root component (layout switch: login vs dashboard)
│   ├── router/
│   │   └── index.js                # Auto-generated routes from dashboards.json
│   ├── stores/
│   │   ├── auth.js                 # Pinia auth store (login, logout, check, role)
│   │   └── dashboardData.js        # Pinia data store (fetch, cache, loading states)
│   ├── composables/
│   │   ├── useDashboardData.js     # Data fetching composable (retry, 401 redirect)
│   │   ├── useFormatters.js        # pt-BR formatters (currency, %, dates, numbers)
│   │   └── useChartDefaults.js     # Chart.js defaults (V4 design system colors/fonts)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── VLayout.vue         # Main app shell (sidebar + content + status modal)
│   │   │   └── VSidebar.vue        # Navigation sidebar (auto-generated from dashboards)
│   │   ├── ui/
│   │   │   ├── VScorecard.vue      # KPI card with icon, value, loading state
│   │   │   ├── VDataTable.vue      # Sortable data table
│   │   │   ├── VToggleGroup.vue    # Tab/toggle selector
│   │   │   ├── VRefreshButton.vue  # Refresh button with loading spinner
│   │   │   ├── VStatusModal.vue    # Dashboard status modal (development/maintenance)
│   │   │   └── VConfirmModal.vue   # Generic confirmation dialog
│   │   └── charts/
│   │       ├── VBarChart.vue       # Bar chart wrapper (Chart.js)
│   │       ├── VLineChart.vue      # Line chart wrapper (Chart.js)
│   │       └── VChartCard.vue      # Chart container card with title + actions slot
│   ├── styles/
│   │   ├── design-system.css       # V4 design tokens (colors, fonts, spacing)
│   │   ├── layout.css              # App shell layout (sidebar, main content)
│   │   └── components.css          # Shared component styles (scorecards, tables)
│   ├── views/
│   │   ├── LoginView.vue           # Login page (standalone, no VLayout)
│   │   ├── SetPassword.vue         # First-login password creation
│   │   ├── AccessDenied.vue        # 403 page
│   │   └── NotFound.vue            # 404 page
│   ├── dashboards/                 # Dashboard-specific modules
│   │   ├── TxConvSaberMonetizacao/ # Conversion rates dashboard
│   │   │   ├── index.vue           # Main view
│   │   │   ├── config.js           # Dashboard metadata
│   │   │   └── components/         # Dashboard-specific components
│   │   ├── GtmMotion/              # Sales funnel dashboard
│   │   │   ├── index.vue
│   │   │   ├── config.js
│   │   │   ├── mock-data.js        # Dev mock data (?mock-data URL param)
│   │   │   └── components/
│   │   ├── DreFluxoCaixa/          # Sankey financial dashboard
│   │   │   ├── index.vue
│   │   │   ├── config.js
│   │   │   ├── mock-data.js
│   │   │   └── components/
│   │   ├── FechamentoMensal/       # Squad comparison dashboard
│   │   │   ├── index.vue
│   │   │   ├── config.js
│   │   │   └── historico-2025.js   # Hardcoded historical data
│   │   ├── MarketingVendas/        # Marketing & Sales dashboard
│   │   │   ├── index.vue
│   │   │   ├── config.js
│   │   │   └── components/
│   │   ├── NpsSatisfacao/          # NPS dashboard
│   │   │   ├── index.vue
│   │   │   └── components/
│   │   ├── TorreDeControle/        # Control tower dashboard (in development)
│   │   │   ├── index.vue
│   │   │   ├── config.js
│   │   │   ├── mock-data.js
│   │   │   └── components/
│   │   └── Admin/                  # Admin panel (user/profile management)
│   │       ├── index.vue
│   │       └── components/
│   ├── dist/                       # Vite build output (gitignored)
│   └── public/                     # Static assets (favicon, etc.)
├── server/                         # Express backend
│   ├── index.js                    # Server entry (Express setup, session, middleware)
│   ├── routes/
│   │   ├── api.js                  # Data API (/api/data, /api/dashboards, /api/cache, triggers)
│   │   ├── auth.js                 # Auth routes (/api/auth/login, google, check, logout)
│   │   └── admin.js                # Admin CRUD (/api/admin/users, profiles, bulk)
│   ├── middleware/
│   │   ├── requireAuth.js          # Session auth guard (401 if not authenticated)
│   │   └── requireRole.js          # Role-based guard (403 if wrong role)
│   └── lib/
│       ├── api-client.js           # HTTP client for n8n webhooks (5min timeout)
│       ├── cache-manager.js        # File-based cache (read/write/status with TTL)
│       └── db.js                   # PostgreSQL pool (dashboards_hub schema)
├── config/
│   └── dashboards.json             # Dashboard registry (single source of truth)
├── migrations/
│   ├── 001_create_hub_tables.sql   # users + sessions tables
│   ├── 002_create_profiles_table.sql # profiles table (RBAC)
│   └── 003_create_torre_de_controle_tables.sql # Torre de Controle specific tables
├── dashboards-data/                # File cache per dashboard (gitignored)
│   └── {dashboardId}/
│       ├── cache.json              # Cached API response with timestamp
│       └── update.lock             # File lock during webhook trigger
├── design-system.md                # V4 design system spec (colors, fonts, charts)
├── vite.config.js                  # Vite config (root: client, proxy /api to Express)
├── package.json                    # Dependencies + scripts
├── Dockerfile                      # Multi-stage Docker build (Alpine + Express)
└── .claude/commands/               # Custom Claude commands (/commit, /create-feature)
```

## Directory Purposes

**`client/`:**
- Purpose: Vue 3 SPA frontend, also the Vite root directory
- Contains: All frontend source code, HTML entry, styles, views, dashboard modules
- Key files: `index.html` (CDN deps), `main.js` (bootstrap), `App.vue` (root)

**`client/dashboards/`:**
- Purpose: Dashboard-specific modules, each self-contained
- Contains: One directory per dashboard with `index.vue` + optional `config.js`, `components/`, `mock-data.js`
- Key pattern: Each dashboard is lazy-loaded via dynamic import in the router

**`client/components/`:**
- Purpose: Shared reusable UI components used across all dashboards
- Contains: Layout components (`VLayout`, `VSidebar`), UI primitives (`VScorecard`, `VDataTable`, `VToggleGroup`), chart wrappers (`VBarChart`, `VLineChart`, `VChartCard`)
- Naming: All prefixed with `V` (e.g., `VScorecard.vue`)

**`client/composables/`:**
- Purpose: Reusable composition functions for data, formatting, and chart configuration
- Contains: `useDashboardData.js`, `useFormatters.js`, `useChartDefaults.js`
- Pattern: Named exports (not default), used via destructuring in setup scripts

**`client/stores/`:**
- Purpose: Pinia stores for global state management
- Contains: `auth.js` (authentication state), `dashboardData.js` (data caching)
- Pattern: Composition API style (`defineStore` with setup function)

**`client/styles/`:**
- Purpose: Global CSS design system (linked in `index.html`, not imported in JS)
- Contains: `design-system.css` (tokens), `layout.css` (shell), `components.css` (shared)

**`client/views/`:**
- Purpose: Standalone pages not tied to a specific dashboard
- Contains: `LoginView.vue` (no layout wrapper), `SetPassword.vue`, `AccessDenied.vue`, `NotFound.vue`

**`server/`:**
- Purpose: Express API server (proxy, cache, auth, admin)
- Contains: Entry point, route handlers, middleware, utility libraries

**`server/routes/`:**
- Purpose: Express route modules
- Contains: `api.js` (dashboard data + triggers), `auth.js` (login/OAuth/session), `admin.js` (user/profile CRUD)

**`server/lib/`:**
- Purpose: Shared server utilities
- Contains: `api-client.js` (HTTP client), `cache-manager.js` (file cache), `db.js` (Postgres pool)

**`server/middleware/`:**
- Purpose: Express middleware for auth and authorization
- Contains: `requireAuth.js` (session check), `requireRole.js` (role-based access)

**`config/`:**
- Purpose: Application configuration files
- Contains: `dashboards.json` (dashboard registry -- the central config file)
- Critical: Changes to `dashboards.json` require server restart (not hot-reloaded)

**`migrations/`:**
- Purpose: SQL migration scripts for PostgreSQL schema
- Contains: Sequential numbered migration files (run manually against DB)
- Pattern: `NNN_description.sql`, uses `dashboards_hub` schema

**`dashboards-data/`:**
- Purpose: Runtime file-based cache for dashboard API responses
- Contains: Per-dashboard directories with `cache.json` and `update.lock` files
- Generated: Yes (runtime)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `client/index.html`: HTML shell with CDN dependencies (Chart.js, Lucide, ECharts)
- `client/main.js`: Vue app initialization
- `server/index.js`: Express server startup

**Configuration:**
- `config/dashboards.json`: Dashboard registry (routes, endpoints, cache TTL, roles, status)
- `vite.config.js`: Vite build config (root, proxy, chunking)
- `Dockerfile`: Multi-stage production build
- `design-system.md`: Visual design specification

**Core Logic:**
- `server/routes/api.js`: Data fetching, caching, update triggers, access control (most complex server file)
- `server/routes/auth.js`: Email/password + Google OAuth authentication
- `server/routes/admin.js`: User and profile CRUD operations
- `client/router/index.js`: Auto-generated routes + auth guards + role-based redirects
- `client/composables/useDashboardData.js`: Frontend data fetching with retry logic

**Stores:**
- `client/stores/auth.js`: Authentication state (login, logout, check, role detection)
- `client/stores/dashboardData.js`: Dashboard data cache + loading/error states

**Shared Components:**
- `client/components/ui/VScorecard.vue`: KPI scorecard
- `client/components/ui/VDataTable.vue`: Sortable data table
- `client/components/charts/VChartCard.vue`: Chart container with title/actions
- `client/components/layout/VLayout.vue`: App shell (sidebar + main + status modal)
- `client/components/layout/VSidebar.vue`: Navigation sidebar

## Naming Conventions

**Files:**
- Vue components: PascalCase (e.g., `VScorecard.vue`, `LoginView.vue`)
- JavaScript modules: camelCase (e.g., `useDashboardData.js`, `cache-manager.js`) or kebab-case for server files
- Dashboard directories: PascalCase matching `componentPath` in `dashboards.json` (e.g., `TxConvSaberMonetizacao/`)
- CSS files: kebab-case (e.g., `design-system.css`)
- SQL migrations: `NNN_description.sql` (e.g., `001_create_hub_tables.sql`)

**Components:**
- Shared components: `V`-prefixed PascalCase (e.g., `VScorecard`, `VDataTable`, `VBarChart`)
- Dashboard-specific components: No prefix, PascalCase (e.g., `SafraChart`, `FunnelTable`)
- Views (standalone pages): Suffix with `View` (e.g., `LoginView.vue`, but `NotFound.vue` is an exception)

**Directories:**
- Plural for collections: `components/`, `stores/`, `composables/`, `views/`, `dashboards/`, `styles/`
- Singular for specific concerns: `router/`, `config/`
- Kebab-case for data directories: `dashboards-data/`

**Dashboard IDs:**
- kebab-case: `tx-conv-saber-monetizacao`, `gtm-motion`, `raio-x-financeiro`
- Must match route path: `/{dashboard-id}`

**Environment Variables:**
- API endpoints: `API_ENDPOINT_{DASHBOARD_NAME}` (e.g., `API_ENDPOINT_GTM_MOTION`)
- Webhook triggers: `WEBHOOK_POST_{DASHBOARD_NAME}` (e.g., `WEBHOOK_POST_GTM_MOTION`)
- Auth: `USER_NAME`, `USER_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_ALLOWED_DOMAINS`

## Where to Add New Code

**New Dashboard:**
1. Create directory: `client/dashboards/{PascalCaseName}/`
2. Create `index.vue` (main view using `useDashboardData`, shared components)
3. Create `config.js` (id, title, icon, description)
4. Optionally create `components/` for dashboard-specific sub-components
5. Optionally create `mock-data.js` for development testing
6. Register in `config/dashboards.json` (id, title, icon, componentPath, apiEndpoint, cacheTTL, status, allowedRoles)
7. Add `API_ENDPOINT_*` and optionally `WEBHOOK_POST_*` to `.env`
8. Router and sidebar auto-generate from the registry -- no other changes needed

**New Shared Component:**
- UI primitive: `client/components/ui/V{ComponentName}.vue`
- Chart wrapper: `client/components/charts/V{ComponentName}.vue`
- Layout component: `client/components/layout/V{ComponentName}.vue`

**New Composable:**
- Location: `client/composables/use{Name}.js`
- Pattern: Named exports (not default export)

**New Server Route:**
- Route module: `server/routes/{name}.js`
- Mount in `server/index.js` with `app.use('/api/{prefix}', routeModule)`
- Add `requireAuth` middleware if protected

**New Middleware:**
- Location: `server/middleware/{name}.js`
- Pattern: Export function that returns `(req, res, next) => {}`

**New Database Table:**
- Migration: `migrations/{NNN}_{description}.sql`
- Schema: Use `dashboards_hub` schema
- Run manually against production DB

**New Pinia Store:**
- Location: `client/stores/{name}.js`
- Pattern: Composition API style with `defineStore`
- Register: Pinia auto-discovers -- just import where needed

**Utilities/Helpers:**
- Server: `server/lib/{name}.js`
- Client formatters: Add to `client/composables/useFormatters.js`
- Client chart utilities: Add to `client/composables/useChartDefaults.js`

## Special Directories

**`dashboards-data/`:**
- Purpose: Runtime file cache for API responses + update locks
- Generated: Yes (created at runtime by cache-manager)
- Committed: No (gitignored)

**`client/dist/`:**
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No (gitignored)

**`mock/`:**
- Purpose: Development mock data files
- Generated: No (manually created)
- Committed: No (gitignored)

**`specs/`:**
- Purpose: Feature specifications and planning documents
- Generated: No
- Committed: No (gitignored)

**`.claude/commands/`:**
- Purpose: Custom Claude Code slash commands (`/commit`, `/create-feature`)
- Generated: No
- Committed: Yes

**`.sessions/`:**
- Purpose: Local development session files
- Generated: Yes
- Committed: No (gitignored)

**`migrations/`:**
- Purpose: SQL DDL scripts run manually against production PostgreSQL
- Generated: No
- Committed: Yes
- Note: No migration runner -- scripts executed manually

---

*Structure analysis: 2026-04-16*
