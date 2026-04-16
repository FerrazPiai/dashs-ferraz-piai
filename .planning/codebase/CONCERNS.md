# Codebase Concerns

**Analysis Date:** 2026-04-16

## Tech Debt

**Massive Single-File Components (God Components):**
- Issue: Several dashboard index.vue files contain thousands of lines mixing template, script, and styles in one file. This makes incremental edits risky (known to cause Claude Code hangs on Write for 500+ line files).
- Files:
  - `client/dashboards/GtmMotion/index.vue` (2889 lines)
  - `client/dashboards/FechamentoMensal/index.vue` (1570 lines)
  - `client/dashboards/DreFluxoCaixa/index.vue` (1244 lines)
  - `client/dashboards/GtmMotion/components/GtmBowTieChart.vue` (1133 lines)
  - `client/dashboards/GtmMotion/components/GtmFunnelTable.vue` (982 lines)
  - `client/dashboards/NpsSatisfacao/components/NpsContent.vue` (931 lines)
- Impact: Hard to maintain, slow to edit, higher risk of merge conflicts. Editing any section risks unintended changes to others.
- Fix approach: Extract computed logic, data transformations, and helper functions into composables. Split sub-sections of templates into child components. Apply incrementally per dashboard.

**CDN Dependencies Instead of Bundled Packages:**
- Issue: Lucide Icons, Chart.js, chartjs-plugin-datalabels, and ECharts are loaded via CDN `<script>` tags in `client/index.html` (lines 18-27) instead of being bundled via Vite. This bypasses tree-shaking, version pinning is inconsistent (`lucide@latest` is unpinned), and creates a runtime dependency on external CDNs.
- Files: `client/index.html` (lines 18-27)
- Impact: `lucide@latest` can break at any time with a new release. CDN outages cause full app failure. No tree-shaking means shipping entire libraries (~300KB+ for ECharts alone). `lucide.createIcons()` must be called manually after every DOM update across 20+ locations.
- Fix approach: Install `lucide-vue-next`, `chart.js`, `chartjs-plugin-datalabels`, and `echarts` as npm dependencies. Import only needed icons/modules. Remove CDN scripts and all `window.lucide.createIcons()` calls.

**Redundant `lucide.createIcons()` Calls Scattered Everywhere:**
- Issue: Because Lucide is loaded as a global CDN script, `window.lucide.createIcons()` must be called manually after every render cycle. This is called in 20+ locations across the codebase.
- Files: `client/main.js`, `client/views/LoginView.vue`, `client/views/SetPassword.vue`, `client/views/NotFound.vue`, `client/views/AccessDenied.vue`, `client/components/layout/VLayout.vue`, `client/components/layout/VSidebar.vue`, `client/components/ui/VScorecard.vue`, `client/components/ui/VRefreshButton.vue`, `client/dashboards/Admin/index.vue`, `client/dashboards/Admin/components/ProfilesTab.vue`, `client/dashboards/Admin/components/UsersTab.vue`, `client/dashboards/TxConvSaberMonetizacao/index.vue`, `client/dashboards/NpsSatisfacao/index.vue`, `client/dashboards/FechamentoMensal/index.vue`
- Impact: Easy to forget a call, causing broken icons. Adds boilerplate to every component.
- Fix approach: Switch to `lucide-vue-next` npm package. Use `<LucideIcon>` components directly in templates, eliminating all manual `createIcons()` calls.

**`node-fetch` Dynamic Import When Node 18+ Has Native Fetch:**
- Issue: `server/lib/api-client.js` dynamically imports `node-fetch` on every request (`await import('node-fetch')`). Node 20 (used in Dockerfile) has native `fetch`. The `api.js` route file already uses `globalThis.fetch` for N8N calls, creating inconsistency.
- Files: `server/lib/api-client.js` (line 27), `server/routes/api.js` (lines 24, 336 use `globalThis.fetch`)
- Impact: Unnecessary dependency, slight performance overhead from dynamic import on each call, two different fetch implementations in the same codebase.
- Fix approach: Remove `node-fetch` from `package.json`. Use native `globalThis.fetch` consistently in `api-client.js`. Test on Node 20.

