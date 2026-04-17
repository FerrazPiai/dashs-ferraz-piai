# Torre de Controle — Kommo Context Enrichment

> **⚠ APPROVAL GATE:** implementar tudo sem commitar. Ao final, `npm run build` + smoke test + relatorio. Usuario commita depois.

**Goal:** Usar os 157 custom fields descobertos no Kommo (analise em `docs/superpowers/kommo-custom-fields-analysis.md`) para enriquecer Torre de Controle com contexto real dos clientes e novas visualizacoes.

**Depende de:** Super Painel ja implementado (plan anterior), token Kommo valido, 96 leads no pipeline Saber.

---

## Task 1 — Enriquecer Super Painel com contexto Kommo

**Arquivos:** `client/dashboards/TorreDeControle/components/TcSuperPainel.vue`

- [ ] **Step 1:** Criar helper `getCF(cliente, fieldId)` dentro do `<script setup>`:

```js
function getCF(fieldId) {
  const f = (props.cliente.custom_fields || []).find(x => x.field_id === fieldId)
  return f?.values?.[0]?.value || null
}
const contextoKommo = computed(() => ({
  descricao: getCF(1989878),
  objetivo: getCF(1989880),
  dores: getCF(1989898),
  disc: getCF(1989922),
  stack: getCF(1989904),
  participantes: getCF(1989914),
  tier: getCF(1989461),
  ticketMedio: getCF(1989908),
  valorProduto: getCF(1989767),
  squad: getCF(1989938),
  flag: getCF(1989972)
}))
```

- [ ] **Step 2:** Adicionar no header do super painel (apos `.sp-meta`):

```html
<div v-if="contextoKommo.tier || contextoKommo.flag" class="sp-badges">
  <span v-if="contextoKommo.tier" class="badge badge--tier">{{ contextoKommo.tier }}</span>
  <span v-if="contextoKommo.flag" class="badge" :class="`badge--flag-${contextoKommo.flag.toLowerCase()}`">
    {{ contextoKommo.flag }}
  </span>
  <span v-if="contextoKommo.squad" class="badge badge--squad">Squad: {{ contextoKommo.squad }}</span>
</div>
```

- [ ] **Step 3:** Nova secao "Contexto Kommo" antes do `sp-body`:

```html
<section v-if="contextoKommo.descricao || contextoKommo.dores" class="sp-contexto">
  <div class="ctx-card" v-if="contextoKommo.descricao">
    <h3>Descricao da Empresa</h3>
    <p>{{ contextoKommo.descricao }}</p>
  </div>
  <div class="ctx-card" v-if="contextoKommo.objetivo">
    <h3>Objetivo da Empresa</h3>
    <p>{{ contextoKommo.objetivo }}</p>
  </div>
  <div class="ctx-card ctx-card--dores" v-if="contextoKommo.dores">
    <h3>Dores do Negocio</h3>
    <p>{{ contextoKommo.dores }}</p>
  </div>
  <div class="ctx-card" v-if="contextoKommo.stack">
    <h3>Stack de Ferramentas</h3>
    <p>{{ contextoKommo.stack }}</p>
  </div>
  <div class="ctx-card" v-if="contextoKommo.disc">
    <h3>Perfil DISC</h3>
    <p>{{ contextoKommo.disc }}</p>
  </div>
  <div class="ctx-card" v-if="contextoKommo.participantes">
    <h3>Participantes</h3>
    <p>{{ contextoKommo.participantes }}</p>
  </div>
</section>
```

- [ ] **Step 4:** Scoped styles para badges e ctx-cards:

```css
.sp-badges { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.badge {
  padding: 2px 8px; border-radius: 4px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
}
.badge--tier { background: var(--bg-inner); color: var(--text-high); }
.badge--squad { background: var(--bg-inner); color: var(--text-low); }
.badge--flag-safe { background: var(--color-safe); color: #fff; }
.badge--flag-care { background: var(--color-care); color: #000; }
.badge--flag-risk, .badge--flag-danger { background: var(--color-danger); color: #fff; }

.sp-contexto {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md); padding: 0 var(--spacing-lg) var(--spacing-md);
}
.ctx-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-md); padding: var(--spacing-md);
}
.ctx-card h3 {
  font-size: var(--font-size-sm); color: var(--text-low);
  margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;
}
.ctx-card p {
  color: var(--text-medium); margin: 0;
  font-size: var(--font-size-base); line-height: 1.5;
  white-space: pre-wrap;
}
.ctx-card--dores { border-left: 3px solid var(--color-danger); }
```

