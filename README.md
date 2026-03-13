# Dashboards V4

> Sistema centralizado de dashboards da V4 Company construído com Vue 3 + Vite + Express

[![Vue 3](https://img.shields.io/badge/Vue-3.4-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)](https://expressjs.com/)

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas API keys

# Rodar em desenvolvimento
npm run dev

# Acessar
open http://localhost:5173
```

## Sobre o Projeto

Aplicação SPA centralizada que consolida todos os dashboards da V4 Company em uma única plataforma. Construída com arquitetura moderna, hot reload instantâneo e componentes reutilizáveis.

### Features

- **Autenticação** — login com sessão server-side (express-session, cookie 8h)
- **Hot Reload < 100ms** via Vite
- **Design System Consistente** — fonte Ubuntu, paleta padronizada sem azul
- **Componentes Reutilizáveis** — VScorecard, VDataTable, VBarChart, VStatusModal, etc.
- **Cache Inteligente** — file-based com TTL configurável por dashboard
- **Router Automático** — rotas geradas do registry `dashboards.json`
- **Status de Dashboard** — indicadores visuais (bolinha) + modal de aviso por status
- **API Proxy** — Express proxia N8N webhooks (evita CORS)

### Stack

**Frontend:** Vue 3 (Composition API) · Vue Router 4 · Pinia 2 · Vite 5

**Backend:** Express.js 4 · Node-Fetch 3 · File-based cache (JSON)

**UI/UX:** Chart.js 4 · chartjs-plugin-datalabels · Lucide Icons · Design System V4

## Estrutura

```
dashboards-v4/
├── client/                    # Frontend Vue 3
│   ├── index.html
│   ├── main.js
│   ├── App.vue
│   ├── router/                # Vue Router (rotas auto-geradas)
│   ├── stores/                # Pinia stores
│   ├── composables/           # useDashboardData, useFormatters, useChartDefaults
│   ├── styles/                # CSS do design system
│   ├── components/
│   │   ├── layout/            # VLayout, VSidebar
│   │   ├── ui/                # VScorecard, VDataTable, VToggleGroup, VRefreshButton, VStatusModal
│   │   └── charts/            # VBarChart, VLineChart, VChartCard
│   └── dashboards/            # Um diretório por dashboard
│       └── NomeDashboard/
│           ├── index.vue      # Componente principal
│           ├── config.js      # Metadata do dashboard
│           └── components/    # Componentes internos
├── server/
│   ├── index.js               # Servidor Express
│   ├── lib/
│   │   ├── api-client.js      # HTTP client (timeout 5min)
│   │   └── cache-manager.js   # File-based cache
│   ├── middleware/
│   │   └── requireAuth.js     # Middleware de autenticação (401 se sem sessão)
│   └── routes/
│       ├── api.js             # /api/dashboards, /api/data/:id, /api/cache/status/:id
│       └── auth.js            # /api/auth/login, /api/auth/logout, /api/auth/check
├── config/
│   └── dashboards.json        # Registry de dashboards
├── dashboards-data/           # Cache gerado em runtime (gitignored)
├── design-system.md           # Especificação visual completa
├── package.json
└── vite.config.js
```

## Dashboards

| Dashboard | Rota | Status |
|-----------|------|--------|
| Conversão Saber → Ter/Executar | `/tx-conv-saber-monetizacao` | Manutenção |
| GTM Motion | `/gtm-motion` | Desenvolvimento (`?mock-data` para dados mock) |
| Marketing & Vendas | `/marketing-vendas` | Oculto |
| Raio-X Financeiro | `/raio-x-financeiro` | Disponível |

### Status dos Dashboards

Cada dashboard pode ter um `status` configurado em `dashboards.json`:

| Status | Cor | Comportamento |
|--------|-----|---------------|
| `available` | Verde | Só exibe bolinha, sem modal |
| `development` | Amarelo | Exibe bolinha + modal de aviso ao abrir |
| `maintenance` | Vermelho | Exibe bolinha + modal de aviso ao abrir |

## Comandos

```bash
npm run dev          # Vite (5173) + Express (3001) em paralelo
npm run build        # Build de produção → dist/
npm run preview      # Preview do build
npm start            # Servidor de produção
npm run server:dev   # Só o backend
npm run client:dev   # Só o frontend
```

## Criar Novo Dashboard

### 1. Criar estrutura

```bash
mkdir -p client/dashboards/MeuDashboard/components
```

### 2. `config.js`

```javascript
export default {
  id: 'meu-dashboard',
  title: 'Meu Dashboard',
  icon: 'bar-chart',
  description: 'Descrição'
}
```

### 3. `index.vue`

```vue
<script setup>
import { computed, onMounted } from 'vue'
import { useDashboardData } from '@/composables/useDashboardData'
import VScorecard from '@/components/ui/VScorecard.vue'
import config from './config'

const { data, loading, fetchData } = useDashboardData(config.id)
const total = computed(() => data.value?.total || 0)

onMounted(() => fetchData())
</script>
```

### 4. Registrar em `config/dashboards.json`

```json
{
  "id": "meu-dashboard",
  "title": "Meu Dashboard",
  "icon": "bar-chart",
  "componentPath": "MeuDashboard",
  "apiEndpoint": "API_ENDPOINT_MEU_DASHBOARD",
  "cacheTTL": 300000,
  "status": "development",
  "statusMessage": "Este dashboard está em desenvolvimento."
}
```

> `status` e `statusMessage` são opcionais. Se omitidos, nenhuma bolinha ou modal é exibido.

### 5. Adicionar no `.env`

```bash
API_ENDPOINT_MEU_DASHBOARD=https://sua-api.com/endpoint
```

A rota `/meu-dashboard` é criada automaticamente pelo router.

## Configuração

### Variáveis de Ambiente

```bash
PORT=3001
NODE_ENV=development

# Autenticação
USER_NAME=seu_usuario
USER_PASSWORD=sua_senha_segura
SESSION_SECRET=troque_por_uma_string_aleatoria_longa

API_ENDPOINT_CONV_SABER_MONETIZACAO=https://...
API_ENDPOINT_GTM_MOTION=https://...
API_ENDPOINT_MARKETING_VENDAS=https://...
API_ENDPOINT_DIAGRAMA_SANKEY=https://...
```

### Cache

- **Localização:** `dashboards-data/{dashboardId}/cache.json` (gitignored)
- **TTL padrão:** 5 minutos (300.000ms), configurável por dashboard
- **Bypass:** `?refresh=true` na URL

### API Timeout

- **Padrão:** 5 minutos — configurável em `server/lib/api-client.js`

## Componentes

### Layout
- `VLayout` — container principal com sidebar
- `VSidebar` — menu lateral com bolinhas de status

### UI
- `VScorecard` — card de KPI com ícone
- `VDataTable` — tabela responsiva com formatters
- `VToggleGroup` — botões de alternância
- `VRefreshButton` — botão de refresh com loading
- `VStatusModal` — modal de aviso de status do dashboard

### Charts
- `VChartCard` — container de gráfico com título
- `VBarChart` — barras verticais ou horizontais
- `VLineChart` — linha com área

### Composables
- `useDashboardData(id)` — fetch, cache e estado de loading
- `useFormatters` — número, porcentagem, moeda
- `useChartDefaults` — configurações padrão do Chart.js

## Design System

- **Fonte:** Ubuntu (Google Fonts)
- **Primária:** `#ff0000` (Vermelho V4)
- **Backgrounds:** `#0d0d0d` → `#141414` → `#1a1a1a`
- **Texto:** `#fff` → `#ccc` → `#999` → `#888` → `#666`
- **Gráficos (sem azul):** Verde · Laranja · Amarelo · Vermelho · Roxo · Verde-limão · Rosa · Cinza

Ver [`design-system.md`](./design-system.md) para especificação completa.

## Deploy

```bash
npm run build
NODE_ENV=production npm start
```

O Express serve `dist/client/` e as rotas de API no mesmo processo.

## Git

Conventional Commits em português, single-line (~50 chars):

```
feat: adicionar dashboard de vendas
fix: corrigir cache sempre forçando refresh
chore: atualizar dependências
refactor: simplificar lógica do tier chart
```

---

Propriedade da **V4 Company** — uso interno.
