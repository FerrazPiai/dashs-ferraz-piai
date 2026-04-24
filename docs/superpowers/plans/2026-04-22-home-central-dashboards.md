# Home — Central de Dashboards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma página inicial `/` (Central de Dashboards) que apresenta os dashboards acessíveis ao usuário agrupados em 3 categorias (Revenue, Financeiro, Operação), com rows horizontais scrolláveis, cards com hover overlay, modal de documentação rápida e top-nav minimalista com avatar.

**Architecture:** Nova view `Home.vue` renderizada na rota `/` (antes redirect). Layout standalone — sem `VLayout`/sidebar. Componentes compostos: `HomeHeader`, `HomeCategoryRow` (scroll horizontal + setas), `HomeCard` (overlay no hover), `HomeDocsModal`, `HomeUserMenu`. Metadados de categoria e docs no `config/dashboards.json`, expostos via `GET /api/dashboards`.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), Vue Router 4, Pinia, CSS puro com tokens do Design System V4, Lucide Icons (CDN). Sem TypeScript, sem test runner (verificação manual via `npm run dev` + browser).

**Spec de referência:** [`docs/superpowers/specs/2026-04-22-home-central-dashboards-design.md`](../specs/2026-04-22-home-central-dashboards-design.md)

---

## Convenções do plano

- **Sem test runner no projeto** → cada task termina com passo de **verificação visual manual** (`npm run dev` + navegador)
- **Commits frequentes** — um commit por task (prefixo `feat:`, português, lowercase)
- **Caminhos de arquivo** sempre absolutos a partir da raiz do worktree
- **Código completo em cada step** — nada de "implemente similar à task anterior"
- **Dev server** é iniciado uma vez e deixado rodando; cada task verifica visualmente

---

## Task 1 — Categorizar dashboards e adicionar documentação no registry

Adicionar os campos `category`, `shortDescription` e `docs` em cada dashboard do `config/dashboards.json`. Estes metadados alimentam a home. O dashboard oculto (`marketing-vendas`) também recebe os campos por consistência, mas não aparecerá na home (continua com `hidden: true`).

**Files:**
- Modify: `config/dashboards.json` (arquivo inteiro)

- [ ] **Step 1.1: Substituir o conteúdo de `config/dashboards.json` pelo bloco abaixo**

```json
[
  {
    "id": "tx-conv-saber-monetizacao",
    "title": "Conversão Saber → Ter/Executar",
    "icon": "trending-up",
    "componentPath": "TxConvSaberMonetizacao",
    "apiEndpoint": "API_ENDPOINT_CONV_SABER_MONETIZACAO",
    "webhookEndpoint": "WEBHOOK_POST_TX_CONV_SABER_MONETIZACAO",
    "workflowId": "rwnQ8GfuDdSuVZv-h4PR2",
    "cacheTTL": 1800000,
    "status": "available",
    "allowedRoles": ["board", "operacao"],
    "category": "revenue",
    "shortDescription": "Taxa de conversão de Saber para Monetização",
    "docs": {
      "whatItShows": "Evolução da taxa de conversão entre estágios da jornada do cliente (Saber → Ter → Executar → Potencializar) por safra, com breakdown por tier e três visões tabulares toggleáveis (consolidado, por tier e por cliente).",
      "keyMetrics": ["Taxa de conversão por estágio", "Evolução por safra", "Breakdown por tier", "Breakdown por cliente"],
      "whenToUse": "Monitorar a eficiência do funil de monetização pós-aquisição e identificar safras com baixa conversão."
    }
  },
  {
    "id": "gtm-motion",
    "title": "GTM Motion",
    "icon": "activity",
    "componentPath": "GtmMotion",
    "apiEndpoint": "API_ENDPOINT_GTM_MOTION",
    "webhookEndpoint": "WEBHOOK_POST_GTM_MOTION",
    "workflowId": "2sVzeUPxpwI6lsK2",
    "cacheTTL": 300000,
    "status": "available",
    "allowedRoles": ["board", "operacao"],
    "category": "revenue",
    "shortDescription": "Funil de vendas por canal e tier",
    "docs": {
      "whatItShows": "Funil completo de vendas com 7 scorecards (Leads, MQL, SQL, SAL, Commit, Ticket Médio e Booking), tabela de taxas CR1–CR4 e MQL Won, e breakdown por tier (Enterprise, Large, Medium, Small, Tiny, Non-ICP) com subcategorias Saber/Ter/Executar/Potencializar.",
      "keyMetrics": ["Leads", "MQL", "SQL", "SAL", "Commit", "Ticket Médio", "Booking", "Taxas CR1–CR4"],
      "whenToUse": "Analisar performance comercial por canal, identificar gargalos no funil e comparar resultados entre canais e tiers."
    }
  },
  {
    "id": "marketing-vendas",
    "title": "Marketing & Vendas",
    "icon": "bar-chart-2",
    "componentPath": "MarketingVendas",
    "apiEndpoint": "API_ENDPOINT_MARKETING_VENDAS",
    "webhookEndpoint": "WEBHOOK_POST_MARKETING_VENDAS",
    "cacheTTL": 300000,
    "hidden": true,
    "allowedRoles": ["board", "operacao"],
    "category": "revenue",
    "shortDescription": "Visão consolidada de marketing e vendas",
    "docs": {
      "whatItShows": "Três tabelas (visão por tier, por analista e por canal) com métricas agregadas de marketing e vendas.",
      "keyMetrics": ["Métricas por tier", "Métricas por analista", "Métricas por canal"],
      "whenToUse": "Análise cruzada de performance entre tiers, analistas e canais."
    }
  },
  {
    "id": "raio-x-financeiro",
    "title": "Raio-X Financeiro",
    "icon": "git-merge",
    "componentPath": "DreFluxoCaixa",
    "apiEndpoint": "API_ENDPOINT_DIAGRAMA_SANKEY",
    "webhookEndpoint": "WEBHOOK_POST_DIAGRAMA_SANKEY",
    "workflowId": "SdLdkXrCmlm0VL1zWp668",
    "cacheTTL": 300000,
    "status": "available",
    "allowedRoles": ["board"],
    "category": "financeiro",
    "shortDescription": "Fluxo de caixa e indicadores executivos",
    "docs": {
      "whatItShows": "Diagrama de Sankey do fluxo financeiro, 4 KPIs executivos (Receita, Lucro Bruto, EBITDA, Lucro Líquido) e 5 pills de despesas com breakdown de custos.",
      "keyMetrics": ["Receita", "Lucro Bruto", "EBITDA", "Lucro Líquido", "Despesas por categoria"],
      "whenToUse": "Visão executiva da saúde financeira — entender de onde vem a receita, pra onde vai o dinheiro e o lucro final."
    }
  },
  {
    "id": "nps-satisfacao",
    "title": "NPS Satisfação",
    "icon": "smile",
    "componentPath": "NpsSatisfacao",
    "apiEndpoint": "API_ENDPOINT_NPS_SATISFACAO",
    "webhookEndpoint": "WEBHOOK_POST_NPS_SATISFACAO",
    "cacheTTL": 300000,
    "status": "available",
    "allowedRoles": ["board", "operacao"],
    "category": "operacao",
    "shortDescription": "Índice NPS e satisfação de clientes",
    "docs": {
      "whatItShows": "Score NPS consolidado, distribuição entre promotores, neutros e detratores, evolução histórica e breakdown por cliente.",
      "keyMetrics": ["NPS Score", "Promotores", "Neutros", "Detratores"],
      "whenToUse": "Medir satisfação da base e identificar clientes detratores que precisam de atenção imediata."
    }
  },
  {
    "id": "torre-de-controle",
    "title": "Torre de Controle",
    "icon": "tower-control",
    "componentPath": "TorreDeControle",
    "apiEndpoint": "API_ENDPOINT_TORRE_DE_CONTROLE",
    "cacheTTL": 300000,
    "status": "available",
    "statusMessage": "",
    "allowedRoles": ["board", "operacao", "admin"],
    "category": "operacao",
    "shortDescription": "Saúde operacional e oportunidades por cliente",
    "docs": {
      "whatItShows": "Visão consolidada com scorecards, avanço, pontos, qualidade do time e oportunidades por cliente. Inclui matriz de clientes, painel de detalhe e integração com Kommo para oportunidades.",
      "keyMetrics": ["Scorecards", "Avanço", "Pontos", "Qualidade do Time", "Oportunidades"],
      "whenToUse": "Monitorar a saúde operacional da carteira e identificar clientes com oportunidades ou riscos."
    }
  },
  {
    "id": "comparativo-squads",
    "title": "Comparativo Squads",
    "icon": "git-compare",
    "componentPath": "FechamentoMensal",
    "apiEndpoint": "API_ENDPOINT_COMPARATIVO_SQUADS",
    "webhookEndpoint": "WEBHOOK_POST_COMPARATIVO_SQUADS",
    "workflowId": "k13lPwqDqCfQoD8p",
    "cacheTTL": 300000,
    "status": "available",
    "allowedRoles": ["board", "operacao"],
    "category": "operacao",
    "shortDescription": "Comparativo financeiro e operacional entre squads",
    "docs": {
      "whatItShows": "Agregação por squad com métricas de receita recorrente, churn, isenção, monetização recorrente e variável. Comparação mensal entre squads e coordenadores.",
      "keyMetrics": ["Receita Recorrente", "Revenue Churn", "Monetização Recorrente", "Monetização Variável", "Isenção"],
      "whenToUse": "Comparar performance entre squads, identificar outliers de churn e tendências por coordenador."
    }
  },
  {
    "id": "fechamento-financeiro-squads",
    "title": "Fechamento Financeiro — Squads",
    "icon": "wallet",
    "componentPath": "FechamentoFinanceiroSquads",
    "apiEndpoint": "API_ENDPOINT_FECHAMENTO_FINANCEIRO_SQUADS",
    "cacheTTL": 300000,
    "status": "development",
    "statusMessage": "Este dashboard está em desenvolvimento. Os dados serão integrados com o ERP em breve.",
    "allowedRoles": ["board"],
    "category": "financeiro",
    "shortDescription": "Fechamento financeiro mensal por squad",
    "docs": {
      "whatItShows": "Em desenvolvimento. Integrará dados do ERP com breakdown financeiro por squad — receita, custos e margem por time.",
      "keyMetrics": ["Em definição durante a integração com ERP"],
      "whenToUse": "Acompanhar a rentabilidade por squad no fechamento mensal (disponível após integração com ERP)."
    }
  }
]
```