---

## Task 2 — RAG Camada 4 (Contexto Kommo)

**Arquivos:** `server/services/rag-engine.js`, `server/services/tc-analyzer.js`

- [ ] **Step 1:** Adicionar `buildLayer4` em `rag-engine.js` apos `buildLayer3`:

```js
const L4_BUDGET = parseInt(process.env.RAG_LAYER4_BUDGET || '1500', 10)

async function buildLayer4(leadId) {
  // Busca custom fields textarea ricos via cache da matriz
  const { rows: [lead] } = await pool.query(`
    SELECT c.id_externo, c.nome FROM dashboards_hub.tc_clientes c WHERE c.id_externo = $1
  `, [leadId]).catch(() => ({ rows: [] }))
  if (!lead) return { text: '', rows: 0 }

  // Importa cache do torre-controle (shared module)
  const { getCachedLeadCustomFields } = await import('./kommo-cache.js')
  const cf = getCachedLeadCustomFields(leadId)
  if (!cf) return { text: '', rows: 0 }

  const campos = {
    'Descricao da Empresa': 1989878,
    'Objetivo da Empresa': 1989880,
    'Dores do Negocio': 1989898,
    'Stack de Ferramentas': 1989904,
    'Participantes': 1989914,
    'DISC': 1989922,
    'Cenario do Marketing': 1989890,
    'Consciencia das Metricas': 1989892
  }
  const parts = []
  for (const [label, fieldId] of Object.entries(campos)) {
    const f = cf.find(x => x.field_id === fieldId)
    const val = f?.values?.[0]?.value
    if (val) parts.push(`### ${label}\n${val}`)
  }
  const text = parts.join('\n\n')
  return { text: truncateToTokens(text, L4_BUDGET), rows: parts.length }
}
```

- [ ] **Step 2:** Criar `server/services/kommo-cache.js` — expoe cache da matriz para o RAG:

```js
// Shared cache dos leads Kommo — usado por torre-controle route E rag-engine.
let _cache = null
let _at = 0
const TTL = 60_000

export function setKommoCache(data) {
  _cache = data
  _at = Date.now()
}

export function getKommoCache() {
  if (!_cache || Date.now() - _at > TTL) return null
  return _cache
}