**Unused `session-file-store` Dependency:**
- Issue: `session-file-store` is in `package.json` dependencies but is never imported anywhere in the codebase. Sessions use `connect-pg-simple` (Postgres).
- Files: `package.json` (line 31)
- Impact: Adds unnecessary weight to `node_modules` and Docker image.
- Fix approach: `npm uninstall session-file-store`

**Dashboard Registry Read From Disk On Every Request:**
- Issue: `loadDashboardRegistry()` in `server/routes/api.js` reads and parses `config/dashboards.json` from the filesystem on every API call (`/api/dashboards`, `/api/data/:id`, `/api/update-status/:id`, etc.). This file is static at runtime.
- Files: `server/routes/api.js` (lines 84-93, called via `findDashboard` on lines 100-103)
- Impact: Unnecessary I/O on every request. Not a bottleneck currently (small file), but wasteful.
- Fix approach: Load registry once at startup and cache in memory. Reload only on explicit signal or server restart.

**`retorno_dados.json` Committed to Git (928KB):**
- Issue: A 928KB JSON data file is committed to the repository and not in `.gitignore`.
- Files: `retorno_dados.json`
- Impact: Bloats repository history. Likely test/debug data that should not be in source control.
- Fix approach: Add `retorno_dados.json` to `.gitignore` and remove from tracked files.

**Hardcoded Historical Data:**
- Issue: The FechamentoMensal dashboard imports hardcoded 2025 historical data from a separate JS file instead of fetching from the API.
- Files: `client/dashboards/FechamentoMensal/index.vue` (references `historico-2025.js`)
- Impact: Data is frozen in code. Cannot be updated without a deploy. Mixing data sources makes debugging harder.
- Fix approach: Migrate historical data to the API/database and remove the hardcoded file.

## Known Bugs

**Torre de Controle Dashboard Permanently Uses Mock Data:**
- Symptoms: The dashboard always renders mock data regardless of API configuration. The `useMock` computed property is hardcoded to `true`.
- Files: `client/dashboards/TorreDeControle/index.vue` (line 140: `computed(() => true || 'mock-data' in route.query)`)
- Trigger: Always. The `true ||` prefix short-circuits the query param check.
- Workaround: This is intentional for development (`status: "development"` in `config/dashboards.json`), but the hardcoded `true` should be removed when the API is ready.

**Torre de Controle CRM Integration Is a Stub:**
- Symptoms: Clicking "Criar Oportunidade" shows a browser `alert()` instead of actually creating a CRM record.
- Files: `client/dashboards/TorreDeControle/index.vue` (lines 127-131)
- Trigger: Click the CRM creation button in the detail panel.
- Workaround: None. The TODO comment says "integrar com endpoint do CRM quando disponivel."

## Security Considerations

**No Rate Limiting:**
- Risk: Login endpoint (`POST /api/auth/login`) has no rate limiting. Brute-force attacks are possible.
- Files: `server/routes/auth.js` (line 9), `server/index.js`
- Current mitigation: None.
- Recommendations: Add `express-rate-limit` middleware on `/api/auth/login` (e.g., 5 attempts per minute per IP). Consider rate limiting on `/api/:dashboardId/trigger-update` to prevent webhook abuse.

**No Helmet or CORS Middleware:**
- Risk: Missing HTTP security headers (X-Frame-Options, Content-Security-Policy, X-Content-Type-Options, etc.). No CORS configuration means the API is accessible from any origin in development.
- Files: `server/index.js`
- Current mitigation: Cookies have `httpOnly: true` and `secure: true` in production. `sameSite: 'lax'` mitigates CSRF partially.
- Recommendations: Add `helmet` middleware for security headers. Add `cors` middleware with explicit origin allowlist for production.

**Admin Backdoor in .env:**
- Risk: Login route has a plaintext password comparison backdoor (`username === envUser && password === envPass`). The .env password is compared without hashing.
- Files: `server/routes/auth.js` (lines 17-23)
- Current mitigation: Comment says "mantido para emergencia." Only works if `USER_NAME` and `USER_PASSWORD` env vars are set.
- Recommendations: Remove this backdoor or at minimum hash the env password with bcrypt. Use a proper admin seeding strategy instead.