- [ ] **Step 1.2: Restart do server Express para carregar o JSON**

Mudanças em `config/dashboards.json` exigem restart (ver `CLAUDE.md` → Gotchas).

Run (em um terminal separado):
```bash
npm run dev
```

Expected: Vite em `http://localhost:5173` + Express em `http://localhost:3000` (ou porta configurada). Nenhum erro no console do Express.

- [ ] **Step 1.3: Verificar que o JSON ainda é válido e o sidebar continua funcionando**

1. Abrir `http://localhost:5173/gtm-motion` no navegador
2. Logar se necessário
3. Confirmar que a sidebar renderiza todos os dashboards acessíveis como antes
4. Clicar em cada item da sidebar — nenhum deve quebrar

Expected: sidebar idêntica ao estado anterior. Nada visual mudou ainda (só adicionamos metadados).

- [ ] **Step 1.4: Commit**

```bash
git add config/dashboards.json
git commit -m "feat(home): adiciona category, shortDescription e docs no registry"
```

---

## Task 2 — Expor os novos campos na rota `GET /api/dashboards`

Hoje a rota filtra apenas `id, title, icon, status, statusMessage` no payload. Precisa passar a expor também `category`, `shortDescription` e `docs` para a home consumir via `useDashboardsStore`.

**Files:**
- Modify: `server/routes/api.js:413-429`

- [ ] **Step 2.1: Substituir o handler `router.get('/dashboards', ...)`**

Abrir `server/routes/api.js`, localizar a rota atual (linha ~413) e substituir o bloco do handler pelo abaixo. O resto do arquivo fica intacto.

```js
router.get('/dashboards', async (req, res, next) => {
  try {
    const dashboards = await loadDashboardRegistry()
    const userRole = req.session?.user?.role || (req.session?.authenticated ? 'admin' : null)

    const filtered = []
    for (const d of dashboards) {
      if (!d.hidden && (await canAccessDashboard(d, userRole))) {
        filtered.push({
          id: d.id,
          title: d.title,
          icon: d.icon,
          status: d.status,
          statusMessage: d.statusMessage,
          category: d.category || null,
          shortDescription: d.shortDescription || '',
          docs: d.docs || null
        })
      }
    }

    res.json({ dashboards: filtered, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})
```

- [ ] **Step 2.2: Restart do Express**