export function getCachedLeadCustomFields(leadId) {
  const cache = getKommoCache()
  if (!cache) return null
  const lead = cache.leads?.find(l => String(l.id) === String(leadId))
  return lead?.custom_fields_values || null
}
```

- [ ] **Step 3:** Em `server/routes/torre-controle.js`, substituir `_matrizCache` local por `setKommoCache/getKommoCache` importado de `../services/kommo-cache.js`. Ajustar as referencias em `/matriz` e `/cliente/:id/fase/:faseId` e `/colaboradores`.

- [ ] **Step 4:** Em `rag-engine.js`, atualizar `buildRagContext` para incluir camada 4:

```js
export async function buildRagContext({ projetoFaseId, fase, queryText, leadId }) {
  const [l1, l2, l3, l4] = await Promise.all([
    buildLayer1(projetoFaseId),
    buildLayer2(projetoFaseId, queryText),
    buildLayer3(fase),
    buildLayer4(leadId)
  ])
  const context = {
    historico_cliente: l1.text,
    casos_similares:   l2.text,
    base_conhecimento: l3.text,
    contexto_kommo:    l4.text
  }
  // ... resto igual, adicionar l4 em metadata
  return {
    context,
    metadata: {
      layer1_rows: l1.rows, layer2_rows: l2.rows,
      layer3_rows: l3.rows, layer4_rows: l4.rows,
      tokens_aproximado: countTokens(JSON.stringify(context))
    }
  }
}
```

- [ ] **Step 5:** Em `tc-analyzer.js`, passar `leadId` para `buildRagContext`:

```js
const { context: ragContext, metadata: ragMeta } = await buildRagContext({
  projetoFaseId, fase, queryText, leadId
})
```

- [ ] **Step 6:** Adicionar `RAG_LAYER4_BUDGET=1500` em `.env.example`.

---

## Task 3 — Scorecards financeiros no Painel Geral

**Arquivos:** `server/routes/torre-controle.js`, `client/dashboards/TorreDeControle/components/TcPainelGeral.vue`

- [ ] **Step 1:** Nova funcao helper no route — agregacao de custom fields monetary (faz in-memory pois cache ja tem os leads):

```js
function agregarFinanceiro(leads) {
  const sum = (fieldId) => leads.reduce((a, l) => {
    const cf = l.custom_fields_values || []
    const v = cf.find(x => x.field_id === fieldId)?.values?.[0]?.value
    return a + (parseFloat(v) || 0)
  }, 0)
  const avg = (fieldId) => {
    const vals = leads
      .map(l => parseFloat((l.custom_fields_values || []).find(x => x.field_id === fieldId)?.values?.[0]?.value))
      .filter(n => !isNaN(n) && n > 0)
    return vals.length ? vals.reduce((a, b) => a + b) / vals.length : 0
  }
  return {
    receita_contratada: sum(1989767), // Valor Produto 1
    ticket_medio: avg(1989908),       // Ticket Medio
    lucro_liquido: sum(1989910),      // Lucro Liquido
    verba_trafego: sum(1989896)       // Verba em trafego
  }
}
```

- [ ] **Step 2:** Em `/painel-geral`, adicionar `financeiro: agregarFinanceiro(leads)` no retorno. Usar o cache Kommo existente.

- [ ] **Step 3:** Em `TcPainelGeral.vue`, adicionar nova linha de scorecards financeiros abaixo dos 5 existentes:

```html
<div class="scorecards-row scorecards-row--financeiro">
  <VScorecard label="Receita Contratada"
              :value="`R$ ${Number(fin.receita_contratada || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`" />
  <VScorecard label="Ticket Medio"
              :value="`R$ ${Number(fin.ticket_medio || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`" />
  <VScorecard label="Lucro Liquido"
              :value="`R$ ${Number(fin.lucro_liquido || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`" />
  <VScorecard label="Verba em Trafego"
              :value="`R$ ${Number(fin.verba_trafego || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`" />
</div>
```

```js
const fin = computed(() => tc.painelGeral.value?.financeiro || {})
```

---

## Task 4 — Tab Distribuicao (4 donuts)

**Arquivos:** `client/dashboards/TorreDeControle/components/TcTabDistribuicao.vue` (novo), `TcPainelGeral.vue`, `server/routes/torre-controle.js`

- [ ] **Step 1:** Backend — adicionar em `/painel-geral` o campo `distribuicao`:

```js
function agregarDistribuicao(leads) {
  const count = (fieldId) => {
    const m = new Map()
    for (const l of leads) {
      const cf = l.custom_fields_values || []
      const v = cf.find(x => x.field_id === fieldId)?.values?.[0]?.value
      if (!v) continue
      m.set(v, (m.get(v) || 0) + 1)
    }
    return [...m.entries()].map(([label, value]) => ({ label, value }))
  }
  return {
    tier:        count(1989461),
    canal:       count(1989435),
    flag:        count(1989972),
    urgencia:    count(1989918)
  }
}
```

Adicionar `distribuicao: agregarDistribuicao(leads)` no JSON de `/painel-geral`.

- [ ] **Step 2:** Criar `TcTabDistribuicao.vue` — 4 donuts em grid 2x2 usando Chart.js:

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({ distribuicao: { type: Object, required: true } })

const canvases = {
  tier: ref(null), canal: ref(null), flag: ref(null), urgencia: ref(null)
}
const charts = {}
const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#84cc16', '#f43f5e', '#06b6d4', '#6b7280']

function render(key, dados) {
  if (charts[key]) charts[key].destroy()
  const ctx = canvases[key].value
  if (!ctx || !dados?.length) return
  charts[key] = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dados.map(d => d.label),
      datasets: [{ data: dados.map(d => d.value), backgroundColor: COLORS, borderWidth: 0 }]
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { color: '#ccc', font: { size: 11 } } } },
      maintainAspectRatio: false
    }
  })
}

function renderAll() {
  render('tier', props.distribuicao?.tier)
  render('canal', props.distribuicao?.canal)
  render('flag', props.distribuicao?.flag)
  render('urgencia', props.distribuicao?.urgencia)
}

onMounted(renderAll)
watch(() => props.distribuicao, renderAll, { deep: true })
onBeforeUnmount(() => Object.values(charts).forEach(c => c?.destroy()))
</script>

<template>
  <div class="tab-distribuicao">
    <div class="donut-grid">
      <div class="donut-card">
        <h3>Tier</h3>
        <canvas ref="canvases.tier"></canvas>
      </div>
      <div class="donut-card">
        <h3>Canal de Origem</h3>
        <canvas ref="canvases.canal"></canvas>
      </div>
      <div class="donut-card">
        <h3>Flag (Risco)</h3>
        <canvas ref="canvases.flag"></canvas>
      </div>
      <div class="donut-card">
        <h3>Urgencia</h3>
        <canvas ref="canvases.urgencia"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.donut-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg); }
.donut-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-md); padding: var(--spacing-md);
  display: flex; flex-direction: column; gap: var(--spacing-sm);
  min-height: 300px;
}
.donut-card h3 { color: var(--text-high); margin: 0; font-size: var(--font-size-base); }
.donut-card canvas { flex: 1; min-height: 240px; }
@media (max-width: 768px) { .donut-grid { grid-template-columns: 1fr; } }
</style>
```

