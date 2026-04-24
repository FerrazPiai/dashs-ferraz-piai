# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Dashboards V4** - Aplicação SPA centralizada de dashboards da V4 Company. Construída com Vue 3 + Vite + Express, com sistema de cache inteligente e componentes reutilizáveis. UI em português (pt-BR).

## Arquitetura

**Stack:**
- Frontend: Vue 3 + Vite + Vue Router + Pinia
- Backend: Express.js + Node-Fetch + express-session
- Build: Vite (HMR < 100ms)
- Cache: File-based (5 minutos, configurável por dashboard)
- Auth: Sessão server-side com cookie httpOnly (8h)

## Estrutura

```
dashboards-v4/
├── design-system.md           # Design system V4 (fonte Ubuntu, paleta sem azul)
├── .claude/commands/          # Comandos customizados (/commit, /create-feature)
├── client/                    # Frontend Vue 3
│   ├── index.html             # Entry point HTML
│   ├── main.js                # Vue app initialization
│   ├── App.vue                # Root component
│   ├── router/                # Vue Router (auto-generated routes)
│   ├── stores/                # Pinia stores (dashboardData, auth)
│   ├── components/            # Componentes reutilizáveis
│   │   ├── layout/            # VLayout, VSidebar
│   │   ├── ui/                # VScorecard, VDataTable, VToggleGroup, VRefreshButton, VStatusModal
│   │   └── charts/            # VBarChart, VLineChart, VChartCard
│   ├── composables/           # useDashboardData, useFormatters, useChartDefaults
│   ├── styles/                # CSS do design system
│   ├── views/                 # NotFound, LoginView
│   └── dashboards/            # Dashboards específicos
│       ├── TxConvSaberMonetizacao/
│       ├── GtmMotion/
│       ├── MarketingVendas/
│       └── DreFluxoCaixa/     # Diagrama de Sankey
├── server/                    # Backend Express
│   ├── index.js               # Server principal
│   ├── lib/                   # Utilitários
│   │   ├── api-client.js      # HTTP client (timeout 5min)
│   │   └── cache-manager.js   # File-based cache
│   ├── middleware/
│   │   └── requireAuth.js     # 401 se não autenticado
│   └── routes/
│       ├── api.js             # /api/dashboards, /api/data/:id, /api/cache/status/:id
│       └── auth.js            # /api/auth/login, /api/auth/logout, /api/auth/check
├── config/
│   └── dashboards.json        # Registry de dashboards
├── dashboards-data/           # Cache por dashboard (gitignored)
│   └── {dashboardId}/
│       └── cache.json
├── mock/                      # Dados mock para desenvolvimento (gitignored)
├── specs/                     # Specs de features (gitignored)
├── package.json
└── vite.config.js             # Vite config (proxy, build)
```

## Comandos

**Desenvolvimento:**
```bash
npm install          # Instalar dependências
npm run dev          # Rodar Vite (5173) + Express (3001) em paralelo
npm run build        # Build de produção
npm run preview      # Preview do build
npm start            # Servidor de produção
```

**URLs:**
- Frontend (dev): `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Design System

Ver **`design-system.md`** para especificação completa. Principais diretrizes:

- **Fonte:** Ubuntu (Google Fonts), fallback Segoe UI
- **Primary color:** `#ff0000` (vermelho V4)
- **Backgrounds:** `#0d0d0d` (body) → `#141414` (cards) → `#1a1a1a` (inner)
- **Text hierarchy:** `#fff` → `#ccc` → `#999` → `#888` → `#666`
- **Paleta de gráficos (SEM azul):** Verde, Laranja, Amarelo, Vermelho, Roxo, Verde-limão, Rosa, Cinza
- **Border-radius:** 4-6px (conservador)
- **Charts:** Chart.js com grid escuro (`rgba(255,255,255,0.03)`)

## Sistema de Status de Dashboards

Cada dashboard em `config/dashboards.json` pode ter:

```json
{
  "status": "available" | "development" | "maintenance",
  "statusMessage": "Mensagem exibida no modal ao abrir o dashboard"
}
```