Se o dev server estiver rodando, o nodemon já deve reiniciar ao salvar `server/routes/api.js`. Se não estiver, rodar `npm run dev`.

Expected: Console do Express sem erros. Logs usuais (request logging) aparecem.

- [ ] **Step 2.3: Verificar payload via navegador ou curl**

Com a sessão ativa (já logado no navegador), abrir outra aba em:
```
http://localhost:5173/api/dashboards
```

Expected (JSON): cada item da lista `dashboards` agora contém `category`, `shortDescription` e `docs` populados. Exemplo de um item:
```json
{
  "id": "gtm-motion",
  "title": "GTM Motion",
  "icon": "activity",
  "status": "available",
  "statusMessage": null,
  "category": "revenue",
  "shortDescription": "Funil de vendas por canal e tier",
  "docs": {
    "whatItShows": "Funil completo de vendas...",
    "keyMetrics": ["Leads", "MQL", "SQL", "SAL", "Commit", "Ticket Médio", "Booking", "Taxas CR1–CR4"],
    "whenToUse": "Analisar performance comercial..."
  }
}
```

Se a resposta for HTML de redirect de login, logar primeiro em `/login` e recarregar.

- [ ] **Step 2.4: Verificar que a sidebar continua funcionando**

Navegar para `/gtm-motion`. Sidebar renderiza igual (só usa `id`, `title`, `icon`, `status` — a adição de novos campos é aditiva).

Expected: nenhuma regressão visual.

- [ ] **Step 2.5: Commit**

```bash
git add server/routes/api.js
git commit -m "feat(home): expoe category, shortDescription e docs em /api/dashboards"
```

---

## Task 3 — Criar `HomeCard.vue`

Card individual do dashboard na home. Estado default mostra ícone + título + descrição curta + status dot. Em hover, card sobe 2px e um overlay fade-in exibe 2 botões empilhados: "Abrir →" (primary) e "Ver documentação" (secondary). Em touch devices (sem hover), overlay permanece sempre visível em opacity 0.85.

**Files:**
- Create: `client/components/home/HomeCard.vue`

- [ ] **Step 3.1: Criar diretório `client/components/home/`**

```bash
mkdir -p client/components/home
```

- [ ] **Step 3.2: Criar `client/components/home/HomeCard.vue`**

```vue
<template>
  <article class="home-card" :class="{ 'is-development': dashboard.status === 'development' }">
    <div class="home-card-content">
      <div class="home-card-top">
        <i :data-lucide="dashboard.icon || 'layout-dashboard'" class="home-card-icon"></i>
        <span
          v-if="dashboard.status"
          class="status-dot"
          :class="`status-dot--${dashboard.status}`"
          :title="statusLabel"
        ></span>
      </div>
      <div class="home-card-text">
        <h3 class="home-card-title">{{ dashboard.title }}</h3>
        <p v-if="dashboard.shortDescription" class="home-card-desc">
          {{ dashboard.shortDescription }}
        </p>
      </div>
    </div>

    <div class="home-card-overlay">
      <button class="home-card-btn home-card-btn--primary" @click="$emit('open', dashboard)">
        <span>Abrir</span>
        <i data-lucide="arrow-right" class="home-card-btn-icon"></i>
      </button>
      <button class="home-card-btn home-card-btn--secondary" @click="$emit('docs', dashboard)">
        <i data-lucide="book-open" class="home-card-btn-icon"></i>
        <span>Ver documentação</span>
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  dashboard: {
    type: Object,
    required: true
  }
})

defineEmits(['open', 'docs'])

const statusLabel = computed(() => {
  const labels = {
    available: 'Disponível',
    development: 'Em desenvolvimento',
    maintenance: 'Em manutenção'
  }
  return labels[props.dashboard.status] || ''
})

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(renderIcons)
watch(() => props.dashboard, renderIcons, { deep: true })
</script>

<style scoped>
.home-card {
  position: relative;
  width: 320px;
  height: 180px;
  flex-shrink: 0;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  padding: 20px;
  cursor: default;
  overflow: hidden;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
}

.home-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 0, 0, 0.25);
}

.home-card-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.home-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.home-card-icon {
  width: 32px;
  height: 32px;
  color: var(--text-medium, #ccc);
  stroke-width: 1.5;
}

.home-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-high, #fff);
  margin: 0 0 6px 0;
  letter-spacing: -0.01em;
}

.home-card-desc {
  font-size: 12px;
  color: var(--text-low, #999);
  line-height: 1.45;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Reaproveita o padrão de status dot da sidebar */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot--available {
  background-color: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}
.status-dot--development {
  background-color: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}
.status-dot--maintenance {
  background-color: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

.home-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 20, 0.92);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  opacity: 0;
  transition: opacity 180ms ease;
  pointer-events: none;
}

.home-card:hover .home-card-overlay {
  opacity: 1;
  pointer-events: auto;
}

.home-card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  min-width: 180px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms ease;
}

.home-card-btn:active {
  transform: scale(0.98);
}

.home-card-btn--primary {
  background: var(--color-primary, #ff0000);
  color: #fff;
}
.home-card-btn--primary:hover {
  background: var(--color-primary-dark, #cc0000);
}

.home-card-btn--secondary {
  background: transparent;
  border-color: #333;
  color: var(--text-medium, #ccc);
}
.home-card-btn--secondary:hover {
  border-color: #555;
  color: var(--text-high, #fff);
}

.home-card-btn-icon {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

/* Touch devices: overlay sempre visível em opacity reduzida */
@media (hover: none) and (pointer: coarse) {
  .home-card-overlay {
    opacity: 0.88;
    pointer-events: auto;
  }
  .home-card:hover {
    transform: none;
  }
}
</style>
```

- [ ] **Step 3.3: Verificação standalone — sem integração ainda**

O componente ainda não está montado em nenhuma rota. Não há o que verificar visualmente agora. Confirmar apenas que:

1. O arquivo existe em `client/components/home/HomeCard.vue`
2. Não há erro de sintaxe (abrir `http://localhost:5173` e checar console do Vite — sem warnings sobre o arquivo)

- [ ] **Step 3.4: Commit**

```bash
git add client/components/home/HomeCard.vue
git commit -m "feat(home): cria HomeCard com overlay de acoes no hover"
```

---

## Task 4 — Criar `HomeDocsModal.vue`

Modal de documentação rápida do dashboard. Tamanho 560px × auto (max 80vh). Header com ícone + título + botão X. Body com 3 seções fixas: "O que mostra", "Principais métricas" (lista com bullets vermelhos), "Quando usar". Footer com botão primary "Abrir dashboard →". Fecha via ESC, click no backdrop e botão X.