Nota: usar `ref` no template com objeto — aceitavel em Vue 3.

- [ ] **Step 3:** Em `TcPainelGeral.vue`, registrar nova tab:

```js
import TcTabDistribuicao from './TcTabDistribuicao.vue'

const TABS = [
  { key: 'visao-geral',   label: 'Visao Geral' },
  { key: 'distribuicao',  label: 'Distribuicao' },
  { key: 'churn',         label: 'Churn' },
  { key: 'oportunidades', label: 'Oportunidades' },
  { key: 'colaboradores', label: 'Accounts' }
]
```

```html
<TcTabDistribuicao
  v-else-if="tabAtiva === 'distribuicao'"
  :distribuicao="tc.painelGeral.value.distribuicao || {}"
/>
```

---

## Task 5 — Filtro Tier na Matriz

**Arquivos:** `server/routes/torre-controle.js`, `client/dashboards/TorreDeControle/index.vue`

- [ ] **Step 1:** Backend — adicionar `tier` no cliente retornado por `/matriz`:

No bloco `const clientes = leads.map(lead => { ... })`, adicionar:
```js
const tier = getCustomFieldValue(cf, 1989461) // Tier
```
E incluir `tier` no objeto retornado.

- [ ] **Step 2:** Frontend — em `index.vue`:

Adicionar novo filter-group apos Account:
```html
<div class="filter-group">
  <label class="filter-label">Tier</label>
  <select class="filter-select" v-model="tierSelecionado">
    <option value="todos">Todos</option>
    <option v-for="t in tiersDisponiveis" :key="t" :value="t">{{ t }}</option>
  </select>
</div>
```

No script:
```js
const tierSelecionado = ref('todos')
const tiersDisponiveis = computed(() => {
  const set = new Set()
  for (const c of clientes.value) if (c.tier) set.add(c.tier)
  return [...set].sort()
})
```

Em `clientesFiltrados`, adicionar:
```js
if (tierSelecionado.value !== 'todos') {
  lista = lista.filter(c => c.tier === tierSelecionado.value)
}
```

---

## Smoke Tests + Entrega

- [ ] **Step A:** `npm run build` — deve passar em < 3s sem erros
- [ ] **Step B:** Reiniciar dev server (`npm run dev`) e verificar logs sem erros
- [ ] **Step C:** Abrir http://localhost:5173/torre-de-controle:
  - Modo Matriz: filtro Tier aparece e filtra corretamente
  - Click na bolinha: Super Painel abre com nova secao "Contexto Kommo" preenchida (Descricao, Objetivo, Dores)
  - Botao "Painel Geral" (admin): nova tab "Distribuicao" com 4 donuts + nova linha de scorecards financeiros
- [ ] **Step D:** Atualizar `docs/superpowers/execution-report.md` adicionando secao "Kommo Context Enrichment" com status de cada task e screenshots (se gerados)
- [ ] **Step E:** NAO COMMITAR. `git status` deve mostrar 4 arquivos modified + 3 novos files (`TcTabDistribuicao.vue`, `kommo-cache.js`).