**Comportamento:**
- `available` → bolinha verde na sidebar, sem modal
- `development` → bolinha amarela na sidebar + modal de aviso ao navegar
- `maintenance` → bolinha vermelha na sidebar + modal de aviso ao navegar
- Omitir `status` → sem bolinha, sem modal

**Componentes envolvidos:**
- `VSidebar.vue` — renderiza as bolinhas (`.status-dot--{status}`)
- `VStatusModal.vue` — modal com título, label e mensagem
- `VLayout.vue` — observa rota e `dashboards` prop para disparar o modal

## Padrões Comuns

**Cache:**
- File-based, TTL configurável por dashboard (padrão 5min / 300.000ms)
- Armazenado em `dashboards-data/{dashboardId}/cache.json`
- `?refresh=true` bypassa cache
- Gerenciado por `server/lib/cache-manager.js`

**API Proxy:**
- Express proxia APIs externas (N8N webhooks)
- Endpoints em `.env` (`API_ENDPOINT_*`)
- Timeout: 5 minutos (APIs podem demorar)
- Client: `server/lib/api-client.js`

**Componentes Vue:**
- Props tipados, validators quando necessário
- Computed para dados derivados
- Watch para side effects
- Destroy Chart.js instances em `onBeforeUnmount`

**Icons & Charts:**
- Lucide Icons (CDN) - `lucide.createIcons()` após render
- Chart.js + chartjs-plugin-datalabels (CDN)
- Sempre destroy instances anteriores

## Criar Novo Dashboard

**Tempo estimado:** 5-10 minutos

1. **Criar estrutura:**
   ```bash
   mkdir -p client/dashboards/NomeDashboard/components
   ```

2. **Criar `config.js`:**
   ```js
   export default {
     id: 'nome-dashboard',
     title: 'Título do Dashboard',
     icon: 'bar-chart', // Lucide icon name
     description: 'Descrição breve'
   }
   ```

3. **Criar `index.vue`:**
   - Importar composables: `useDashboardData`, `useFormatters`
   - Importar componentes: `VScorecard`, `VDataTable`, etc.
   - Template com scorecards, gráficos, tabelas

4. **Registrar em `config/dashboards.json`:**
   ```json
   {
     "id": "nome-dashboard",
     "title": "Título do Dashboard",
     "icon": "bar-chart",
     "componentPath": "NomeDashboard",
     "apiEndpoint": "API_ENDPOINT_NOME",
     "cacheTTL": 300000,
     "status": "development",
     "statusMessage": "Este dashboard está em desenvolvimento."
   }
   ```

5. **Adicionar endpoint no `.env`:**
   ```
   API_ENDPOINT_NOME=https://sua-api.com/endpoint
   ```

6. **Testar:**
   - O router auto-gera a rota: `/nome-dashboard`
   - Sidebar auto-adiciona o menu com bolinha de status
   - Cache auto-criado em `dashboards-data/nome-dashboard/`

## Git Conventions