**Files:**
- Create: `client/components/home/HomeDocsModal.vue`

- [ ] **Step 4.1: Criar `client/components/home/HomeDocsModal.vue`**

```vue
<template>
  <Transition name="home-modal">
    <div v-if="dashboard" class="home-modal-backdrop" @click.self="close">
      <div class="home-modal" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <header class="home-modal-header">
          <i :data-lucide="dashboard.icon || 'layout-dashboard'" class="home-modal-icon"></i>
          <h2 :id="titleId" class="home-modal-title">{{ dashboard.title }}</h2>
          <button class="home-modal-close" aria-label="Fechar" @click="close">
            <i data-lucide="x"></i>
          </button>
        </header>

        <div class="home-modal-body">
          <section class="home-modal-section">
            <h3 class="home-modal-section-label">O que mostra</h3>
            <p class="home-modal-text">
              {{ docs.whatItShows || 'Documentação em breve.' }}
            </p>
          </section>

          <section class="home-modal-section">
            <h3 class="home-modal-section-label">Principais métricas</h3>
            <ul v-if="docs.keyMetrics && docs.keyMetrics.length" class="home-modal-list">
              <li v-for="m in docs.keyMetrics" :key="m">{{ m }}</li>
            </ul>
            <p v-else class="home-modal-text">Documentação em breve.</p>
          </section>

          <section class="home-modal-section">
            <h3 class="home-modal-section-label">Quando usar</h3>
            <p class="home-modal-text">
              {{ docs.whenToUse || 'Documentação em breve.' }}
            </p>
          </section>
        </div>

        <footer class="home-modal-footer">
          <button class="home-modal-btn" @click="openDashboard">
            <span>Abrir dashboard</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  dashboard: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'open'])

const titleId = computed(() => `home-modal-title-${props.dashboard?.id || 'x'}`)
const docs = computed(() => props.dashboard?.docs || {})

function close() {
  emit('close')
}

function openDashboard() {
  emit('open', props.dashboard)
}

function onKey(e) {
  if (e.key === 'Escape' && props.dashboard) close()
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
})

watch(() => props.dashboard, (v) => {
  if (v) renderIcons()
})
</script>

<style scoped>
.home-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.home-modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
}

.home-modal-icon {
  width: 24px;
  height: 24px;
  color: var(--text-medium, #ccc);
  stroke-width: 1.75;
  flex-shrink: 0;
}

.home-modal-title {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-high, #fff);
  letter-spacing: -0.01em;
}

.home-modal-close {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  transition: color 120ms ease, background 120ms ease;
}
.home-modal-close:hover {
  color: var(--text-high, #fff);
  background: var(--bg-inner, #1a1a1a);
}
.home-modal-close :deep(svg) {
  width: 18px;
  height: 18px;
}

.home-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home-modal-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.home-modal-section-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
}

.home-modal-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-medium, #ccc);
}

.home-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.home-modal-list li {
  font-size: 13px;
  color: var(--text-medium, #ccc);
  padding-left: 16px;
  position: relative;
}
.home-modal-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary, #ff0000);
}

.home-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-row, #1f1f1f);
  display: flex;
  justify-content: flex-end;
}

.home-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: var(--color-primary, #ff0000);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
}
.home-modal-btn:hover { background: var(--color-primary-dark, #cc0000); }
.home-modal-btn:active { transform: scale(0.98); }
.home-modal-btn :deep(svg) {
  width: 14px;
  height: 14px;
  stroke-width: 2.25;
}

/* Animação fade + scale */
.home-modal-enter-active,
.home-modal-leave-active {
  transition: opacity 200ms ease;
}
.home-modal-enter-active .home-modal,
.home-modal-leave-active .home-modal {
  transition: opacity 200ms ease, transform 200ms ease;
}
.home-modal-enter-from,
.home-modal-leave-to {
  opacity: 0;
}
.home-modal-enter-from .home-modal,
.home-modal-leave-to .home-modal {
  opacity: 0;
  transform: scale(0.96);
}
</style>
```

- [ ] **Step 4.2: Verificar sintaxe**

Console do Vite deve ficar sem warnings. Nada a ver visualmente ainda (sem integração).

- [ ] **Step 4.3: Commit**

```bash
git add client/components/home/HomeDocsModal.vue
git commit -m "feat(home): cria HomeDocsModal com 3 secoes de documentacao"
```

---

## Task 5 — Criar `HomeCategoryRow.vue`

Row horizontal scrollável de uma categoria. Exibe label da categoria, renderiza `HomeCard` para cada dashboard e gerencia scroll horizontal (snap + smooth), setas laterais (visíveis no hover, apenas nos lados com overflow) e gradient fade nas bordas com conteúdo oculto. Navegação por teclado com `ArrowLeft`/`ArrowRight`.

**Files:**
- Create: `client/components/home/HomeCategoryRow.vue`

- [ ] **Step 5.1: Criar `client/components/home/HomeCategoryRow.vue`**