**Hardcoded N8N Webhook URL Fallback:**
- Risk: `server/routes/api.js` line 19 contains a hardcoded fallback URL for the N8N check-status endpoint, exposing the internal N8N editor hostname in source code.
- Files: `server/routes/api.js` (line 19: `'https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/check-execution-status'`)
- Current mitigation: Overridable via `N8N_CHECK_STATUS_URL` env var.
- Recommendations: Remove the hardcoded fallback. Require `N8N_CHECK_STATUS_URL` as a mandatory env var or fail gracefully.

**Error Messages Leak Internal Details:**
- Risk: API error responses include internal endpoint names (e.g., `Endpoint da API nao configurado: API_ENDPOINT_NOME`), leaking env var names to clients.
- Files: `server/routes/api.js` (line 147)
- Current mitigation: Routes are behind `requireAuth`, so only authenticated users see these.
- Recommendations: Return generic error messages to clients. Log details server-side only.

## Performance Bottlenecks

**`api-client.js` Serializes Entire Response for Logging:**
- Problem: `JSON.stringify(data).length` is called on every successful fetch response just to log the byte count.
- Files: `server/lib/api-client.js` (line 53)
- Cause: Serializing large API responses (potentially MBs) to count bytes is wasteful.
- Improvement path: Use `response.headers.get('content-length')` or remove the size logging. Alternatively, log after parsing and use `Buffer.byteLength(text)` on the raw text.

**Auth Check on Every Route Navigation:**
- Problem: `router.beforeEach` calls `GET /api/auth/check` on every single route change, which queries the database to revalidate `needsPassword`.
- Files: `client/router/index.js` (line 93: `await auth.check()`), `client/stores/auth.js` (line 12-21), `server/routes/auth.js` (lines 170-183)
- Cause: The auth check hits the DB (`SELECT password_hash FROM users WHERE id = $1`) on every navigation.
- Improvement path: Cache auth state in the Pinia store with a TTL (e.g., 5 min). Only re-check on login/session events or after TTL expiry.

**CDN Libraries Load Entire Bundles:**
- Problem: ECharts (~1MB), Chart.js (~200KB), and Lucide icons (~full set) are loaded in their entirety via CDN.
- Files: `client/index.html` (lines 18-27)
- Cause: CDN scripts cannot tree-shake.
- Improvement path: Install as npm packages and import only needed modules. ECharts supports modular imports that can reduce bundle to ~100KB.

## Fragile Areas

**GtmMotion Dashboard (2889 lines in one file):**
- Files: `client/dashboards/GtmMotion/index.vue`
- Why fragile: Largest file in the codebase. Contains template (~250 lines), script (~2000 lines of data transforms, computed properties, watchers, and filters), and styles (~600 lines). A single typo in the script section can break the entire dashboard with no isolation.
- Safe modification: Use Edit tool for surgical changes. Never rewrite the full file. Test after each change.
- Test coverage: Zero automated tests.

**Cache Key Construction from Query Params:**
- Files: `server/routes/api.js` (lines 153-156)
- Why fragile: Cache keys are built by concatenating `Object.values(apiParams)` with `--` separator. If param order changes or new params are added, cache misses occur. If a param value contains `--`, cache collisions are possible.
- Safe modification: Sort params alphabetically before building the key. Use a hash of the full query string.
- Test coverage: No tests.

**File-Based Cache Write Race Condition:**
- Files: `server/lib/cache-manager.js` (lines 69-91)
- Why fragile: `setCachedData` does not use atomic write (write to temp file + rename). If the server crashes mid-write, the cache file can be corrupted, causing JSON parse errors on the next read.
- Safe modification: Write to a `.tmp` file first, then rename atomically.
- Test coverage: No tests.