- Conventional Commits em português, lowercase, single-line (~50 chars)
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`, `perf:`
- Co-authored footer quando usar Claude
- Sem `--no-verify`

## Autenticação

- **Sessão server-side** via `express-session` (in-memory, cookie httpOnly 8h)
- **Variáveis necessárias:** `USER_NAME`, `USER_PASSWORD`, `SESSION_SECRET` no `.env`
- **Rotas protegidas:** `/api/dashboards`, `/api/data/*`, `/api/cache/*` — retornam 401 sem sessão
- **Rotas abertas:** `/api/auth/*`, `/health`
- **Guard de rota:** `router.beforeEach` chama `GET /api/auth/check` antes de cada navegação
- **Login redireciona para:** `/raio-x-financeiro`
- **`App.vue` carrega `/api/dashboards`** via `watch(route.name)` — só após sair do `/login` (evita fetch sem sessão)
- **`LoginView.vue`** é standalone — sem `VLayout`, sem sidebar

## Comparativo Entre Squads — Estrutura de Dados

A API retorna `[{ data: [...rows] }]` com uma linha por cliente/mês. O frontend agrega em métricas por squad.

**Formato atual dos campos (API via N8N — verificado em 2026-04-24):**

| Campo | Tipo | Observação |
|---|---|---|
| `Mês` | string `dd/mm/yyyy` (ex: `"01/04/2026"`) | Com acento, dia sempre `01` |
| `Squad` | string | Normalizado via `SQUAD_ALIASES` (case-insensitive). Pode vir vazio. |
| `Coordenador` | string | |
| `Status` | string | Ex: `"Recorrência Ativa"` |
| `Receita Recorrente` | number (ex: `6634.23`) | MRR do cliente |
| `Revenue Churn` | number | Churn direto (0 se ativo) |
| `Isenção` | number | Com acento |
| `Monetização Recorrente` | number | Com acento |
| `Monetização One Time` | number | Com acento |
| `Atribuição One Time / Bookado` | number | Com acento, espaço e `/` |
| `Monetização Variável` | number | Com acento |

**Atenção:** O `parseMonth` e `parseCurrency` em `FechamentoMensal/index.vue` são defensivos — aceitam o formato atual (com espaços/acentos, valores numéricos) e também variações legadas (ISO, underscores, `"R$ 0,00"`). Se a fonte mudar de novo, o dashboard não quebra. Dados históricos de 2025 são hardcoded em `historico-2025.js` (não vêm da API).

**Observação de dados:** A API pode retornar Squad como `"V4X"` e `"V4x"` em linhas diferentes — `SQUAD_ALIASES` normaliza via regex `/v4\s*x/i`. Linhas com Squad vazio (`""`) são descartadas por `normalizeSquad`.

## GTM Motion — Estrutura de Dados

O dashboard GTM Motion usa duas fontes de dados da planilha Google Sheets (via N8N):

- **Aba KPIs:** `canal, mes, leads_value, mql_value, ...` — KPIs agregados por canal/mês
- **Aba Funil:** `canal, mes, tier, subcategoria, leads, mql, ...` — Breakdown por tier (Enterprise, Large, Medium, Small, Tiny, Non-ICP) com subcategorias (Saber, Ter, Executar, Potencializar)

O `transformApiData` detecta automaticamente se o campo `tier` está presente nos dados de funil:
- **Com `tier`:** Monta tabela por tier com subcategorias expansíveis
- **Sem `tier`:** Fallback para uma linha por canal

**Mock data:** Acessar com `?mock-data` na URL (ex: `/gtm-motion?mock-data`) força o uso de dados mock com tiers completos, independente da API.

**Seleção de canais:** Single-select — Consolidado (todos) ou um canal específico por vez.

## N8N — Workflows e Webhooks de Atualização

Cada dashboard possui um `workflowId` e `webhookEndpoint` em `config/dashboards.json`. O `N8N_CHECK_STATUS_URL` (`.env`) é compartilhado — recebe `{ workflowId }` via POST para verificar se o workflow está em execução.

| Dashboard | workflowId | Env Webhook POST | Tempo estimado |
|---|---|---|---|
| GTM Motion | `TIeM6pFS2XKAoXS6dRIRu` | `WEBHOOK_POST_GTM_MOTION` | 9–12 min |
| GTM Motion Dev | `2sVzeUPxpwI6lsK2` | — (não configurado) | — |
| Tx. Conversão Saber → Monetização | `rwnQ8GfuDdSuVZv-h4PR2` | `WEBHOOK_POST_TX_CONV_SABER_MONETIZACAO` | 2–5 min |
| Raio-X Financeiro | `SdLdkXrCmlm0VL1zWp668` | `WEBHOOK_POST_DIAGRAMA_SANKEY` | ~1 seg |
| Comparativo Entre Squads | `k13lPwqDqCfQoD8p` | `WEBHOOK_POST_COMPARATIVO_SQUADS` | ~1 seg |

**Fluxo de atualização (todos os dashboards):**
1. Frontend chama `GET /api/update-status/:dashboardId` (verifica file lock + N8N workflow)
2. Se livre → modal de confirmação
3. Usuário confirma → `GET /api/:dashboardId/trigger-update` (rota genérica em `api.js`)
4. Backend verifica lock + N8N, faz POST no webhook, cacheia resposta se houver dados

## Gotchas

- **Vite HMR:** Funciona para Vue/CSS, mas mudanças em `dashboards.json` requerem restart do servidor Express
- **Chart.js instances:** Sempre destroy em `onBeforeUnmount` para evitar memory leaks
- **node-fetch v3:** ESM-only, usar dynamic import: `await import('node-fetch')`
- **Computed deps:** Vue não tracka `array.length`, usar spread `[...array]` se necessário
- **Cache TTL:** 5min padrão, ajustar por dashboard se necessário
- **API timeout:** 5min padrão (APIs podem demorar), ajustar em `api-client.js` se necessário
- **Status modal:** Disparado tanto na troca de rota quanto no carregamento inicial dos dashboards (watch duplo em VLayout)
- **API /api/dashboards:** Retorna `status` e `statusMessage` — ao adicionar novos campos ao registry, verificar se precisam ser expostos nessa rota
- **Sessão in-memory:** Reiniciar o servidor derruba todas as sessões ativas
- **GTM Motion mock-data:** Parâmetro `?mock-data` na URL força dados mock — útil para testar tiers quando a API não retorna breakdown por tier

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dashboards V4 — Hub Centralizado**

Plataforma SPA centralizada de dashboards da V4 Company (Ferraz & Piai). Consolida 7 dashboards operacionais e financeiros em uma unica aplicacao com autenticacao por roles, cache inteligente e integracao direta com workflows n8n. Construida com Vue 3 + Express, deploy via Docker no Easypanel.

**Core Value:** Visao unificada e confiavel das metricas operacionais e financeiras da V4 Company — dados certos, para as pessoas certas, no momento certo.

### Constraints

- **Stack:** Vue 3 + Express + JavaScript puro — nao migrar para TypeScript ou outro framework
- **Deploy:** Docker multi-stage → Easypanel — sem outro provider
- **Design:** Design System V4 (preto/vermelho/branco, Ubuntu, sem azul) — obrigatorio
- **Dados:** Webhooks n8n como unica fonte — sem acesso direto a planilhas
- **Charts CDN:** Chart.js e ECharts carregados via CDN (window.Chart, window.echarts) — nao via npm
- **Idioma:** UI e codigo em portugues (pt-BR), variaveis em ingles
- **Commits:** Conventional commits em portugues, lowercase, co-authored com Claude
- **Seguranca:** Nunca hardcodar secrets, sempre .env + Docker env vars
- **API IA:** Nunca usar API paga Anthropic — usar Claude Max via Agent SDK
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (ES2022+, ESM modules) - All frontend and backend code
- CSS3 - Custom design system styles (no preprocessor)
- HTML5 - Entry point and templates
## Runtime
- Node.js 20 (Alpine) - Specified in `Dockerfile` (`node:20-alpine`)
- Browser: Modern browsers (ES module support required)
- npm (lockfileVersion 3)
- Lockfile: `package-lock.json` present
## Frameworks
- Vue 3 `^3.4.21` - Frontend SPA framework (Composition API, `<script setup>`)
- Vue Router `^4.3.0` - Client-side routing with auto-generated dashboard routes
- Pinia `^2.1.7` - State management (auth store, dashboard data)
- Express `^4.18.3` - Backend API server and static file serving
- Vite `^5.1.5` - Frontend bundler with HMR, dev proxy to Express backend
- `@vitejs/plugin-vue` `^5.0.4` - Vue 3 SFC compilation
- concurrently `^8.2.2` - Runs Vite + Express in parallel during dev
- nodemon `^3.1.0` - Auto-restarts Express on server file changes
- Chart.js `4.4.1` - Bar and line charts (loaded via CDN in `client/index.html`)
- chartjs-plugin-datalabels `2.2.0` - Data label overlay on charts (CDN)
- Apache ECharts `5.5.0` - Sankey diagrams for Raio-X Financeiro (CDN)
- Lucide Icons (latest) - Icon library loaded via CDN in `client/index.html`
## Key Dependencies
- `pg` `^8.20.0` - PostgreSQL client (user management, session storage, profiles)
- `connect-pg-simple` `^10.0.0` - PostgreSQL session store for Express
- `express-session` `^1.19.0` - Server-side session management (cookie httpOnly 8h)
- `bcryptjs` `^3.0.3` - Password hashing for local auth
- `node-fetch` `^3.3.2` - HTTP client for external n8n webhook calls (ESM-only, dynamic import)
- `dotenv` `^16.4.5` - Environment variable loading from `.env`
- `session-file-store` `^1.5.0` - Fallback session store (declared but not actively used; Postgres store is primary)
## Configuration
- `.env` file at project root (required, see `.env.example` for template)
- Critical vars: `SESSION_SECRET` (fatal if missing), `DATABASE_URL`, `PORT`, `NODE_ENV`
- Auth vars: `USER_NAME`, `USER_PASSWORD` (admin backdoor), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_ALLOWED_DOMAINS`
- API endpoint vars: `API_ENDPOINT_*` (one per dashboard, n8n webhook GET URLs)
- Webhook trigger vars: `WEBHOOK_POST_*` (one per dashboard, n8n webhook POST URLs)
- N8N status check: `N8N_CHECK_STATUS_URL`
- `vite.config.js` - Vite config (root: `client/`, proxy `/api` to Express, manual chunks for vue-vendor)
- `config/dashboards.json` - Dashboard registry (7 dashboards, each with id, apiEndpoint, webhookEndpoint, cacheTTL, allowedRoles)
- `Dockerfile` - Multi-stage build (builder: npm ci + vite build; production: npm ci --omit=dev + node server)
- Root: `client/`
- Path alias: `@` maps to `./client`
- Dev proxy: `/api` -> `http://127.0.0.1:{PORT}` with 5min timeout
- Build output: `dist/client/`
- Manual chunks: `vue-vendor` (vue, vue-router, pinia)
## Platform Requirements
- Node.js 20+
- npm (v9+)
- PostgreSQL database (local or remote via `DATABASE_URL`)
- `.env` file with `SESSION_SECRET` at minimum
- Ports: 5173 (Vite dev server), 3000 (Express API)
- Run: `npm run dev` starts both servers via concurrently
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Language
## Naming Patterns
- Vue components: `PascalCase.vue` (e.g., `VScorecard.vue`, `VBarChart.vue`, `GtmFunnelTable.vue`)
- Shared components prefixed with `V`: `VScorecard`, `VDataTable`, `VLayout`, `VToggleGroup`
- Dashboard-specific components prefixed with dashboard abbreviation: `GtmBowTieChart`, `MvSectionTable`, `DreSankeyChart`, `NpsContent`, `TcMatrizTable`
- Composables: `camelCase` with `use` prefix: `useDashboardData.js`, `useFormatters.js`, `useChartDefaults.js`
- Pinia stores: `camelCase` descriptive name: `auth.js`, `dashboardData.js`
- Server files: `kebab-case.js` (e.g., `cache-manager.js`, `api-client.js`)
- Config files: `kebab-case.json` (e.g., `dashboards.json`)
- Dashboard config: always `config.js` inside dashboard folder
- Dashboard entry: always `index.vue` inside dashboard folder
- Migrations: `NNN_description.sql` (e.g., `001_create_hub_tables.sql`)
- Use `camelCase` for all functions: `fetchData`, `formatCurrency`, `transformApiData`, `handleRefresh`
- Event handlers: prefix with `handle` (e.g., `handleRefresh`, `handleLogin`, `handleSelect`)
- Data transformers: prefix with `transform` (e.g., `transformApiData`)
- Format helpers: prefix with `format` (e.g., `formatPercentage`, `formatCurrency`, `formatDateTime`)
- Boolean getters: prefix with `is`/`has`/`can` (e.g., `isUpdateLocked`, `canAccessDashboard`, `hasData`)
- Use `camelCase`: `dashboardId`, `cacheKey`, `fromCache`, `lastUpdateTime`
- Refs: `camelCase` matching the data name: `const loading = ref(false)`, `const data = shallowRef(null)`
- Constants (module-level): `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`, `LOCK_TTL_MS`, `PROFILES_CACHE_TTL`)
- Private module variables: `_camelCase` prefix (e.g., `_profilesCache`, `_profilesCacheTime`)
- Use `--kebab-case` with category prefix: `--bg-card`, `--text-high`, `--color-primary`, `--chart-color-1`, `--spacing-md`, `--radius-sm`, `--font-size-base`
## Code Style
- No Prettier or ESLint configured. Code style is manual/convention-based.
- Indentation: 2 spaces
- Semicolons: not used (no-semicolon style throughout)
- Quotes: single quotes for strings in JS, double quotes in HTML attributes
- Trailing commas: not used consistently
- Max line length: ~120 characters (soft, not enforced)
- No linter configured. Zero linting tooling in `devDependencies`.
- Code quality is enforced by convention and CLAUDE.md guidelines.
## Module System
- `"type": "module"` in `package.json`
- All imports use ES module syntax: `import ... from '...'`
- `node-fetch` v3 requires dynamic import: `const { default: fetch } = await import('node-fetch')`
- `__dirname`/`__filename` not available in ESM; use `fileURLToPath(import.meta.url)` + `dirname()` pattern:
## Import Organization
- `@` maps to `./client` (configured in `vite.config.js`), but rarely used in practice
- Most imports use relative paths (`../../components/...`)
- Always include `.js` extension for local JS imports (ESM requirement)
## Vue Component Patterns
- Always include `type`
- Use `required: true` or provide `default`
- Use `validator` for complex prop validation (arrays of objects):
- Use `modelValue` prop + `update:modelValue` emit (standard Vue 3 pattern)
- See `VToggleGroup.vue` for reference
- Named export function with `use` prefix
- Return an object with refs and methods
- Use `shallowRef` for large data objects (performance)
- Also export as default object for alternative import style
- Use Composition API style (`setup` function), not Options API
- Store name matches filename: `'auth'` in `auth.js`, `'dashboardData'` in `dashboardData.js`
## Chart.js Patterns
## Lucide Icons Pattern
## Error Handling
- Use `try/catch` around `fetch()` calls
- Set `error.value = err.message` for user display
- Redirect to `/login` on 401 responses:
- Log errors with timestamp: `console.error(\`[${new Date().toISOString()}] ...\`, err)`
- Show error state in template with `v-if="error"`:
- Express routes use `try/catch` with `next(error)` for unhandled errors
- Global error handler in `server/index.js` returns structured JSON:
- Error messages in Portuguese for user-facing responses
- All `console.error` and `console.log` include ISO timestamp prefix: `[${new Date().toISOString()}]`
## Logging
## Comments
- JSDoc on all exported functions and composables
- Section dividers in large files using comment blocks:
- Inline comments in Portuguese for business logic explanations
- Config files have JSDoc headers: `/** Dashboard Configuration */`
## Dashboard Structure Convention
## CSS Conventions
- `design-system.css`: CSS custom properties (colors, spacing, typography, etc.)
- `layout.css`: App layout, sidebar, main content area
- `components.css`: Global component classes (`.card`, `.btn`, `.table`, `.scorecards`, `.spinner`)
- `.dashboard-container`, `.main-header`, `.main-title`, `.main-actions`
- `.card`, `.card-header`, `.card-title`, `.card-body`
- `.scorecard`, `.scorecard-label`, `.scorecard-value`
- `.toggle-group`, `.toggle-btn`, `.toggle-btn.active`
- `var(--bg-card)` not `#141414`
- `var(--text-high)` not `#ffffff`
- `var(--color-primary)` not `#ff0000`
- `var(--radius-md)` not `6px`
## Server Route Conventions
## Git Conventions
- Conventional commits in Portuguese, lowercase, single-line (~50 chars)
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`, `perf:`
- Co-authored footer with Claude when applicable
- Never use `--no-verify`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Config-driven dashboard registration via `config/dashboards.json`
- Auto-generated routes from the dashboard registry (no manual route definitions per dashboard)
- Two-tier caching: server-side file cache (`dashboards-data/`) + client-side Pinia store
- Role-based access control (RBAC) with 3 tiers: admin, board, operacao
- Session-based auth with PostgreSQL persistence (Pg sessions) + Google OAuth
- All external data fetched through Express proxy (frontend never calls n8n directly)
## Layers
- Purpose: Render dashboards, handle user interaction, client-side routing
- Location: `client/`
- Contains: Vue components, composables, Pinia stores, router, CSS
- Depends on: Express API (`/api/*` endpoints)
- Used by: End users via browser
- Purpose: Proxy external APIs, manage cache, handle auth, serve static files in production
- Location: `server/`
- Contains: Route handlers, middleware, cache manager, API client, DB connection
- Depends on: PostgreSQL (auth/sessions), n8n webhooks (data), file system (cache)
- Used by: Vue SPA frontend
- Purpose: Define dashboard registry, map endpoints to components
- Location: `config/dashboards.json`
- Contains: Dashboard metadata, API endpoint env var names, cache TTLs, workflow IDs, role permissions
- Depends on: Nothing
- Used by: Both server routes (`loadDashboardRegistry()`) and client router (static import)
- Purpose: Store users, sessions, profiles, access control
- Location: PostgreSQL database (schema `dashboards_hub`)
- Contains: `users`, `sessions`, `profiles` tables
- Depends on: PostgreSQL (via `DATABASE_URL` env var)
- Used by: Auth routes, admin routes, access control checks
- Purpose: Reduce external API calls, improve response time
- Location: `dashboards-data/{dashboardId}/cache.json` (file-based)
- Contains: Timestamped JSON data per dashboard
- Depends on: File system
- Used by: API route handler (`server/routes/api.js`)
## Data Flow
- **Server state:** Express session (PostgreSQL-backed via `connect-pg-simple`)
- **Client auth state:** Pinia `auth` store (`client/stores/auth.js`) -- mirrors server session
- **Client data state:** Pinia `dashboardData` store + `useDashboardData` composable
- **Cache state:** File-based per-dashboard JSON in `dashboards-data/`
## Key Abstractions
- Purpose: Single source of truth for all dashboard configuration
- Each entry maps: `id` -> `componentPath` (Vue), `apiEndpoint` (env var), `webhookEndpoint` (env var), `workflowId` (n8n), `cacheTTL`, `status`, `allowedRoles`
- Pattern: Convention-over-configuration -- add a JSON entry + Vue component to create a new dashboard
- Used by: `server/routes/api.js` (data fetching), `client/router/index.js` (route generation), `client/App.vue` (sidebar)
- Purpose: Each dashboard is a self-contained Vue module
- Location: `client/dashboards/{DashboardName}/`
- Pattern: Each has `index.vue` (main view), `config.js` (metadata), optional `components/` (sub-components), optional `mock-data.js`
- Examples: `client/dashboards/TxConvSaberMonetizacao/`, `client/dashboards/GtmMotion/`, `client/dashboards/DreFluxoCaixa/`
- `client/composables/useDashboardData.js`: Manages fetch lifecycle (loading, error, retry, 401 redirect)
- `client/composables/useFormatters.js`: pt-BR formatting (currency, percentage, dates, numbers)
- `client/composables/useChartDefaults.js`: Chart.js config aligned with V4 design system
- Purpose: Shared visual building blocks across all dashboards
- Location: `client/components/`
- Pattern: `V`-prefixed components (VScorecard, VDataTable, VBarChart, etc.)
- Examples: `client/components/ui/VScorecard.vue`, `client/components/charts/VBarChart.vue`
- Purpose: Avoid repeated n8n API calls within TTL window
- Pattern: Read/write JSON files with timestamp-based TTL validation
- Key: `dashboardId` (or `dashboardId--param1--param2` for parameterized queries)
## Entry Points
- Location: `server/index.js`
- Triggers: `node server/index.js` (production), `nodemon` (development via `npm run dev`)
- Responsibilities: Initialize Express, configure session store (Pg or memory), mount routes, serve SPA in production
- Location: `client/main.js`
- Triggers: Vite dev server or built `index.html`
- Responsibilities: Create Vue app, register Pinia + Router, mount to `#app`, initialize Chart.js datalabels + Lucide icons
- Location: `client/index.html`
- Triggers: Browser navigation
- Responsibilities: Load CDN dependencies (Lucide, Chart.js, ECharts), link design system CSS, mount Vue app
- Location: `Dockerfile`
- Triggers: Docker build/run for Easypanel deployment
- Responsibilities: Multi-stage build (npm ci + vite build -> production image with Express serving static + API)
## Error Handling
- `useDashboardData` composable retries once (1.5s delay) on transient errors (empty response, fetch failure)
- `useDashboardData` redirects to `/login` on 401 responses
- Express has global error middleware that logs and returns structured JSON errors with timestamp
- API route falls back to expired cache when fresh fetch returns empty/null data
- Server returns 503 when no data available (fresh or cached) with user-friendly message
- File lock on update operations auto-expires after 10 minutes (prevents stuck locks)
## Cross-Cutting Concerns
- Server: `console.log/error` with ISO timestamp prefix `[YYYY-MM-DDTHH:mm:ss.sssZ]`
- Client: `console.log` with `[Store]` or `[Router]` prefix
- Request logging middleware logs method + URL for every request
- Dashboard access: DB-first profile check (`profiles.allowed_dashboards`), fallback to `dashboards.json` `allowedRoles`
- Auth: Session cookie validation + `requireAuth` middleware on protected routes
- Admin routes: `requireRole(['admin'])` middleware
- Input validation in auth routes (email/password presence, password length >= 6)
- Dual auth: email/password (bcrypt) + Google OAuth
- Emergency admin backdoor via `.env` (`USER_NAME` + `USER_PASSWORD`)
- Session stored in PostgreSQL (`dashboards_hub.sessions` table) via `connect-pg-simple`
- Cookie: httpOnly, secure in production, sameSite lax, 8h TTL
- New OAuth users auto-created as `operacao` role (domain-restricted)
- First-login flow: OAuth users without password redirected to `/criar-senha`
- 3 built-in roles: `admin` (full access), `board` (financial + operational dashboards), `operacao` (operational dashboards only)
- Profiles table in DB allows dynamic dashboard permission management
- Admin panel at `/admin` for user/profile CRUD
- Admin always bypasses all access checks
- Dashboard visibility filtered server-side in `GET /api/dashboards`
- Dashboard data access checked server-side in `GET /api/data/:dashboardId`
- Client-side router guard redirects unauthorized users silently
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| agent-browser | Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction. | `.claude/skills/agent-browser/SKILL.md` |
| find-skills | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. | `.claude/skills/find-skills/SKILL.md` |
| ui-ux-pro-max | "UI/UX design intelligence. 67 styles, 96 palettes, 57 font pairings, 25 charts, 13 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient. Integrations: shadcn/ui MCP for component search and examples." | `.claude/skills/ui-ux-pro-max/SKILL.md` |
| vue-best-practices | MUST be used for Vue.js tasks. Strongly recommends Composition API with `<script setup>` and TypeScript as the standard approach. Covers Vue 3, SSR, Volar, vue-tsc. Load for any Vue, .vue files, Vue Router, Pinia, or Vite with Vue work. ALWAYS use Composition API unless the project explicitly requires Options API. | `.claude/skills/vue-best-practices/SKILL.md` |
| frontend-design | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. | `.agents/skills/frontend-design/SKILL.md` |
| web-design-guidelines | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". | `.agents/skills/web-design-guidelines/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