```vue
<template>
  <section class="home-row" v-if="dashboards.length > 0">
    <div class="home-row-header">
      <h2 class="home-row-label">{{ label }}</h2>
    </div>

    <div class="home-row-wrapper" @mouseenter="updateOverflow" @mouseleave="onLeave">
      <button
        v-show="canScrollLeft"
        class="home-row-arrow home-row-arrow--left"
        aria-label="Rolar para a esquerda"
        @click="scrollBy(-1)"
      >
        <i data-lucide="chevron-left"></i>
      </button>

      <div
        ref="scrollerRef"
        class="home-row-scroller"
        tabindex="0"
        @scroll="onScroll"
        @keydown="onKey"
      >
        <HomeCard
          v-for="d in dashboards"
          :key="d.id"
          :dashboard="d"
          @open="(payload) => $emit('open', payload)"
          @docs="(payload) => $emit('docs', payload)"
        />
      </div>

      <button
        v-show="canScrollRight"
        class="home-row-arrow home-row-arrow--right"
        aria-label="Rolar para a direita"
        @click="scrollBy(1)"
      >
        <i data-lucide="chevron-right"></i>
      </button>

      <div v-show="canScrollLeft" class="home-row-fade home-row-fade--left" aria-hidden="true"></div>
      <div v-show="canScrollRight" class="home-row-fade home-row-fade--right" aria-hidden="true"></div>
    </div>
  </section>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import HomeCard from './HomeCard.vue'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  dashboards: {
    type: Array,
    required: true
  }
})

defineEmits(['open', 'docs'])

const scrollerRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const CARD_STEP = 336 // 320px card + 16px gap

function updateOverflow() {
  const el = scrollerRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function onScroll() {
  updateOverflow()
}

function onLeave() {
  // mantém estado atual — nada a fazer
}

function scrollBy(dir) {
  const el = scrollerRef.value
  if (!el) return
  el.scrollBy({ left: dir * CARD_STEP, behavior: 'smooth' })
}

function onKey(e) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    scrollBy(1)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    scrollBy(-1)
  }
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

let resizeObserver = null
onMounted(() => {
  nextTick(() => {
    updateOverflow()
    renderIcons()
  })
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    resizeObserver = new ResizeObserver(() => updateOverflow())
    resizeObserver.observe(scrollerRef.value)
  }
  window.addEventListener('resize', updateOverflow)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateOverflow)
  if (resizeObserver) resizeObserver.disconnect()
})

watch(() => props.dashboards, () => {
  nextTick(() => {
    updateOverflow()
    renderIcons()
  })
}, { deep: true })
</script>

<style scoped>
.home-row {
  margin-bottom: 48px;
}

.home-row-header {
  display: flex;
  align-items: center;
  padding: 0 0 14px 0;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
  margin-bottom: 20px;
}

.home-row-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #888);
}

.home-row-wrapper {
  position: relative;
}

.home-row-scroller {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 6px 2px 16px; /* 6px top evita cortar translateY(-2px) do hover */
  scrollbar-width: none;
}
.home-row-scroller::-webkit-scrollbar {
  display: none;
}
.home-row-scroller:focus {
  outline: none;
}
.home-row-scroller:focus-visible {
  outline: 2px solid rgba(255, 0, 0, 0.4);
  outline-offset: 4px;
  border-radius: 4px;
}

.home-row-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid #333;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: var(--text-medium, #ccc);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: 0;
  transition: opacity 180ms ease, background 150ms ease, color 150ms ease, border-color 150ms ease;
}
.home-row-wrapper:hover .home-row-arrow {
  opacity: 0.95;
}
.home-row-arrow:hover {
  background: rgba(30, 30, 30, 0.95);
  color: var(--text-high, #fff);
  border-color: #555;
}
.home-row-arrow--left { left: -8px; }
.home-row-arrow--right { right: -8px; }
.home-row-arrow :deep(svg) {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.home-row-fade {
  position: absolute;
  top: 0;
  bottom: 16px;
  width: 48px;
  pointer-events: none;
  z-index: 1;
}
.home-row-fade--left {
  left: 0;
  background: linear-gradient(to right, var(--bg-body, #0d0d0d), transparent);
}
.home-row-fade--right {
  right: 0;
  background: linear-gradient(to left, var(--bg-body, #0d0d0d), transparent);
}

/* Touch: setas sempre visíveis (sem estado hover) */
@media (hover: none) and (pointer: coarse) {
  .home-row-arrow {
    opacity: 0.9;
  }
}
</style>
```

- [ ] **Step 5.2: Verificação standalone**

Ainda não há o que verificar visualmente. Conferir que o Vite não lança erro de sintaxe no console.

- [ ] **Step 5.3: Commit**

```bash
git add client/components/home/HomeCategoryRow.vue
git commit -m "feat(home): cria HomeCategoryRow com scroll horizontal e setas"
```

---

## Task 6 — Criar `HomeUserMenu.vue`

Avatar circular flutuante no canto superior direito da home + dropdown com nome/role, "Painel Admin" (só se admin) e "Sair". Reaproveita estilo do `sidebar-user-avatar` existente. Fecha com click fora, ESC e ao clicar em um item.

**Files:**
- Create: `client/components/home/HomeUserMenu.vue`

- [ ] **Step 6.1: Criar `client/components/home/HomeUserMenu.vue`**

```vue
<template>
  <div class="home-user-menu" ref="rootRef">
    <button
      class="home-user-avatar"
      :title="userName"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      {{ userInitials }}
    </button>

    <Transition name="home-dropdown">
      <div v-if="open" class="home-dropdown" role="menu">
        <div class="home-dropdown-header">
          <span class="home-dropdown-name">{{ userName }}</span>
          <span class="home-dropdown-role">{{ userRoleLabel }}</span>
        </div>

        <div class="home-dropdown-body">
          <router-link
            v-if="isAdmin"
            to="/admin"
            class="home-dropdown-item"
            role="menuitem"
            @click="close"
          >
            <i data-lucide="settings"></i>
            <span>Painel Admin</span>
          </router-link>

          <button
            class="home-dropdown-item home-dropdown-item--logout"
            role="menuitem"
            @click="handleLogout"
          >
            <i data-lucide="log-out"></i>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const router = useRouter()
const auth = useAuthStore()

const open = ref(false)
const rootRef = ref(null)

const isAdmin = computed(() => auth.isAdmin)
const userName = computed(() => auth.user?.name || 'Usuário')
const userInitials = computed(() => {
  const name = auth.user?.name || ''
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name[0] || 'U').toUpperCase()
})
const userRoleLabel = computed(() => {
  const labels = { admin: 'Administrador', board: 'Board', operacao: 'Operação' }
  return labels[auth.role] || auth.role || ''
})

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

async function handleLogout() {
  close()
  await auth.logout()
  router.push('/login')
}

function onDocClick(e) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target)) close()
}
function onKey(e) {
  if (e.key === 'Escape') close()
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
watch(open, (v) => {
  if (v) renderIcons()
})
</script>

<style scoped>
.home-user-menu {
  position: absolute;
  top: 24px;
  right: 32px;
  z-index: 50;
}

.home-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.12);
  color: #ff4444;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
}
.home-user-avatar:hover { background: rgba(255, 0, 0, 0.18); }
.home-user-avatar:active { transform: scale(0.96); }

.home-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--bg-card, #141414);
  border: 1px solid var(--border-card, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.home-dropdown-header {
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--border-row, #1f1f1f);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.home-dropdown-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-medium, #ccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.home-dropdown-role {
  font-size: 11px;
  color: var(--text-lowest, #666);
}

.home-dropdown-body {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.home-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-low, #999);
  text-decoration: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  text-align: left;
  width: 100%;
}
.home-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-medium, #ccc);
}
.home-dropdown-item :deep(svg) {
  width: 15px;
  height: 15px;
  stroke-width: 2;
}
.home-dropdown-item--logout:hover {
  color: #ff4444;
  background: rgba(255, 0, 0, 0.08);
}

/* Animação fade + slide-down */
.home-dropdown-enter-active,
.home-dropdown-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.home-dropdown-enter-from,
.home-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
```

