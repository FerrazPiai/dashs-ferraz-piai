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

## GTM Motion — Estrutura de Dados

O dashboard GTM Motion usa duas fontes de dados da planilha Google Sheets (via N8N):

- **Aba KPIs:** `canal, mes, leads_value, mql_value, ...` — KPIs agregados por canal/mês
- **Aba Funil:** `canal, mes, tier, subcategoria, leads, mql, ...` — Breakdown por tier (Enterprise, Large, Medium, Small, Tiny, Non-ICP) com subcategorias (Saber, Ter, Executar, Potencializar)

O `transformApiData` detecta automaticamente se o campo `tier` está presente nos dados de funil:
- **Com `tier`:** Monta tabela por tier com subcategorias expansíveis
- **Sem `tier`:** Fallback para uma linha por canal

**Mock data:** Acessar com `?mock-data` na URL (ex: `/gtm-motion?mock-data`) força o uso de dados mock com tiers completos, independente da API.

**Seleção de canais:** Single-select — Consolidado (todos) ou um canal específico por vez.

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