**Dual Role-Check Systems (DB Profiles + JSON allowedRoles):**
- Files: `server/routes/api.js` (lines 375-407), `config/dashboards.json`, `client/router/index.js` (lines 112-114)
- Why fragile: Access control is checked in two places with two different data sources. The server checks profiles from the DB with a fallback to `allowedRoles` from the JSON file. The client router checks `allowedRoles` from the static JSON import. If they diverge, users may see dashboard links they cannot access (or vice versa).
- Safe modification: Move all access control to the server. Have the client rely only on the filtered list from `GET /api/dashboards`.
- Test coverage: No tests.

## Scaling Limits

**In-Memory Session Store Fallback:**
- Current capacity: If `DATABASE_URL` is not set, Express falls back to the default `MemoryStore`.
- Limit: MemoryStore leaks memory over time (no cleanup of expired sessions) and cannot survive server restarts.
- Scaling path: Always require `DATABASE_URL` in production. Fail fast if not set.

**File-Based Cache on Disk:**
- Current capacity: Works well for 7 dashboards with moderate data sizes.
- Limit: Cache files are read/written synchronously-ish (Promise-based fs). Under high concurrency, multiple writes to the same file can corrupt data.
- Scaling path: Acceptable for current scale. If concurrency increases, consider write locking or an in-memory cache (e.g., `node-cache`) with periodic flush.

## Dependencies at Risk

**Lucide via Unpinned CDN (`lucide@latest`):**
- Risk: Any breaking change to Lucide's UMD build will instantly break icons across the entire app without warning.
- Impact: All icons disappear or render incorrectly.
- Migration plan: Install `lucide-vue-next` as npm dependency with pinned version.

**Express 4.x (Not Yet Express 5):**
- Risk: Express 4 is in maintenance mode. Express 5 is available.
- Impact: No critical issues currently. Future security patches may only target v5.
- Migration plan: Low priority. Upgrade when Express 5 stabilizes further.

## Missing Critical Features

**Zero Test Coverage:**
- Problem: No test files exist in the project (`*.test.*` and `*.spec.*` searches return only node_modules results). No test runner configured (no jest/vitest in devDependencies).
- Blocks: Cannot safely refactor the large files. Cannot verify data transformations work correctly. Regressions are caught only in production.

**No Structured Logging:**
- Problem: All server logging uses `console.log`/`console.error` with manual timestamp formatting (47 occurrences across 7 server files). No log levels, no structured JSON output, no log rotation.
- Files: All files in `server/`
- Blocks: Cannot filter logs by severity. Cannot integrate with log aggregation tools. Production debugging is manual.

**No Input Validation Library:**
- Problem: Request body validation is done with manual `if (!field)` checks. No schema validation (e.g., Zod, Joi, express-validator).
- Files: `server/routes/auth.js`, `server/routes/admin.js`
- Blocks: Easy to miss edge cases. No type coercion or sanitization.

## Test Coverage Gaps

**All Dashboard Data Transformations Untested:**
- What's not tested: Every dashboard has complex data transformation logic (parsing Brazilian currency formats, date parsing, tier aggregation, squad normalization, funnel calculations).
- Files: `client/dashboards/GtmMotion/index.vue` (2000+ lines of script), `client/dashboards/FechamentoMensal/index.vue` (squad normalization, BRL parsing), `client/dashboards/TxConvSaberMonetizacao/index.vue` (safra parsing), `client/dashboards/NpsSatisfacao/index.vue` (NPS calculations)
- Risk: Any change to the N8N webhook response format will silently break dashboards. Data formatting bugs (e.g., BRL parsing edge cases) go unnoticed.
- Priority: High - these are the core business logic of the application.

**Server Cache Logic Untested:**
- What's not tested: Cache TTL expiration, cache fallback on API failure, null-payload detection, file lock TTL expiration.
- Files: `server/lib/cache-manager.js`, `server/routes/api.js` (lines 166-213)
- Risk: Cache corruption or stale data served without detection.
- Priority: Medium.

**Auth Flow Untested:**
- What's not tested: Login flow, Google OAuth callback, session persistence, role-based access filtering, admin backdoor, password hashing.
- Files: `server/routes/auth.js`, `server/middleware/requireAuth.js`, `server/middleware/requireRole.js`
- Risk: Auth bypass or role escalation bugs go unnoticed.
- Priority: High.

---

*Concerns audit: 2026-04-16*