- [ ] **Step 6.2: Verificação standalone**

Sem integração ainda. Confirmar console do Vite limpo.

- [ ] **Step 6.3: Commit**

```bash
git add client/components/home/HomeUserMenu.vue
git commit -m "feat(home): cria HomeUserMenu com avatar e dropdown"
```

---

## Task 7 — Criar `HomeHeader.vue`

Cabeçalho da home: título `h1` "Central de Dashboards" + subtitle dinâmico no formato `"{N} dashboards ativos · {dia da semana}, {dia} {mês abrev}"`. Usa `Intl.DateTimeFormat('pt-BR')` para a data.

**Files:**
- Create: `client/components/home/HomeHeader.vue`

- [ ] **Step 7.1: Criar `client/components/home/HomeHeader.vue`**

```vue
<template>
  <header class="home-header">
    <h1 class="home-header-title">Central de Dashboards</h1>
    <p class="home-header-subtitle">
      {{ count }} {{ count === 1 ? 'dashboard ativo' : 'dashboards ativos' }}
      <span class="home-header-sep">·</span>
      {{ formattedDate }}
    </p>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: {
    type: Number,
    required: true
  }
})

const formattedDate = computed(() => {
  const now = new Date()
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now)
  const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric' }).format(now)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(now).replace('.', '')
  // "segunda-feira" → "segunda"
  const shortWeekday = weekday.replace(/-feira$/, '')
  return `${shortWeekday}, ${day} ${month}`
})
</script>

<style scoped>
.home-header {
  margin-bottom: 48px;
}

.home-header-title {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: var(--text-high, #fff);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.home-header-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted, #888);
  font-weight: 400;
}

.home-header-sep {
  margin: 0 8px;
  color: var(--text-lowest, #666);
}
</style>
```

- [ ] **Step 7.2: Verificação standalone**

Sem integração ainda. Console do Vite limpo.

- [ ] **Step 7.3: Commit**

```bash
git add client/components/home/HomeHeader.vue
git commit -m "feat(home): cria HomeHeader com titulo e subtitle dinamico"
```

---

## Task 8 — Criar `Home.vue` (view principal)

View principal da home. Standalone (sem `VLayout`). Consome `useDashboardsStore`, agrupa dashboards por `category`, renderiza `HomeHeader` + `HomeUserMenu` + uma `HomeCategoryRow` por categoria não-vazia. Gerencia o estado do modal de docs e emite navegação via `router.push`.

**Files:**
- Create: `client/views/Home.vue`

- [ ] **Step 8.1: Criar `client/views/Home.vue`**

```vue
<template>
  <div class="home-view">
    <HomeUserMenu />

    <main class="home-container">
      <HomeHeader :count="totalCount" />

      <div v-if="loading && totalCount === 0" class="home-empty">
        <p>Carregando dashboards…</p>
      </div>

      <div v-else-if="totalCount === 0" class="home-empty">
        <i data-lucide="inbox" class="home-empty-icon"></i>
        <p>Você não tem acesso a nenhum dashboard. Contate o administrador.</p>
      </div>

      <template v-else>
        <HomeCategoryRow
          v-for="cat in visibleCategories"
          :key="cat.id"
          :label="cat.label"
          :dashboards="groupedDashboards[cat.id]"
          @open="openDashboard"
          @docs="openDocs"
        />
      </template>
    </main>

    <HomeDocsModal
      :dashboard="docsFor"
      @close="docsFor = null"
      @open="openDashboardFromDocs"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardsStore } from '../stores/dashboards.js'
import HomeHeader from '../components/home/HomeHeader.vue'
import HomeUserMenu from '../components/home/HomeUserMenu.vue'
import HomeCategoryRow from '../components/home/HomeCategoryRow.vue'
import HomeDocsModal from '../components/home/HomeDocsModal.vue'

const router = useRouter()
const dashboardsStore = useDashboardsStore()

const CATEGORIES = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacao', label: 'Operação' }
]

const loading = ref(false)
const docsFor = ref(null)

const list = computed(() => dashboardsStore.list)
const totalCount = computed(() => list.value.length)

const groupedDashboards = computed(() => {
  const groups = Object.fromEntries(CATEGORIES.map((c) => [c.id, []]))
  for (const d of list.value) {
    if (d.category && groups[d.category]) {
      groups[d.category].push(d)
    } else if (d.category) {
      // categoria desconhecida — log em dev, ignora em produção
      if (import.meta.env.DEV) {
        console.warn(`[Home] Dashboard "${d.id}" tem category="${d.category}" sem mapeamento em CATEGORIES`)
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[Home] Dashboard "${d.id}" sem campo category — não aparecerá na home`)
      }
    }
  }
  return groups
})

const visibleCategories = computed(() =>
  CATEGORIES.filter((c) => groupedDashboards.value[c.id].length > 0)
)

function openDashboard(dashboard) {
  router.push(`/${dashboard.id}`)
}

function openDocs(dashboard) {
  docsFor.value = dashboard
}

function openDashboardFromDocs(dashboard) {
  docsFor.value = null
  router.push(`/${dashboard.id}`)
}

function renderIcons() {
  nextTick(() => {
    if (window.lucide) window.lucide.createIcons()
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await dashboardsStore.load()
  } finally {
    loading.value = false
    renderIcons()
  }
})

watch(list, renderIcons, { deep: true })
</script>

<style scoped>
.home-view {
  position: relative;
  min-height: 100vh;
  background: var(--bg-body, #0d0d0d);
  color: var(--text-high, #fff);
  font-family: var(--font-family, 'Ubuntu', sans-serif);
}

.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 32px 64px;
}

.home-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 24px;
  color: var(--text-low, #999);
  font-size: 14px;
  gap: 12px;
}

.home-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--text-muted, #888);
  stroke-width: 1.5;
}

