# Technology Stack

**Analysis Date:** 2026-04-16

## Languages

**Primary:**
- JavaScript (ES2022+, ESM modules) - All frontend and backend code

**Secondary:**
- CSS3 - Custom design system styles (no preprocessor)
- HTML5 - Entry point and templates

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Specified in `Dockerfile` (`node:20-alpine`)
- Browser: Modern browsers (ES module support required)

**Package Manager:**
- npm (lockfileVersion 3)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Vue 3 `^3.4.21` - Frontend SPA framework (Composition API, `<script setup>`)
- Vue Router `^4.3.0` - Client-side routing with auto-generated dashboard routes
- Pinia `^2.1.7` - State management (auth store, dashboard data)
- Express `^4.18.3` - Backend API server and static file serving

**Build/Dev:**
- Vite `^5.1.5` - Frontend bundler with HMR, dev proxy to Express backend
- `@vitejs/plugin-vue` `^5.0.4` - Vue 3 SFC compilation
- concurrently `^8.2.2` - Runs Vite + Express in parallel during dev
- nodemon `^3.1.0` - Auto-restarts Express on server file changes

**Charting (CDN, not npm):**
- Chart.js `4.4.1` - Bar and line charts (loaded via CDN in `client/index.html`)
- chartjs-plugin-datalabels `2.2.0` - Data label overlay on charts (CDN)
- Apache ECharts `5.5.0` - Sankey diagrams for Raio-X Financeiro (CDN)

**Icons (CDN):**
- Lucide Icons (latest) - Icon library loaded via CDN in `client/index.html`

## Key Dependencies

**Critical:**
- `pg` `^8.20.0` - PostgreSQL client (user management, session storage, profiles)
- `connect-pg-simple` `^10.0.0` - PostgreSQL session store for Express
- `express-session` `^1.19.0` - Server-side session management (cookie httpOnly 8h)
- `bcryptjs` `^3.0.3` - Password hashing for local auth
- `node-fetch` `^3.3.2` - HTTP client for external n8n webhook calls (ESM-only, dynamic import)
- `dotenv` `^16.4.5` - Environment variable loading from `.env`

**Infrastructure:**
- `session-file-store` `^1.5.0` - Fallback session store (declared but not actively used; Postgres store is primary)

## Configuration

**Environment:**
- `.env` file at project root (required, see `.env.example` for template)
- Critical vars: `SESSION_SECRET` (fatal if missing), `DATABASE_URL`, `PORT`, `NODE_ENV`
- Auth vars: `USER_NAME`, `USER_PASSWORD` (admin backdoor), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_ALLOWED_DOMAINS`
- API endpoint vars: `API_ENDPOINT_*` (one per dashboard, n8n webhook GET URLs)
- Webhook trigger vars: `WEBHOOK_POST_*` (one per dashboard, n8n webhook POST URLs)
- N8N status check: `N8N_CHECK_STATUS_URL`

**Build:**
- `vite.config.js` - Vite config (root: `client/`, proxy `/api` to Express, manual chunks for vue-vendor)
- `config/dashboards.json` - Dashboard registry (7 dashboards, each with id, apiEndpoint, webhookEndpoint, cacheTTL, allowedRoles)
- `Dockerfile` - Multi-stage build (builder: npm ci + vite build; production: npm ci --omit=dev + node server)

**Vite Config Details:**
- Root: `client/`
- Path alias: `@` maps to `./client`
- Dev proxy: `/api` -> `http://127.0.0.1:{PORT}` with 5min timeout
- Build output: `dist/client/`
- Manual chunks: `vue-vendor` (vue, vue-router, pinia)

## Platform Requirements

**Development:**
- Node.js 20+
- npm (v9+)
- PostgreSQL database (local or remote via `DATABASE_URL`)
- `.env` file with `SESSION_SECRET` at minimum
- Ports: 5173 (Vite dev server), 3000 (Express API)
- Run: `npm run dev` starts both servers via concurrently

**Production:**
- Docker (multi-stage build, `node:20-alpine`)
- PostgreSQL database (Easypanel managed, schema `dashboards_hub`)
- Easypanel deployment with auto-SSL (Let's Encrypt)
- Port 80 inside container (configurable via `PORT` env var)
- Health check: `GET /health` (30s interval)
- Volume mount recommended for `dashboards-data/` (file-based cache)

## Module System

- `"type": "module"` in `package.json` - All code uses ESM (`import`/`export`)
- `node-fetch` v3 requires dynamic import: `await import('node-fetch')` in `server/lib/api-client.js`
- Dashboard routes use dynamic imports: `() => import('../dashboards/${componentPath}/index.vue')`

## Fonts & Design Tokens

- Google Fonts: Ubuntu (300, 400, 500, 700) loaded in `client/index.html`
- Design system CSS: `client/styles/design-system.css`, `client/styles/layout.css`, `client/styles/components.css`
- Primary color: `#ff0000` (V4 red)
- Background hierarchy: `#0d0d0d` (body) -> `#141414` (cards) -> `#1a1a1a` (inner)
- Chart color palette (no blue): Green, Orange, Yellow, Red, Purple, Lime, Pink, Gray

---

*Stack analysis: 2026-04-16*