@media (max-width: 640px) {
  .home-container {
    padding: 72px 20px 64px;
  }
}
</style>
```

- [ ] **Step 8.2: Verificação standalone**

Ainda não há rota apontando pra `Home.vue`. Console do Vite limpo.

- [ ] **Step 8.3: Commit**

```bash
git add client/views/Home.vue
git commit -m "feat(home): cria view Home compondo header, categorias e modal"
```

---

## Task 9 — Fazer a rota `/` renderizar `Home.vue` (remove redirect)

Hoje a rota `home` tem `component: { render: () => null }` e o `router.beforeEach` faz redirect pra `getDefaultRoute`. Precisa trocar por renderização direta do componente `Home.vue`, e remover os blocos que redirecionam home para o default dashboard. `LoginView` já faz `router.push('/')` — sem mudança lá.

**Files:**
- Modify: `client/router/index.js`

- [ ] **Step 9.1: Substituir `client/router/index.js` pelo conteúdo abaixo**

```js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useDashboardsStore } from '../stores/dashboards.js'
import { initActivityTracker, trackPageView } from '../composables/useActivityTracker.js'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/Home.vue'

// Import dashboards registry
// In production, this should be loaded from API, but for routing we need it statically
import dashboardsConfig from '../../config/dashboards.json'

/**
 * Generate routes from dashboards configuration
 */
const dashboardRoutes = dashboardsConfig.map((dashboard) => ({
  path: `/${dashboard.id}`,
  name: dashboard.id,
  component: () => import(`../dashboards/${dashboard.componentPath}/index.vue`),
  meta: {
    title: dashboard.title,
    isDashboard: true
  }
}))

/**
 * Router configuration
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Login (open)
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },

    // Home — Central de Dashboards (agora renderiza, não redireciona)
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: 'Central de Dashboards' }
    },

    // Dashboard routes (auto-generated)
    ...dashboardRoutes,

    // Admin panel (only admin role)
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../dashboards/Admin/index.vue'),
      meta: { title: 'Admin', requireAdmin: true }
    },

    // Set password (first login or change)
    {
      path: '/criar-senha',
      name: 'set-password',
      component: () => import('../views/SetPassword.vue'),
      meta: { title: 'Criar Senha' }
    },

    // Access denied
    {
      path: '/acesso-negado',
      name: 'access-denied',
      component: () => import('../views/AccessDenied.vue'),
      meta: { title: 'Acesso Negado' }
    },

    // 404 Not Found
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue')
    }
  ]
})

// Auth guard
router.beforeEach(async (to) => {
  if (to.name === 'login' || to.name === 'access-denied') return true

  const auth = useAuthStore()
  await auth.check()

  if (!auth.authenticated) return { name: 'login' }

  // Forcar criacao de senha no primeiro login OAuth
  if (auth.needsPassword && to.name !== 'set-password') {
    return { name: 'set-password' }
  }

  // Admin: libera tudo, sem checks extras
  if (auth.isAdmin) {
    if (to.meta.title) document.title = `${to.meta.title} - Dashboards V4`
    else document.title = 'Dashboards V4'
    return true
  }

  // Bloquear rotas admin-only
  if (to.meta.requireAdmin) {
    return { name: 'home' }
  }

  // Checagem de acesso para dashboards específicos (home é sempre acessível)
  if (to.meta.isDashboard) {
    const dashboards = useDashboardsStore()
    await dashboards.load()
    const accessibleIds = dashboards.list.map((d) => d.id)
    if (!accessibleIds.includes(to.name)) {
      return { name: 'home' }
    }
  }

  // Update page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - Dashboards V4`
  } else {
    document.title = 'Dashboards V4'
  }
})

// Log route changes in development
if (import.meta.env.DEV) {
  router.afterEach((to) => {
    console.log('[Router] Navigated to:', to.path)
  })
}

// Tracker de atividade (sendBeacon, nao-bloqueante)
initActivityTracker()
router.afterEach((to) => {
  // So traqueia rotas com usuario autenticado (auth guard ja rodou no beforeEach)
  const auth = useAuthStore()
  if (!auth.authenticated) return
  if (to.name === 'login' || to.name === 'set-password' || to.name === 'access-denied') return

  trackPageView({
    path: to.path,
    dashboardId: to.meta?.isDashboard ? (to.name || null) : null,
    meta: to.meta?.title ? { title: to.meta.title } : null
  })
})

export default router
```

**Mudanças resumidas em relação ao arquivo atual:**
- Importa `HomeView` de `../views/Home.vue`
- Remove a constante `DEFAULT_DASHBOARD_ID` e a função `getDefaultRoute` (não é mais necessário — home renderiza direto)
- Rota `/` agora tem `component: HomeView` (antes `{ render: () => null }`)
- `beforeEach` não redireciona mais para `getDefaultRoute` quando `to.name === 'home'`
- Dashboard sem permissão redireciona para `{ name: 'home' }` (antes ia pro primeiro acessível)
- Rotas admin-only sem admin redirecionam para `{ name: 'home' }`

- [ ] **Step 9.2: Teste manual — fluxo completo**

Com o dev server rodando (`npm run dev`):

1. **Admin:** logar como admin → cai em `/` → vê todas as 3 categorias (Revenue, Financeiro, Operação) com todos os 7 dashboards visíveis
2. **Avatar canto superior direito:** clicar → dropdown com nome, role "Administrador", "Painel Admin" e "Sair"
3. **Hover em um card:** overlay fade-in com botões "Abrir →" e "Ver documentação"
4. **Click "Abrir":** navega pro dashboard (com sidebar de volta, como antes)
5. **Voltar para `/`:** cai na home novamente
6. **Click "Ver documentação":** modal abre com 3 seções preenchidas (ou placeholder se dashboard não tem `docs`)
7. **Fechar modal:** ESC, click no backdrop, e botão X — todos funcionam
8. **Click "Abrir dashboard" no modal:** fecha modal + navega

Expected: cada etapa comportamento como descrito.

- [ ] **Step 9.3: Teste manual — usuário `board`**

1. Deslogar (via dropdown → "Sair")
2. Logar como usuário `board`
3. Verificar: vê Revenue, Financeiro e Operação (conforme `allowedRoles` dos dashboards)
4. Se alguma categoria tiver só 1 dashboard: sem setas, sem fade, card alinhado à esquerda

Expected: comportamento idêntico ao admin, mas sem "Painel Admin" no dropdown e filtrado por role.

- [ ] **Step 9.4: Teste manual — usuário `operacao`**

1. Deslogar e logar como usuário `operacao`
2. Verificar: **Financeiro não renderiza** (porque `raio-x-financeiro` é board-only e `fechamento-financeiro-squads` também é board-only → categoria vazia omitida)
3. Ver apenas Revenue e Operação

Expected: apenas 2 categorias visíveis, sem label órfão de Financeiro.

- [ ] **Step 9.5: Teste manual — categoria com scroll**

Pra testar o scroll horizontal, simular uma categoria com muitos cards. Edit temporário em `client/views/Home.vue`:

No `groupedDashboards` computed, duplicar dashboards da categoria `revenue` artificialmente:
```js
// APÓS montagem de groups, TEMPORÁRIO:
const fake = [...groups.revenue]
for (let i = 0; i < 3; i++) {
  for (const d of fake) groups.revenue.push({ ...d, id: d.id + '-copy' + i, title: d.title + ' (copy ' + i + ')' })
}
```

Verificar:
1. Row Revenue tem muitos cards, overflow à direita
2. Hover na row → seta direita aparece
3. Click na seta → scroll suave de ~336px
4. Gradient fade aparece nas bordas conforme scroll
5. Focar no scroller (Tab) + setas do teclado → scroll funciona
6. Scroll-snap mantém cards alinhados

**Importante:** reverter o edit temporário antes do commit.

Expected: todos os comportamentos de scroll funcionam.

- [ ] **Step 9.6: Commit**

```bash
git add client/router/index.js
git commit -m "feat(home): roteia / para Home.vue e remove redirect de default"
```

---

## Task 10 — QA manual final, polimento e ajustes

Checklist final cruzando o spec com o implementado. Qualquer ajuste pontual vira commit adicional.

**Files:**
- Review: todos os arquivos criados/modificados nas Tasks 1-9

- [ ] **Step 10.1: Checklist funcional completo**

Rodar com `npm run dev` e conferir em ordem:

- [ ] Login → cai em `/` com título "Central de Dashboards"
- [ ] Subtitle mostra `"N dashboards ativos · dia, DD mês"` em pt-BR
- [ ] 3 categorias renderizam em ordem: Revenue, Financeiro, Operação
- [ ] Cards têm ícone 32px, título, descrição curta (2 linhas max), status dot quando aplicável
- [ ] Card em `development` (Fechamento Financeiro) aparece com bolinha amarela
- [ ] Hover em card: lift 2px + shadow + border vermelha suave + overlay com 2 botões
- [ ] Click "Abrir →" no overlay: navega pro dashboard (sidebar retorna dentro do `VLayout`)
- [ ] Click "Ver documentação": modal abre com 3 seções
- [ ] Modal: fecha com X, ESC e click no backdrop
- [ ] Modal "Abrir dashboard →" navega e fecha modal
- [ ] Avatar canto superior direito: iniciais corretas, tooltip mostra nome
- [ ] Dropdown: nome + role + "Painel Admin" (só admin) + "Sair"
- [ ] Dropdown fecha com click fora, ESC, ou clicando em um item
- [ ] "Sair" faz logout e redireciona pra `/login`

- [ ] **Step 10.2: Checklist RBAC**

- [ ] **Admin:** vê 7 dashboards em 3 categorias + "Painel Admin" no dropdown
- [ ] **Board:** vê 7 dashboards em 3 categorias (todos acessíveis ao board conforme `allowedRoles`), **sem** "Painel Admin"
- [ ] **Operação:** vê apenas Revenue e Operação (Financeiro vazia — ambos dashboards financeiros são board-only)

- [ ] **Step 10.3: Checklist de scroll horizontal**

Se alguma categoria tiver cards que ultrapassam o container de 1100px:
- [ ] Setas aparecem no hover da row
- [ ] Seta esquerda oculta quando scrollLeft = 0
- [ ] Seta direita oculta quando chegou ao fim
- [ ] Gradiente fade só aparece no lado com overflow
- [ ] Scroll-snap alinha cards corretamente
- [ ] Teclado (Tab + setas) funciona
- [ ] Scroll via wheel/trackpad funciona

Se todas as categorias atuais cabem (2-3 cards × 320px + gap ≪ 1100px): sem setas, sem fade — comportamento estático correto.

- [ ] **Step 10.4: Checklist visual / design system**

- [ ] Fundos: body `#0d0d0d`, cards `#141414`, modal `#141414`
- [ ] Fonte Ubuntu carregada (conferir via DevTools → Computed)
- [ ] Vermelho `#ff0000` só em CTAs primários e bullets da lista do modal
- [ ] Nenhum azul como cor primária (ciano só em `--chart-color-8` se usado em ícone — não é o caso aqui)
- [ ] Border-radius entre 4-8px em todos os elementos
- [ ] Status dots com as cores corretas (verde/amarelo/vermelho) e glow sutil

- [ ] **Step 10.5: Checklist mobile (viewport ~400px)**

Abrir DevTools → Device mode (iPhone 12 Pro, 390px):
- [ ] Header ocupa largura sem quebrar
- [ ] Avatar fica no canto sem conflito visual
- [ ] Cards renderizam e o scroll horizontal funciona por touch
- [ ] Overlay do card permanece visível em opacity 0.88 (sem depender de hover)
- [ ] Modal ocupa até `max-width: 560px` com margem lateral
- [ ] Nada quebra o layout nem aparece horizontal scroll na página inteira

- [ ] **Step 10.6: Regressão — dashboards continuam funcionando**

Navegar em cada um dos 7 dashboards visíveis diretamente via URL (ex: `/gtm-motion`, `/torre-de-controle`, etc):
- [ ] Sidebar volta e renderiza com os dashboards acessíveis
- [ ] Nenhum erro no console
- [ ] Dados carregam normalmente (cache ou fresh)
- [ ] Acesso direto a URL funciona mesmo sem passar pela home

- [ ] **Step 10.7: Se encontrar bugs/ajustes**

Corrigir pontualmente e commitar cada ajuste em separado com mensagem descritiva. Exemplos:

```bash
git commit -m "fix(home): ajusta gap entre cards em mobile"
git commit -m "style(home): reduz padding do modal no mobile"
```

- [ ] **Step 10.8: Commit final (se houver QA fixes agregados)**

Se os ajustes forem muitos micro-commits, tudo bem. Não há commit "final" obrigatório — o plano está completo.

---

## Critério de pronto (Definition of Done)

- [ ] Todas as 10 tasks marcadas como concluídas
- [ ] Todos os 6 componentes novos criados em `client/components/home/` e `client/views/`
- [ ] `config/dashboards.json` com `category`, `shortDescription` e `docs` em todos os dashboards
- [ ] `server/routes/api.js` expondo os 3 novos campos
- [ ] Rota `/` renderiza `Home.vue` (não redireciona mais)
- [ ] Checklist RBAC passou nos 3 roles
- [ ] Nenhuma regressão nos dashboards existentes
- [ ] Sem erros no console do browser e do Express

