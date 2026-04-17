# Super Painel Torre de Controle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠ MODO AUTONOMO COM HAND-OFF — NAO COMMITAR EM HIPOTESE ALGUMA**
>
> O usuario esta AUSENTE durante a execucao. Implemente tudo localmente, teste tudo, e pare antes do primeiro `git commit`. A decisao de commitar sera do usuario quando ele retornar.
>
> **Fluxo obrigatorio:**
>
> 1. **Implementar todas as 18 tasks** — escrever cada arquivo, rodar migrations locais, sem pular nenhum step de codigo.
> 2. **PULAR TODOS os steps `git commit`** do plano. Ignore os `git add`/`git commit` em todas as tasks. Nao rode `git tag`, nao rode `git push`.
> 3. **Rodar verificacoes de codigo apos cada task critica** (5, 6, 7, 9, 16):
>    - `npm run build` deve passar sem erros apos cada task frontend
>    - `node -e "import('./server/services/tc-analyzer.js')"` (e equivalentes) apos cada arquivo server-side para detectar syntax errors
> 4. **Rodar a Task 18 inteira de forma autonoma:**
>    - Iniciar `npm run dev` em background
>    - Verificar logs `[worker] started` e ausencia de erros
>    - Fazer os smoke tests via `curl` ou via `mcp__plugin_playwright_playwright__*` (abrir o browser, logar, navegar em Torre de Controle, clicar em cliente, verificar que Super Painel abre, disparar analise, aguardar job completar)
>    - Capturar screenshots das telas principais (Painel Geral, Matriz, Super Painel aberto, TcJobProgress) e salvar em `docs/superpowers/screenshots/`
>    - Documentar quaisquer erros encontrados em `docs/superpowers/execution-report.md`
> 5. **Nao commitar.** Ao terminar, rodar `git status` e garantir que tudo esta unstaged/untracked, pronto para review do usuario.
> 6. **Escrever relatorio final** em `docs/superpowers/execution-report.md` com:
>    - Quais tasks foram completadas sem problema
>    - Quais tasks tiveram erros/ajustes (e o que foi ajustado)
>    - Saida dos smoke tests (status codes, contagem de rows em tabelas novas, etc.)
>    - Lista de screenshots gerados
>    - Proximos passos sugeridos para o usuario
>
> **Regras de seguranca:**
> - NUNCA rodar `git commit`, `git push`, `git tag`, `git reset --hard`, ou qualquer comando destrutivo
> - NUNCA preencher `.env` com tokens reais (deixar placeholders como `KOMMO_API_TOKEN=TODO`) — o usuario preenche antes dos smoke tests de integracao externa
> - Se os smoke tests com Kommo/OpenAI falharem por falta de token, documente no relatorio e siga com o que for possivel (build, matriz vazia, componentes renderizando)
> - Se um erro bloquear mais de 2 tasks seguintes, **pare** e documente no relatorio ao inves de forcar workarounds arriscados

**Goal:** Transform Torre de Controle from a simple drawer panel into a fullscreen Super Painel with AI analysis (OpenAI), Kommo CRM integration, RAG intelligence, and a Painel Geral with 5 analytical tabs.

**Architecture:** Express API with Postgres-based job queue (tc_jobs) processes analysis requests asynchronously. Worker fetches Kommo data, extracts content via n8n webhook, builds 3-layer RAG context, and calls OpenAI for structured analysis. Frontend polls job progress every 3s. pgvector enables cross-client intelligence.

**Tech Stack:** Vue 3 (Composition API), Express.js, PostgreSQL + pgvector, OpenAI API (gpt-5.4-mini/nano), Kommo CRM API, n8n webhooks

---

## File Structure

**New files (create):**

| File | Responsibility |
|------|---------------|
| `migrations/004_torre_controle_super_painel.sql` | New tables: tc_jobs, tc_extracoes, tc_analises_ia, tc_embeddings, tc_conhecimento, tc_usuario_clientes, tc_analise_colaboradores |
| `server/lib/rate-limiter.js` | Generic rate limiter (sliding window + concurrent) |
| `server/services/kommo-client.js` | Kommo CRM API client (leads, custom fields, notes) |
| `server/services/openai-client.js` | OpenAI API client (analysis, embeddings, notes) |
| `server/services/rag-engine.js` | 3-layer RAG context builder |
| `server/services/tc-job-worker.js` | Postgres job queue processor |
| `server/services/tc-analyzer.js` | Orchestration + SQL aggregations |
| `server/routes/torre-controle.js` | Express routes /api/tc/* |
| `client/dashboards/TorreDeControle/composables/useTorreControle.js` | Frontend state + API calls |
| `client/dashboards/TorreDeControle/components/TcJobProgress.vue` | Job progress indicator |
| `client/dashboards/TorreDeControle/components/TcTimelineFases.vue` | Phase timeline dots |
| `client/dashboards/TorreDeControle/components/TcKommoLeadForm.vue` | Mini CRM lead creation form |
| `client/dashboards/TorreDeControle/components/TcSuperPainel.vue` | Fullscreen AI report overlay |
| `client/dashboards/TorreDeControle/components/TcPainelGeral.vue` | Aggregate dashboard with tabs |
| `client/dashboards/TorreDeControle/components/TcTabVisaoGeral.vue` | Tab: heatmap + trends |
| `client/dashboards/TorreDeControle/components/TcTabSquads.vue` | Tab: squad health |
| `client/dashboards/TorreDeControle/components/TcTabChurn.vue` | Tab: churn radar |
| `client/dashboards/TorreDeControle/components/TcTabOportunidades.vue` | Tab: opportunities pipeline |
| `client/dashboards/TorreDeControle/components/TcTabColaboradores.vue` | Tab: collaborator analysis |

**Modified files:**

| File | Change |
|------|--------|
| `server/index.js` | Mount TC routes, start job worker |
| `client/dashboards/TorreDeControle/index.vue` | Add mode toggle, replace TcDetalhePanel with TcSuperPainel |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/004_torre_controle_super_painel.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration 004: Super Painel — novas tabelas
-- Schema: dashboards_hub

-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Job Queue ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_jobs (
  id              SERIAL PRIMARY KEY,
  tipo            VARCHAR(50) NOT NULL,
  referencia_id   INTEGER,
  lead_id         VARCHAR(50),
  lock_key        VARCHAR(255),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  progresso       JSONB DEFAULT '{}',
  resultado       JSONB,
  tentativas      INTEGER DEFAULT 0,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_jobs_lock_active
  ON dashboards_hub.tc_jobs (lock_key)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_tc_jobs_status
  ON dashboards_hub.tc_jobs (status);

-- ── Extracoes (cache conteudo) ─────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_extracoes (
  id              SERIAL PRIMARY KEY,
  lead_id         VARCHAR(50) NOT NULL,
  fase            VARCHAR(50),
  plataforma      VARCHAR(50),
  url_origem      TEXT NOT NULL,
  conteudo_full   TEXT,
  conteudo_medium TEXT,
  conteudo_short  TEXT,
  tokens_full     INTEGER,
  hash_conteudo   VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tc_extracoes_lead_url
  ON dashboards_hub.tc_extracoes (lead_id, url_origem);

-- ── Analises IA (versionadas) ──────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_analises_ia (
  id                  SERIAL PRIMARY KEY,
  projeto_fase_id     INTEGER NOT NULL REFERENCES dashboards_hub.tc_projeto_fases(id) ON DELETE CASCADE,
  versao              INTEGER NOT NULL DEFAULT 1,
  modelo_usado        VARCHAR(50),
  score               NUMERIC(3,1),
  veredicto           VARCHAR(50),
  resumo              TEXT,
  analise_materiais   TEXT,
  percepcao_cliente   JSONB DEFAULT '{}',
  dores               JSONB DEFAULT '[]',
  oportunidades       JSONB DEFAULT '[]',
  riscos              JSONB DEFAULT '[]',
  recomendacoes       JSONB DEFAULT '[]',
  contexto_rag        JSONB DEFAULT '{}',
  tokens_input        INTEGER,
  tokens_output       INTEGER,
  custo_estimado      NUMERIC(8,4),
  nota_kommo          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(projeto_fase_id, versao)
);

-- ── Embeddings (pgvector) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_embeddings (
  id              SERIAL PRIMARY KEY,
  referencia_tipo VARCHAR(50) NOT NULL,
  referencia_id   INTEGER NOT NULL,
  conteudo_texto  TEXT,
  embedding       vector(1536),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_embeddings_vec
  ON dashboards_hub.tc_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20);
CREATE INDEX IF NOT EXISTS idx_tc_embeddings_meta
  ON dashboards_hub.tc_embeddings USING gin (metadata);

-- ── Base de Conhecimento (RAG camada 3) ────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_conhecimento (
  id              SERIAL PRIMARY KEY,
  categoria       VARCHAR(100),
  fase_aplicavel  VARCHAR(50),
  titulo          VARCHAR(255) NOT NULL,
  conteudo        TEXT NOT NULL,
  fonte           VARCHAR(255),
  relevancia      INTEGER DEFAULT 5,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Atribuicoes usuario-cliente ────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_usuario_clientes (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES dashboards_hub.users(id) ON DELETE CASCADE,
  cliente_id      INTEGER NOT NULL REFERENCES dashboards_hub.tc_clientes(id) ON DELETE CASCADE,
  funcao          VARCHAR(50),
  squad           VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cliente_id)
);

-- ── Analise semanal de colaboradores ───────────────────────
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_analise_colaboradores (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES dashboards_hub.users(id) ON DELETE CASCADE,
  periodo         DATE NOT NULL,
  score_medio     NUMERIC(3,1),
  total_clientes  INTEGER,
  clientes_risco  INTEGER,
  pontos_fortes   JSONB DEFAULT '[]',
  pontos_atencao  JSONB DEFAULT '[]',
  recomendacoes   JSONB DEFAULT '[]',
  distribuicao    JSONB DEFAULT '{}',
  modelo_usado    VARCHAR(50),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, periodo)
);
```

- [ ] **Step 2: Run the migration**

```bash
psql "$DATABASE_URL" -f migrations/004_torre_controle_super_painel.sql
```

- [ ] **Step 3: Commit**

```bash
git add migrations/004_torre_controle_super_painel.sql
git commit -m "feat(tc): migration 004 — tabelas super painel"
```

---

## Task 2: Rate Limiter

**Files:**
- Create: `server/lib/rate-limiter.js`

- [ ] **Step 1: Write rate limiter module**

```js
// server/lib/rate-limiter.js
// Rate limiter generico — sliding window (Kommo) + concurrent/RPM (OpenAI, n8n)

class SlidingWindowLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond
    this.timestamps = []
    this.queue = []
  }

  async acquire() {
    return new Promise(resolve => {
      const tryAcquire = () => {
        const now = Date.now()
        this.timestamps = this.timestamps.filter(t => now - t < 1000)
        if (this.timestamps.length < this.maxPerSecond) {
          this.timestamps.push(now)
          resolve()
        } else {
          const oldest = this.timestamps[0]
          const waitMs = 1000 - (now - oldest) + 10
          setTimeout(tryAcquire, waitMs)
        }
      }
      tryAcquire()
    })
  }

  release() {} // noop — sliding window nao precisa release
}

class ConcurrentRpmLimiter {
  constructor(maxConcurrent, maxRpm) {
    this.maxConcurrent = maxConcurrent
    this.maxRpm = maxRpm
    this.active = 0
    this.rpmTimestamps = []
    this.queue = []
  }

  async acquire() {
    return new Promise(resolve => {
      this.queue.push(resolve)
      this._tryProcess()
    })
  }

  release() {
    this.active--
    this._tryProcess()
  }

  _tryProcess() {
    if (this.queue.length === 0) return
    const now = Date.now()
    this.rpmTimestamps = this.rpmTimestamps.filter(t => now - t < 60000)
    if (this.active < this.maxConcurrent && this.rpmTimestamps.length < this.maxRpm) {
      this.active++
      this.rpmTimestamps.push(now)
      const resolve = this.queue.shift()
      resolve()
    } else if (this.rpmTimestamps.length >= this.maxRpm) {
      const oldest = this.rpmTimestamps[0]
      const waitMs = 60000 - (now - oldest) + 10
      setTimeout(() => this._tryProcess(), waitMs)
    }
  }
}

export function createRateLimiter({ type, maxPerSecond, maxConcurrent, maxRpm }) {
  if (type === 'sliding-window') {
    return new SlidingWindowLimiter(maxPerSecond)
  }
  return new ConcurrentRpmLimiter(maxConcurrent, maxRpm)
}

// Retry com backoff para 429
export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000 } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries) throw err
      const is429 = err.status === 429 || err.message?.includes('429')
      if (!is429 && attempt > 0) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/lib/rate-limiter.js
git commit -m "feat(tc): rate limiter generico com sliding window e concurrent/rpm"
```

---

## Task 3: Kommo Client

**Files:**
- Create: `server/services/kommo-client.js`

- [ ] **Step 1: Write Kommo client**

```js
// server/services/kommo-client.js
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const BASE_URL = process.env.KOMMO_BASE_URL || 'https://edisonv4companycom.kommo.com/api/v4'
const TOKEN = process.env.KOMMO_API_TOKEN
const PIPELINE_SABER = process.env.KOMMO_PIPELINE_SABER_ID || '12925780'

const limiter = createRateLimiter({
  type: 'sliding-window',
  maxPerSecond: parseInt(process.env.KOMMO_RATE_LIMIT_PER_SECOND || '3')
})

// Custom fields mapeados por fase — Pipeline Saber
const PHASE_FIELDS = {
  kickoff: {
    slides: 1990357, reuniao: 1990385, transcricao: 1990611
  },
  'fase-2': {
    slides: 1990679, reuniao: 1990369, transcricao: 1990613
  },
  'fase-3': {
    slides: 1990681, reuniao: 1990373, transcricao: 1990615,
    figma: 1990781, miro: 1990783
  },
  'fase-4': {
    slides: 1990683, reuniao: 1990377, transcricao: 1990617
  },
  'fase-5': {
    slides: 1990685, reuniao: 1990381, transcricao: 1990619,
    figma: 1990789, miro: 1990791
  }
}

const STAGE_IDS = {
  'kickoff-interno': 99670916,
  kickoff: 99670920,
  'fase-2': 99670924,
  'fase-3': 99671028,
  'fase-4': 99671032,
  'fase-5': 99671036,
  'projeto-concluido': 100273444
}

async function kommoFetch(path, options = {}) {
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) {
        const err = new Error(`Kommo ${res.status}: ${res.statusText}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
  } finally {
    limiter.release()
  }
}

export async function getLeadCustomFields(leadId) {
  const data = await kommoFetch(`/leads/${leadId}?with=custom_fields_values`)
  return data?.custom_fields_values || []
}

export function extractPhaseLinks(customFields, phase) {
  const mapping = PHASE_FIELDS[phase]
  if (!mapping) return {}
  const links = {}
  for (const [key, fieldId] of Object.entries(mapping)) {
    const field = customFields.find(f => f.field_id === fieldId)
    const val = field?.values?.[0]?.value
    if (val) links[key] = val
  }
  return links
}

export async function getLeadsByPipeline(pipelineId = PIPELINE_SABER) {
  const data = await kommoFetch(`/leads?filter[pipeline_id]=${pipelineId}&limit=250`)
  return data?._embedded?.leads || []
}

export async function createLead(pipelineId, statusId, leadData) {
  const body = [{
    name: leadData.name,
    pipeline_id: parseInt(pipelineId),
    status_id: parseInt(statusId),
    price: leadData.valor || 0,
    responsible_user_id: leadData.responsavelId || undefined,
    custom_fields_values: leadData.customFields || []
  }]
  const data = await kommoFetch('/leads', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return data?._embedded?.leads?.[0]
}

export async function updateLeadNote(leadId, noteText) {
  const body = [{
    entity_id: parseInt(leadId),
    note_type: 'common',
    params: { text: noteText }
  }]
  return kommoFetch(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export { PHASE_FIELDS, STAGE_IDS, PIPELINE_SABER }
```

- [ ] **Step 2: Commit**

```bash
git add server/services/kommo-client.js
git commit -m "feat(tc): kommo crm client com rate limiting e mapeamento de campos"
```

---

## Task 4: OpenAI Client

**Files:**
- Create: `server/services/openai-client.js`

- [ ] **Step 1: Write OpenAI client**

```js
// server/services/openai-client.js
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const API_KEY = process.env.OPENAI_API_KEY
const MODEL_ANALYSIS = process.env.OPENAI_MODEL_ANALYSIS || 'gpt-5.4-mini'
const MODEL_NOTE = process.env.OPENAI_MODEL_NOTE || 'gpt-5.4-nano'
const MODEL_EMBEDDING = process.env.OPENAI_MODEL_EMBEDDING || 'text-embedding-3-small'

const limiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.OPENAI_MAX_CONCURRENT || '3'),
  maxRpm: parseInt(process.env.OPENAI_MAX_RPM || '60')
})

export function countTokens(text) {
  if (!text) return 0
  return Math.ceil(text.split(/\s+/).length * 1.3)
}

async function openaiPost(path, body) {
  await limiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(`https://api.openai.com/v1${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000)
      })
      if (!res.ok) {
        const err = new Error(`OpenAI ${res.status}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
  } finally {
    limiter.release()
  }
}

export async function analyzePhase(materialContent, ragContext) {
  const systemPrompt = `Voce e um auditor de qualidade da V4 Company. Analise os materiais da fase do cliente e retorne JSON estruturado com: score (0-10), veredicto (string curta), resumo (texto executivo), analise_materiais (texto detalhado), percepcao_cliente (objeto com tom, engajamento, confianca cada 0-10), dores (array de {descricao, gravidade: baixa|media|alta|critica}), oportunidades (array de {titulo, descricao, valor_estimado}), riscos (array de {descricao, tipo, probabilidade, impacto}), recomendacoes (array de {descricao, tipo, prioridade}).`

  const userPrompt = `## Materiais da Fase\n${materialContent}\n\n## Contexto RAG\n${JSON.stringify(ragContext)}`

  const data = await openaiPost('/chat/completions', {
    model: MODEL_ANALYSIS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  const content = data.choices[0].message.content
  const parsed = JSON.parse(content)
  return {
    ...parsed,
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens
  }
}

export async function generateNote(analysisData) {
  const prompt = `Gere uma nota formatada para o CRM Kommo baseada nesta analise. Seja conciso, profissional, em portugues. Inclua: score, resumo, principais dores e recomendacoes.\n\n${JSON.stringify(analysisData)}`

  const data = await openaiPost('/chat/completions', {
    model: MODEL_NOTE,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  })
  return data.choices[0].message.content
}

export async function generateEmbedding(text) {
  const data = await openaiPost('/embeddings', {
    model: MODEL_EMBEDDING,
    input: text.slice(0, 8000)
  })
  return data.data[0].embedding
}

export async function analyzeCollaborator(userData) {
  const model = process.env.COLLAB_ANALYSIS_MODEL || MODEL_ANALYSIS
  const prompt = `Analise o desempenho deste colaborador e retorne JSON com: pontos_fortes (array strings), pontos_atencao (array strings), recomendacoes (array strings), distribuicao (objeto com ranges de score).\n\n${JSON.stringify(userData)}`

  const data = await openaiPost('/chat/completions', {
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  return JSON.parse(data.choices[0].message.content)
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/openai-client.js
git commit -m "feat(tc): openai client com analise, embeddings e notas"
```

---

## Task 5: RAG Engine

**Files:**
- Create: `server/services/rag-engine.js`

- [ ] **Step 1: Write RAG context builder**

```js
// server/services/rag-engine.js
// Monta contexto de 3 camadas com token budget fixo
import { pool } from '../lib/db.js'
import { generateEmbedding, countTokens } from './openai-client.js'

const MAX_CONTEXT = parseInt(process.env.RAG_MAX_CONTEXT_TOKENS || '12000')
const L1_BUDGET   = parseInt(process.env.RAG_LAYER1_BUDGET || '2000')
const L2_BUDGET   = parseInt(process.env.RAG_LAYER2_BUDGET || '3000')
const L2_TOP_K    = parseInt(process.env.RAG_LAYER2_TOP_K || '5')
const L3_BUDGET   = parseInt(process.env.RAG_LAYER3_BUDGET || '2000')
const L3_TOP_K    = parseInt(process.env.RAG_LAYER3_TOP_K || '5')

function truncateToTokens(text, maxTokens) {
  if (!text) return ''
  const tokens = countTokens(text)
  if (tokens <= maxTokens) return text
  const ratio = maxTokens / tokens
  return text.slice(0, Math.floor(text.length * ratio))
}

async function buildLayer1(projetoFaseId) {
  // Historico do proprio cliente: resumos de fases anteriores + trajetoria de score
  const { rows } = await pool.query(`
    SELECT pf.id, fc.nome AS fase, pf.score, a.resumo, a.created_at
    FROM dashboards_hub.tc_projeto_fases pf
    JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
    LEFT JOIN dashboards_hub.tc_analises_ia a
      ON a.projeto_fase_id = pf.id AND a.versao = (
        SELECT MAX(versao) FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = pf.id
      )
    WHERE pf.projeto_id = (SELECT projeto_id FROM dashboards_hub.tc_projeto_fases WHERE id = $1)
      AND pf.id <> $1
    ORDER BY fc.ordem ASC
  `, [projetoFaseId])

  const text = rows
    .map(r => `Fase ${r.fase} (score ${r.score ?? '-'}): ${r.resumo || '(sem analise)'}`)
    .join('\n\n')

  return { text: truncateToTokens(text, L1_BUDGET), rows: rows.length }
}

async function buildLayer2(projetoFaseId, queryText) {
  // Casos similares via pgvector
  if (!queryText) return { text: '', rows: 0 }
  const embedding = await generateEmbedding(queryText)
  const vecLiteral = `[${embedding.join(',')}]`

  const { rows } = await pool.query(`
    SELECT e.conteudo_texto, e.metadata, (e.embedding <=> $1::vector) AS distancia
    FROM dashboards_hub.tc_embeddings e
    WHERE e.referencia_tipo = 'analise_ia'
      AND e.referencia_id <> (SELECT COALESCE(MAX(id), 0) FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $2)
    ORDER BY e.embedding <=> $1::vector ASC
    LIMIT $3
  `, [vecLiteral, projetoFaseId, L2_TOP_K])

  const text = rows
    .map(r => `[similaridade ${(1 - r.distancia).toFixed(2)}] ${r.conteudo_texto}`)
    .join('\n---\n')

  return { text: truncateToTokens(text, L2_BUDGET), rows: rows.length }
}

async function buildLayer3(fase) {
  // Base de conhecimento por fase
  const { rows } = await pool.query(`
    SELECT titulo, conteudo, categoria
    FROM dashboards_hub.tc_conhecimento
    WHERE ativo = true
      AND (fase_aplicavel = $1 OR fase_aplicavel IS NULL)
    ORDER BY relevancia DESC
    LIMIT $2
  `, [fase, L3_TOP_K])

  const text = rows
    .map(r => `## ${r.titulo} (${r.categoria})\n${r.conteudo}`)
    .join('\n\n')

  return { text: truncateToTokens(text, L3_BUDGET), rows: rows.length }
}

export async function buildRagContext({ projetoFaseId, fase, queryText }) {
  const [l1, l2, l3] = await Promise.all([
    buildLayer1(projetoFaseId),
    buildLayer2(projetoFaseId, queryText),
    buildLayer3(fase)
  ])

  const context = {
    historico_cliente: l1.text,
    casos_similares:   l2.text,
    base_conhecimento: l3.text
  }

  const totalTokens = countTokens(JSON.stringify(context))
  if (totalTokens > MAX_CONTEXT) {
    // trunca L2 primeiro, depois L3. L1 nunca e truncada.
    context.casos_similares = truncateToTokens(context.casos_similares, L2_BUDGET / 2)
    context.base_conhecimento = truncateToTokens(context.base_conhecimento, L3_BUDGET / 2)
  }

  return {
    context,
    metadata: {
      layer1_rows: l1.rows,
      layer2_rows: l2.rows,
      layer3_rows: l3.rows,
      tokens_aproximado: countTokens(JSON.stringify(context))
    }
  }
}
```

- [ ] **Step 2: Verify pgvector extension is enabled**

```bash
psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

- [ ] **Step 3: Commit**

```bash
git add server/services/rag-engine.js
git commit -m "feat(tc): rag engine 3 camadas com token budget"
```

---

## Task 6: TC Analyzer (Orchestration)

**Files:**
- Create: `server/services/tc-analyzer.js`

- [ ] **Step 1: Write the analyzer orchestrator**

```js
// server/services/tc-analyzer.js
// Orquestra: Kommo -> n8n extract -> RAG -> OpenAI -> persist -> embed -> Kommo note
import crypto from 'node:crypto'
import { pool } from '../lib/db.js'
import { getLeadCustomFields, extractPhaseLinks, updateLeadNote } from './kommo-client.js'
import { analyzePhase, generateNote, generateEmbedding, countTokens } from './openai-client.js'
import { buildRagContext } from './rag-engine.js'
import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'

const N8N_URL = process.env.N8N_EXTRACT_WEBHOOK_URL
const n8nLimiter = createRateLimiter({
  type: 'concurrent-rpm',
  maxConcurrent: parseInt(process.env.N8N_MAX_CONCURRENT || '2'),
  maxRpm: 120
})

function hashContent(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex')
}

async function extractViaN8n(url, platform) {
  await n8nLimiter.acquire()
  try {
    return await withRetry(async () => {
      const res = await globalThis.fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, platform }),
        signal: AbortSignal.timeout(180000)
      })
      if (!res.ok) {
        const err = new Error(`n8n extract ${res.status}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
  } finally {
    n8nLimiter.release()
  }
}

async function getOrExtract(leadId, fase, plataforma, url) {
  const existing = await pool.query(
    `SELECT conteudo_full, conteudo_medium, conteudo_short, hash_conteudo
     FROM dashboards_hub.tc_extracoes
     WHERE lead_id = $1 AND url_origem = $2`,
    [leadId, url]
  )
  if (existing.rows[0]) return existing.rows[0]

  const extracted = await extractViaN8n(url, plataforma)
  const full = extracted.conteudo_full || extracted.text || ''
  const medium = extracted.conteudo_medium || full.slice(0, 4000)
  const short = extracted.conteudo_short || full.slice(0, 1000)
  const hash = hashContent(full)

  await pool.query(`
    INSERT INTO dashboards_hub.tc_extracoes
      (lead_id, fase, plataforma, url_origem, conteudo_full, conteudo_medium, conteudo_short, tokens_full, hash_conteudo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (lead_id, url_origem) DO UPDATE SET
      conteudo_full = EXCLUDED.conteudo_full,
      conteudo_medium = EXCLUDED.conteudo_medium,
      conteudo_short = EXCLUDED.conteudo_short,
      hash_conteudo = EXCLUDED.hash_conteudo
  `, [leadId, fase, plataforma, url, full, medium, short, countTokens(full), hash])

  return { conteudo_full: full, conteudo_medium: medium, conteudo_short: short, hash_conteudo: hash }
}

async function distributeAnalysis(projetoFaseId, analysisId, parsed) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // dores -> tc_insatisfacoes
    for (const d of parsed.dores || []) {
      await client.query(
        `INSERT INTO dashboards_hub.tc_insatisfacoes (projeto_fase_id, descricao, gravidade)
         VALUES ($1, $2, $3)`,
        [projetoFaseId, d.descricao, d.gravidade || 'media']
      )
    }
    // oportunidades -> tc_oportunidades
    for (const o of parsed.oportunidades || []) {
      await client.query(
        `INSERT INTO dashboards_hub.tc_oportunidades (projeto_fase_id, titulo, descricao, valor_estimado)
         VALUES ($1, $2, $3, $4)`,
        [projetoFaseId, o.titulo, o.descricao, o.valor_estimado || null]
      )
    }
    // riscos -> tc_riscos (via projeto do projetoFase)
    const { rows: [pf] } = await client.query(
      `SELECT projeto_id FROM dashboards_hub.tc_projeto_fases WHERE id = $1`,
      [projetoFaseId]
    )
    for (const r of parsed.riscos || []) {
      await client.query(
        `INSERT INTO dashboards_hub.tc_riscos (projeto_id, descricao, tipo, probabilidade, impacto)
         VALUES ($1, $2, $3, $4, $5)`,
        [pf.projeto_id, r.descricao, r.tipo || 'qualidade', r.probabilidade || 'media', r.impacto || 'medio']
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function runAnalysis({ projetoFaseId, leadId, fase, onProgress }) {
  const progress = (step, data = {}) => onProgress?.({ step, ...data })

  progress('fetching_kommo')
  const customFields = await getLeadCustomFields(leadId)
  const links = extractPhaseLinks(customFields, fase)

  progress('extracting_content', { total: Object.keys(links).length })
  const materials = {}
  for (const [plataforma, url] of Object.entries(links)) {
    const extracao = await getOrExtract(leadId, fase, plataforma, url)
    materials[plataforma] = extracao.conteudo_medium
  }

  progress('building_rag')
  const queryText = Object.values(materials).join('\n').slice(0, 3000)
  const { context: ragContext, metadata: ragMeta } = await buildRagContext({
    projetoFaseId, fase, queryText
  })

  progress('calling_openai')
  const materialContent = Object.entries(materials)
    .map(([k, v]) => `### ${k}\n${v}`).join('\n\n')
  const parsed = await analyzePhase(materialContent, ragContext)

  progress('persisting')
  const { rows: [{ max_versao }] } = await pool.query(
    `SELECT COALESCE(MAX(versao), 0) AS max_versao FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = $1`,
    [projetoFaseId]
  )
  const novaVersao = max_versao + 1
  const tokens_in = parsed.tokens_input || 0
  const tokens_out = parsed.tokens_output || 0
  const custo = (tokens_in * 0.75 + tokens_out * 4.5) / 1_000_000

  const { rows: [analise] } = await pool.query(`
    INSERT INTO dashboards_hub.tc_analises_ia
      (projeto_fase_id, versao, modelo_usado, score, veredicto, resumo, analise_materiais,
       percepcao_cliente, dores, oportunidades, riscos, recomendacoes, contexto_rag,
       tokens_input, tokens_output, custo_estimado)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id
  `, [
    projetoFaseId, novaVersao, process.env.OPENAI_MODEL_ANALYSIS || 'gpt-5.4-mini',
    parsed.score, parsed.veredicto, parsed.resumo, parsed.analise_materiais,
    JSON.stringify(parsed.percepcao_cliente || {}),
    JSON.stringify(parsed.dores || []),
    JSON.stringify(parsed.oportunidades || []),
    JSON.stringify(parsed.riscos || []),
    JSON.stringify(parsed.recomendacoes || []),
    JSON.stringify(ragMeta),
    tokens_in, tokens_out, custo
  ])

  await distributeAnalysis(projetoFaseId, analise.id, parsed)

  progress('embedding')
  const embText = `${parsed.resumo}\n${parsed.analise_materiais}`.slice(0, 6000)
  const embedding = await generateEmbedding(embText)
  const vecLiteral = `[${embedding.join(',')}]`
  await pool.query(
    `INSERT INTO dashboards_hub.tc_embeddings (referencia_tipo, referencia_id, conteudo_texto, embedding, metadata)
     VALUES ('analise_ia', $1, $2, $3::vector, $4)`,
    [analise.id, embText, vecLiteral, JSON.stringify({ fase, projetoFaseId })]
  )

  progress('posting_note')
  const noteText = await generateNote(parsed)
  await updateLeadNote(leadId, noteText)
  await pool.query(
    `UPDATE dashboards_hub.tc_analises_ia SET nota_kommo = $1 WHERE id = $2`,
    [noteText, analise.id]
  )

  progress('done')
  return { analiseId: analise.id, versao: novaVersao, score: parsed.score }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/tc-analyzer.js
git commit -m "feat(tc): orquestrador de analise (kommo+n8n+rag+openai)"
```

---

## Task 7: Job Worker (Postgres Queue)

**Files:**
- Create: `server/services/tc-job-worker.js`

- [ ] **Step 1: Write Postgres-backed worker**

```js
// server/services/tc-job-worker.js
// Postgres job queue processor. Roda no mesmo processo do Express.
import { pool } from '../lib/db.js'
import { runAnalysis } from './tc-analyzer.js'

const POLL_INTERVAL = parseInt(process.env.JOB_POLL_INTERVAL || '3000')
const BATCH_SIZE    = parseInt(process.env.JOB_BATCH_SIZE || '2')
const MAX_RETRIES   = parseInt(process.env.JOB_MAX_RETRIES || '3')
const LOCK_TTL_MS   = parseInt(process.env.JOB_LOCK_TTL_MS || '600000')

let running = false
let stopRequested = false

async function pickJobs() {
  // Atomica: marca pending -> processing e retorna ate BATCH_SIZE jobs
  const { rows } = await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'processing', updated_at = NOW()
    WHERE id IN (
      SELECT id FROM dashboards_hub.tc_jobs
      WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    )
    RETURNING *
  `, [BATCH_SIZE])
  return rows
}

async function reviveStuck() {
  // Jobs travados em processing alem do TTL voltam a pending
  await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'pending', tentativas = tentativas + 1, updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - ($1 || ' milliseconds')::interval
      AND tentativas < $2
  `, [LOCK_TTL_MS, MAX_RETRIES])
  await pool.query(`
    UPDATE dashboards_hub.tc_jobs
    SET status = 'failed', updated_at = NOW()
    WHERE status = 'processing'
      AND updated_at < NOW() - ($1 || ' milliseconds')::interval
      AND tentativas >= $2
  `, [LOCK_TTL_MS, MAX_RETRIES])
}

async function updateProgress(jobId, progresso) {
  await pool.query(
    `UPDATE dashboards_hub.tc_jobs
     SET progresso = progresso || $1::jsonb, updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(progresso), jobId]
  )
}

async function processJob(job) {
  const onProgress = (data) => updateProgress(job.id, data).catch(() => {})
  try {
    let resultado
    if (job.tipo === 'analyze_phase') {
      const { projetoFaseId, fase } = job.progresso?.payload || {}
      resultado = await runAnalysis({
        projetoFaseId,
        leadId: job.lead_id,
        fase,
        onProgress
      })
    } else if (job.tipo === 'analyze_bulk') {
      // job pai: cria 1 sub-job por cliente/fase
      const { items } = job.progresso?.payload || { items: [] }
      for (const it of items) {
        const lockKey = `analyze:${it.leadId}:${it.fase}`
        await pool.query(`
          INSERT INTO dashboards_hub.tc_jobs (tipo, lead_id, lock_key, progresso)
          VALUES ('analyze_phase', $1, $2, $3)
          ON CONFLICT (lock_key) WHERE status IN ('pending','processing') DO NOTHING
        `, [it.leadId, lockKey, JSON.stringify({ payload: it })])
      }
      resultado = { fanout: items.length }
    } else {
      throw new Error(`tipo de job desconhecido: ${job.tipo}`)
    }

    await pool.query(
      `UPDATE dashboards_hub.tc_jobs
       SET status = 'completed', resultado = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(resultado), job.id]
    )
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [worker] job ${job.id} falhou:`, err.message)
    const proxima = job.tentativas + 1 >= MAX_RETRIES ? 'failed' : 'pending'
    await pool.query(
      `UPDATE dashboards_hub.tc_jobs
       SET status = $1, tentativas = tentativas + 1,
           progresso = progresso || $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      [proxima, JSON.stringify({ ultimo_erro: err.message }), job.id]
    )
  }
}

async function tick() {
  if (stopRequested) return
  try {
    await reviveStuck()
    const jobs = await pickJobs()
    if (jobs.length > 0) {
      await Promise.all(jobs.map(processJob))
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [worker] tick error:`, err.message)
  }
}

export function startJobWorker() {
  if (running) return
  running = true
  stopRequested = false
  console.log(`[${new Date().toISOString()}] [worker] started — poll=${POLL_INTERVAL}ms batch=${BATCH_SIZE}`)
  const loop = async () => {
    while (!stopRequested) {
      await tick()
      await new Promise(r => setTimeout(r, POLL_INTERVAL))
    }
    running = false
  }
  loop()
}

export function stopJobWorker() {
  stopRequested = true
}

export async function enqueueJob({ tipo, leadId, lockKey, payload }) {
  const { rows } = await pool.query(`
    INSERT INTO dashboards_hub.tc_jobs (tipo, lead_id, lock_key, progresso)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (lock_key) WHERE status IN ('pending','processing')
    DO UPDATE SET updated_at = NOW()
    RETURNING id, status
  `, [tipo, leadId || null, lockKey || null, JSON.stringify({ payload })])
  return rows[0]
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/tc-job-worker.js
git commit -m "feat(tc): job worker com polling postgres e retry"
```

---

## Task 8: TC Routes (Express API)

**Files:**
- Create: `server/routes/torre-controle.js`

- [ ] **Step 1: Write Express routes**

```js
// server/routes/torre-controle.js
import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { enqueueJob } from '../services/tc-job-worker.js'
import { createLead } from '../services/kommo-client.js'

const router = Router()
router.use(requireAuth)

// Filtro de clientes visiveis conforme role
async function visibleClienteIds(userId, role) {
  if (role === 'admin' || role === 'board') {
    const { rows } = await pool.query('SELECT id FROM dashboards_hub.tc_clientes WHERE ativo = true')
    return rows.map(r => r.id)
  }
  const { rows } = await pool.query(
    `SELECT cliente_id AS id FROM dashboards_hub.tc_usuario_clientes WHERE user_id = $1`,
    [userId]
  )
  return rows.map(r => r.id)
}

// GET /api/tc/matriz — grid cliente x fase com ultima analise
router.get('/matriz', async (req, res, next) => {
  try {
    const ids = await visibleClienteIds(req.session.userId, req.session.role)
    if (ids.length === 0) return res.json({ clientes: [], fases: [] })
    const { rows: fases } = await pool.query(
      `SELECT id, nome, ordem FROM dashboards_hub.tc_fases_config WHERE produto = 'saber' ORDER BY ordem`
    )
    const { rows: clientes } = await pool.query(`
      SELECT c.id, c.nome, c.segmento, s.nome AS squad,
             json_object_agg(pf.fase_config_id, json_build_object(
               'status_cor', pf.status_cor,
               'score', pf.score,
               'analise_id', (SELECT MAX(id) FROM dashboards_hub.tc_analises_ia WHERE projeto_fase_id = pf.id)
             )) FILTER (WHERE pf.id IS NOT NULL) AS fases
      FROM dashboards_hub.tc_clientes c
      LEFT JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id AND p.produto = 'saber'
      LEFT JOIN dashboards_hub.tc_squads s ON s.id = p.squad_id
      LEFT JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      WHERE c.id = ANY($1)
      GROUP BY c.id, s.nome
      ORDER BY c.nome
    `, [ids])
    res.json({ clientes, fases })
  } catch (err) { next(err) }
})

// GET /api/tc/cliente/:id/fase/:faseId — detalhe de analise mais recente
router.get('/cliente/:id/fase/:faseId', async (req, res, next) => {
  try {
    const { id, faseId } = req.params
    const { rows: [pf] } = await pool.query(`
      SELECT pf.*, p.cliente_id, c.id_externo AS lead_id, fc.nome AS fase_nome
      FROM dashboards_hub.tc_projeto_fases pf
      JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
      JOIN dashboards_hub.tc_clientes c ON c.id = p.cliente_id
      JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
      WHERE p.cliente_id = $1 AND pf.fase_config_id = $2
    `, [id, faseId])
    if (!pf) return res.status(404).json({ error: 'fase nao encontrada' })
    const { rows: analises } = await pool.query(`
      SELECT * FROM dashboards_hub.tc_analises_ia
      WHERE projeto_fase_id = $1 ORDER BY versao DESC
    `, [pf.id])
    res.json({ fase: pf, analises })
  } catch (err) { next(err) }
})

// POST /api/tc/analisar — dispara analise de uma fase
router.post('/analisar', async (req, res, next) => {
  try {
    const { projetoFaseId, leadId, fase } = req.body
    if (!projetoFaseId || !leadId || !fase) {
      return res.status(400).json({ error: 'projetoFaseId, leadId e fase obrigatorios' })
    }
    const lockKey = `analyze:${leadId}:${fase}`
    const job = await enqueueJob({
      tipo: 'analyze_phase', leadId, lockKey,
      payload: { projetoFaseId, fase }
    })
    res.json({ jobId: job.id, status: job.status })
  } catch (err) { next(err) }
})

// POST /api/tc/analisar-massa — fanout para multiplos clientes
router.post('/analisar-massa', async (req, res, next) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array obrigatorio' })
    }
    const job = await enqueueJob({
      tipo: 'analyze_bulk',
      lockKey: `bulk:${Date.now()}`,
      payload: { items }
    })
    res.json({ jobId: job.id, total: items.length })
  } catch (err) { next(err) }
})

// GET /api/tc/job/:id — progresso de job
router.get('/job/:id', async (req, res, next) => {
  try {
    const { rows: [job] } = await pool.query(
      `SELECT id, tipo, status, progresso, resultado, tentativas, created_at, updated_at
       FROM dashboards_hub.tc_jobs WHERE id = $1`,
      [req.params.id]
    )
    if (!job) return res.status(404).json({ error: 'job nao encontrado' })
    res.json(job)
  } catch (err) { next(err) }
})

// POST /api/tc/kommo/lead — cria lead no Kommo
router.post('/kommo/lead', async (req, res, next) => {
  try {
    const { pipelineId, statusId, ...leadData } = req.body
    if (!pipelineId || !statusId) {
      return res.status(400).json({ error: 'pipelineId e statusId obrigatorios' })
    }
    const lead = await createLead(pipelineId, statusId, leadData)
    res.json({ lead })
  } catch (err) { next(err) }
})

// GET /api/tc/painel-geral — agregados para todas as tabs (SQL puro)
router.get('/painel-geral', async (req, res, next) => {
  try {
    const ids = await visibleClienteIds(req.session.userId, req.session.role)
    if (ids.length === 0) return res.json(emptyPainel())

    const scorecards = await pool.query(`
      SELECT
        COUNT(DISTINCT c.id) AS clientes_ativos,
        ROUND(AVG(a.score)::numeric, 1) AS score_medio,
        COUNT(DISTINCT c.id) FILTER (WHERE a.score < 5) AS em_risco,
        COALESCE(SUM(o.valor_estimado) FILTER (WHERE o.status IN ('identificada','qualificada')), 0) AS oportunidades_brl,
        ROUND(
          100.0 * COUNT(DISTINCT a.projeto_fase_id) /
          NULLIF(COUNT(DISTINCT pf.id), 0)
        , 1) AS taxa_analise
      FROM dashboards_hub.tc_clientes c
      LEFT JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
      LEFT JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      LEFT JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
      LEFT JOIN dashboards_hub.tc_oportunidades o ON o.projeto_fase_id = pf.id
      WHERE c.id = ANY($1) AND c.ativo = true
    `, [ids])

    const squads = await pool.query(`
      SELECT s.nome AS squad,
             COUNT(DISTINCT p.cliente_id) AS clientes,
             ROUND(AVG(a.score)::numeric, 1) AS score_medio,
             COUNT(DISTINCT p.cliente_id) FILTER (WHERE a.score < 5) AS risco,
             COALESCE(SUM(o.valor_estimado), 0) AS oportunidades
      FROM dashboards_hub.tc_squads s
      LEFT JOIN dashboards_hub.tc_projetos p ON p.squad_id = s.id
      LEFT JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      LEFT JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
      LEFT JOIN dashboards_hub.tc_oportunidades o ON o.projeto_fase_id = pf.id
      WHERE p.cliente_id = ANY($1)
      GROUP BY s.nome ORDER BY score_medio ASC NULLS LAST
    `, [ids])

    const churn = await pool.query(`
      SELECT c.id, c.nome, a.score, a.veredicto,
             (SELECT COUNT(*) FROM dashboards_hub.tc_insatisfacoes i WHERE i.projeto_fase_id = pf.id AND i.gravidade IN ('alta','critica')) AS dores_graves
      FROM dashboards_hub.tc_clientes c
      JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
      JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
      JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
      WHERE c.id = ANY($1) AND a.score < 6
      ORDER BY a.score ASC, dores_graves DESC LIMIT 50
    `, [ids])

    const oportunidades = await pool.query(`
      SELECT status, COUNT(*) AS total, COALESCE(SUM(valor_estimado), 0) AS valor
      FROM dashboards_hub.tc_oportunidades o
      JOIN dashboards_hub.tc_projeto_fases pf ON pf.id = o.projeto_fase_id
      JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
      WHERE p.cliente_id = ANY($1)
      GROUP BY status
    `, [ids])

    const heatmap = await pool.query(`
      SELECT fc.nome AS fase, pf.status_cor, COUNT(*) AS total
      FROM dashboards_hub.tc_projeto_fases pf
      JOIN dashboards_hub.tc_fases_config fc ON fc.id = pf.fase_config_id
      JOIN dashboards_hub.tc_projetos p ON p.id = pf.projeto_id
      WHERE p.cliente_id = ANY($1) AND pf.status_cor IS NOT NULL
      GROUP BY fc.nome, fc.ordem, pf.status_cor
      ORDER BY fc.ordem
    `, [ids])

    res.json({
      scorecards: scorecards.rows[0],
      squads: squads.rows,
      churn: churn.rows,
      oportunidades: oportunidades.rows,
      heatmap: heatmap.rows
    })
  } catch (err) { next(err) }
})

// GET /api/tc/colaboradores — ultima analise semanal de cada user
router.get('/colaboradores', async (req, res, next) => {
  try {
    if (!['admin','board'].includes(req.session.role)) {
      return res.status(403).json({ error: 'somente admin/board' })
    }
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (u.id)
        u.id, u.name, u.email,
        ac.score_medio, ac.total_clientes, ac.clientes_risco,
        ac.pontos_fortes, ac.pontos_atencao, ac.recomendacoes,
        ac.distribuicao, ac.periodo
      FROM dashboards_hub.users u
      LEFT JOIN dashboards_hub.tc_analise_colaboradores ac ON ac.user_id = u.id
      WHERE u.ativo = true
      ORDER BY u.id, ac.periodo DESC NULLS LAST
    `)
    res.json({ colaboradores: rows })
  } catch (err) { next(err) }
})

function emptyPainel() {
  return {
    scorecards: { clientes_ativos: 0, score_medio: null, em_risco: 0, oportunidades_brl: 0, taxa_analise: 0 },
    squads: [], churn: [], oportunidades: [], heatmap: []
  }
}

export default router
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/torre-controle.js
git commit -m "feat(tc): rotas express /api/tc/* (matriz, analise, painel geral)"
```

---

## Task 9: Server Integration + Weekly Collaborator Cron

**Files:**
- Modify: `server/index.js`
- Create: `server/jobs/collaborator-analysis-cron.js`

- [ ] **Step 1: Mount routes and start worker in `server/index.js`**

Add near top (with other route imports):

```js
import torreControleRouter from './routes/torre-controle.js'
import { startJobWorker, stopJobWorker } from './services/tc-job-worker.js'
import { startCollaboratorCron } from './jobs/collaborator-analysis-cron.js'
```

Add after existing `app.use('/api/...')` mounts:

```js
app.use('/api/tc', torreControleRouter)
```

Add after `app.listen(...)` call:

```js
startJobWorker()
startCollaboratorCron()

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM — parando worker`)
  stopJobWorker()
  process.exit(0)
})
```

- [ ] **Step 2: Write collaborator cron**

```js
// server/jobs/collaborator-analysis-cron.js
// Analise semanal de colaboradores — domingo 03:00 BRT
import { pool } from '../lib/db.js'
import { analyzeCollaborator } from '../services/openai-client.js'

const CRON_EXPR = process.env.COLLAB_ANALYSIS_CRON || '0 3 * * 0' // domingo 03:00

function shouldRunNow() {
  // Minimal cron parser: dia semana + hora. Suficiente para "0 3 * * 0".
  const [min, hour, , , dow] = CRON_EXPR.split(' ')
  const now = new Date()
  return now.getUTCMinutes() === parseInt(min) &&
         now.getUTCHours() === (parseInt(hour) + 3) % 24 &&  // BRT -> UTC
         now.getUTCDay() === parseInt(dow)
}

async function runWeeklyAnalysis() {
  const periodo = new Date().toISOString().slice(0, 10)
  const { rows: users } = await pool.query(`
    SELECT DISTINCT u.id, u.name, u.email
    FROM dashboards_hub.users u
    JOIN dashboards_hub.tc_usuario_clientes uc ON uc.user_id = u.id
    WHERE u.ativo = true
  `)
  for (const u of users) {
    try {
      const { rows: [agg] } = await pool.query(`
        SELECT
          ROUND(AVG(a.score)::numeric, 1) AS score_medio,
          COUNT(DISTINCT c.id) AS total_clientes,
          COUNT(DISTINCT c.id) FILTER (WHERE a.score < 5) AS clientes_risco,
          json_agg(json_build_object(
            'cliente', c.nome, 'score', a.score, 'resumo', a.resumo
          )) AS clientes_data
        FROM dashboards_hub.tc_usuario_clientes uc
        JOIN dashboards_hub.tc_clientes c ON c.id = uc.cliente_id
        JOIN dashboards_hub.tc_projetos p ON p.cliente_id = c.id
        JOIN dashboards_hub.tc_projeto_fases pf ON pf.projeto_id = p.id
        JOIN dashboards_hub.tc_analises_ia a ON a.projeto_fase_id = pf.id
        WHERE uc.user_id = $1
      `, [u.id])

      if (!agg.total_clientes) continue

      const analise = await analyzeCollaborator({
        usuario: u.name, email: u.email, ...agg
      })

      await pool.query(`
        INSERT INTO dashboards_hub.tc_analise_colaboradores
          (user_id, periodo, score_medio, total_clientes, clientes_risco,
           pontos_fortes, pontos_atencao, recomendacoes, distribuicao, modelo_usado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id, periodo) DO UPDATE SET
          score_medio = EXCLUDED.score_medio,
          pontos_fortes = EXCLUDED.pontos_fortes,
          pontos_atencao = EXCLUDED.pontos_atencao,
          recomendacoes = EXCLUDED.recomendacoes,
          distribuicao = EXCLUDED.distribuicao
      `, [
        u.id, periodo, agg.score_medio, agg.total_clientes, agg.clientes_risco,
        JSON.stringify(analise.pontos_fortes || []),
        JSON.stringify(analise.pontos_atencao || []),
        JSON.stringify(analise.recomendacoes || []),
        JSON.stringify(analise.distribuicao || {}),
        process.env.COLLAB_ANALYSIS_MODEL || process.env.OPENAI_MODEL_ANALYSIS || 'gpt-5.4-mini'
      ])
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [collab-cron] user ${u.id}:`, err.message)
    }
  }
}

export function startCollaboratorCron() {
  // Polling 60s — suficiente para cron "domingo 03:00"
  setInterval(async () => {
    if (shouldRunNow()) {
      console.log(`[${new Date().toISOString()}] [collab-cron] iniciando analise semanal`)
      try { await runWeeklyAnalysis() }
      catch (err) { console.error('[collab-cron] fatal:', err.message) }
    }
  }, 60000)
}
```

- [ ] **Step 3: Test server starts cleanly**

```bash
npm run dev
# Verificar nos logs: "[worker] started" e sem erros de require
# curl http://localhost:3000/api/tc/matriz (com sessao valida) → 200 ou 401
```

- [ ] **Step 4: Commit**

```bash
git add server/index.js server/jobs/collaborator-analysis-cron.js
git commit -m "feat(tc): integracao server — rotas, worker e cron semanal"
```

---

## Task 10: Frontend Composable (useTorreControle)

**Files:**
- Create: `client/dashboards/TorreDeControle/composables/useTorreControle.js`

- [ ] **Step 1: Write the composable**

```js
// client/dashboards/TorreDeControle/composables/useTorreControle.js
import { ref, shallowRef, computed } from 'vue'

const POLL_MS = 3000

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/tc${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useTorreControle() {
  const matriz = shallowRef({ clientes: [], fases: [] })
  const painelGeral = shallowRef(null)
  const loading = ref(false)
  const error = ref(null)
  const activeJobs = ref(new Map()) // jobId -> { status, progresso }

  async function carregarMatriz() {
    loading.value = true; error.value = null
    try { matriz.value = await apiFetch('/matriz') }
    catch (err) { error.value = err.message }
    finally { loading.value = false }
  }

  async function carregarPainelGeral() {
    loading.value = true; error.value = null
    try { painelGeral.value = await apiFetch('/painel-geral') }
    catch (err) { error.value = err.message }
    finally { loading.value = false }
  }

  async function carregarDetalheFase(clienteId, faseId) {
    return apiFetch(`/cliente/${clienteId}/fase/${faseId}`)
  }

  async function analisar(projetoFaseId, leadId, fase) {
    const job = await apiFetch('/analisar', {
      method: 'POST',
      body: JSON.stringify({ projetoFaseId, leadId, fase })
    })
    pollJob(job.jobId)
    return job
  }

  async function analisarMassa(items) {
    const job = await apiFetch('/analisar-massa', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
    pollJob(job.jobId)
    return job
  }

  async function criarLeadKommo(payload) {
    return apiFetch('/kommo/lead', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  function pollJob(jobId) {
    if (activeJobs.value.has(jobId)) return
    activeJobs.value.set(jobId, { status: 'pending', progresso: {} })
    const tick = async () => {
      try {
        const job = await apiFetch(`/job/${jobId}`)
        activeJobs.value.set(jobId, {
          status: job.status,
          progresso: job.progresso || {},
          resultado: job.resultado
        })
        if (['completed','failed'].includes(job.status)) {
          if (job.status === 'completed') await carregarMatriz()
          setTimeout(() => activeJobs.value.delete(jobId), 5000)
          return
        }
        setTimeout(tick, POLL_MS)
      } catch {
        activeJobs.value.delete(jobId)
      }
    }
    tick()
  }

  const jobsEmAndamento = computed(() =>
    Array.from(activeJobs.value.values()).filter(j => !['completed','failed'].includes(j.status))
  )

  return {
    matriz, painelGeral, loading, error,
    activeJobs, jobsEmAndamento,
    carregarMatriz, carregarPainelGeral, carregarDetalheFase,
    analisar, analisarMassa, criarLeadKommo
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add client/dashboards/TorreDeControle/composables/useTorreControle.js
git commit -m "feat(tc): composable useTorreControle com polling de jobs"
```

---

## Task 11: TcJobProgress + TcTimelineFases + TcKommoLeadForm

**Files:**
- Create: `client/dashboards/TorreDeControle/components/TcJobProgress.vue`
- Create: `client/dashboards/TorreDeControle/components/TcTimelineFases.vue`
- Create: `client/dashboards/TorreDeControle/components/TcKommoLeadForm.vue`

- [ ] **Step 1: TcJobProgress.vue**

```vue
<script setup>
const props = defineProps({
  job: { type: Object, required: true } // { status, progresso }
})

const STEPS = [
  { key: 'fetching_kommo',     label: 'Buscando dados no Kommo' },
  { key: 'extracting_content', label: 'Extraindo materiais' },
  { key: 'building_rag',       label: 'Montando contexto (RAG)' },
  { key: 'calling_openai',     label: 'Analisando com IA' },
  { key: 'persisting',         label: 'Salvando analise' },
  { key: 'embedding',          label: 'Indexando' },
  { key: 'posting_note',       label: 'Atualizando nota Kommo' },
  { key: 'done',               label: 'Concluido' }
]

function isActive(key) { return props.job.progresso?.step === key }
function isDone(key) {
  const currentIdx = STEPS.findIndex(s => s.key === props.job.progresso?.step)
  const idx = STEPS.findIndex(s => s.key === key)
  return currentIdx > idx
}
</script>

<template>
  <div class="tc-job-progress">
    <div class="job-header">
      <span class="spinner"></span>
      <span>Analise em andamento</span>
    </div>
    <ol class="steps">
      <li v-for="s in STEPS" :key="s.key"
          :class="{ active: isActive(s.key), done: isDone(s.key) }">
        <span class="dot"></span>
        <span class="label">{{ s.label }}</span>
      </li>
    </ol>
    <div v-if="job.progresso?.ultimo_erro" class="job-error">
      Erro: {{ job.progresso.ultimo_erro }}
    </div>
  </div>
</template>

<style scoped>
.tc-job-progress {
  padding: var(--spacing-lg);
  background: var(--bg-inner);
  border-radius: var(--radius-md);
}
.job-header {
  display: flex; align-items: center; gap: var(--spacing-sm);
  color: var(--text-high); margin-bottom: var(--spacing-md);
}
.steps { list-style: none; padding: 0; margin: 0; }
.steps li {
  display: flex; align-items: center; gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  color: var(--text-lowest);
}
.steps li.active { color: var(--text-high); }
.steps li.done   { color: var(--color-safe); }
.dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-lowest);
}
.steps li.active .dot { background: var(--color-primary); }
.steps li.done .dot   { background: var(--color-safe); }
.job-error {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
}
</style>
```

- [ ] **Step 2: TcTimelineFases.vue**

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  fases: { type: Array, required: true },       // [{ id, nome, ordem }]
  clienteFases: { type: Object, required: true },// { [faseId]: { status_cor, score } }
  active: { type: Number, default: null }
})
const emit = defineEmits(['select'])

const items = computed(() =>
  props.fases.map(f => ({
    ...f,
    dados: props.clienteFases?.[f.id] || null
  }))
)

function corClasse(status) {
  return {
    verde: 'dot--safe',
    amarelo: 'dot--care',
    vermelho: 'dot--danger'
  }[status] || 'dot--empty'
}
</script>

<template>
  <div class="tc-timeline">
    <div v-for="item in items" :key="item.id"
         class="step"
         :class="{ 'is-active': active === item.id }"
         @click="emit('select', item.id)">
      <div class="dot" :class="corClasse(item.dados?.status_cor)">
        <span v-if="item.dados?.score">{{ item.dados.score }}</span>
      </div>
      <div class="label">{{ item.nome }}</div>
    </div>
  </div>
</template>

<style scoped>
.tc-timeline {
  display: flex; gap: var(--spacing-md);
  padding: var(--spacing-md); overflow-x: auto;
}
.step {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--spacing-xs); cursor: pointer;
  min-width: 80px; padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: background 150ms;
}
.step:hover, .step.is-active {
  background: var(--hover-overlay-subtle);
}
.dot {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--font-size-sm); font-weight: 700; color: #fff;
}
.dot--safe   { background: var(--color-safe); }
.dot--care   { background: var(--color-care); color: #000; }
.dot--danger { background: var(--color-danger); }
.dot--empty  { background: var(--bg-inner); border: 1px dashed var(--border-card); color: var(--text-lowest); }
.label {
  font-size: var(--font-size-sm); color: var(--text-low);
  text-align: center;
}
.step.is-active .label { color: var(--text-high); }
</style>
```

- [ ] **Step 3: TcKommoLeadForm.vue**

```vue
<script setup>
import { ref } from 'vue'

const props = defineProps({
  oportunidade: { type: Object, default: null }
})
const emit = defineEmits(['submit', 'cancel'])

const PIPELINES = [
  { id: '12184216', nome: 'Pre-Vendas' },
  { id: '12184220', nome: 'Aquisicao' },
  { id: '12184212', nome: 'Expansao' },
  { id: '12887948', nome: 'Fabrica de Receitas' },
  { id: '13504320', nome: 'Ter' },
  { id: '13504028', nome: 'Executar Onboarding' },
  { id: '13504212', nome: 'Executar Retention' },
  { id: '12697488', nome: 'Nutricao' }
]

const form = ref({
  pipelineId: PIPELINES[0].id,
  statusId: '',
  name: props.oportunidade?.titulo || '',
  valor: props.oportunidade?.valor_estimado || 0,
  observacoes: props.oportunidade?.descricao || ''
})
const submitting = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  if (!form.value.name || !form.value.statusId) {
    errorMsg.value = 'Nome e ID da etapa sao obrigatorios'
    return
  }
  submitting.value = true; errorMsg.value = ''
  try {
    await emit('submit', { ...form.value })
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="kommo-form" @submit.prevent="handleSubmit">
    <label>
      Pipeline
      <select v-model="form.pipelineId">
        <option v-for="p in PIPELINES" :key="p.id" :value="p.id">{{ p.nome }}</option>
      </select>
    </label>
    <label>
      ID da etapa (status)
      <input v-model="form.statusId" type="text" placeholder="ex: 142" />
    </label>
    <label>
      Nome do lead
      <input v-model="form.name" type="text" required />
    </label>
    <label>
      Valor (R$)
      <input v-model.number="form.valor" type="number" step="0.01" />
    </label>
    <label>
      Observacoes
      <textarea v-model="form.observacoes" rows="3" />
    </label>
    <div v-if="errorMsg" class="error">{{ errorMsg }}</div>
    <div class="actions">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">Cancelar</button>
      <button type="submit" class="btn" :disabled="submitting">
        {{ submitting ? 'Criando...' : 'Criar no Kommo' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.kommo-form { display: flex; flex-direction: column; gap: var(--spacing-md); }
.kommo-form label {
  display: flex; flex-direction: column; gap: var(--spacing-xs);
  font-size: var(--font-size-sm); color: var(--text-low);
}
.kommo-form input, .kommo-form select, .kommo-form textarea {
  background: var(--bg-inner); border: 1px solid var(--border-card);
  color: var(--text-high); padding: var(--spacing-sm);
  border-radius: var(--radius-sm); font-family: inherit;
}
.actions { display: flex; gap: var(--spacing-sm); justify-content: flex-end; }
.error { color: var(--color-danger); font-size: var(--font-size-sm); }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add client/dashboards/TorreDeControle/components/TcJobProgress.vue \
        client/dashboards/TorreDeControle/components/TcTimelineFases.vue \
        client/dashboards/TorreDeControle/components/TcKommoLeadForm.vue
git commit -m "feat(tc): componentes job progress, timeline fases e form kommo"
```

---

## Task 12: TcSuperPainel (Fullscreen AI Report)

**Files:**
- Create: `client/dashboards/TorreDeControle/components/TcSuperPainel.vue`

- [ ] **Step 1: Write the fullscreen super painel**

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import TcTimelineFases from './TcTimelineFases.vue'
import TcJobProgress from './TcJobProgress.vue'
import TcKommoLeadForm from './TcKommoLeadForm.vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const props = defineProps({
  cliente: { type: Object, required: true },   // { id, nome, segmento, squad, fases }
  fases: { type: Array, required: true },      // [{ id, nome, ordem }]
  faseInicial: { type: Number, default: null },
  leadId: { type: String, required: true }
})
const emit = defineEmits(['close'])

const tc = useTorreControle()
const faseAtiva = ref(props.faseInicial || props.fases[0]?.id)
const detalhe = ref(null)
const loadingDetalhe = ref(false)
const mostraFormLead = ref(false)
const oportunidadeSelecionada = ref(null)

const analiseAtual = computed(() => detalhe.value?.analises?.[0] || null)
const dadosFaseAtiva = computed(() => props.cliente.fases?.[faseAtiva.value] || null)

const jobAtivo = computed(() => {
  for (const j of tc.jobsEmAndamento.value) {
    if (j.progresso?.payload?.projetoFaseId === detalhe.value?.fase?.id) return j
  }
  return null
})

async function carregarDetalhe() {
  if (!faseAtiva.value) return
  loadingDetalhe.value = true
  try {
    detalhe.value = await tc.carregarDetalheFase(props.cliente.id, faseAtiva.value)
  } finally {
    loadingDetalhe.value = false
  }
}

async function analisarFase() {
  if (!detalhe.value?.fase) return
  await tc.analisar(detalhe.value.fase.id, props.leadId, slugify(detalhe.value.fase.fase_nome))
}

async function criarLead(payload) {
  await tc.criarLeadKommo(payload)
  mostraFormLead.value = false
}

function abrirFormLead(op) {
  oportunidadeSelecionada.value = op
  mostraFormLead.value = true
}

function slugify(s) { return (s || '').toLowerCase().replace(/\s+/g, '-') }

function handleKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  carregarDetalhe()
  window.addEventListener('keydown', handleKeydown)
})

watch(faseAtiva, carregarDetalhe)
watch(() => jobAtivo.value?.status, (status) => {
  if (status === 'completed') carregarDetalhe()
})
</script>

<template>
  <div class="super-painel" role="dialog" aria-modal="true">
    <header class="sp-header">
      <div class="sp-titulo">
        <h1>{{ cliente.nome }}</h1>
        <div class="sp-meta">
          <span>{{ cliente.segmento }}</span>
          <span v-if="cliente.squad">• {{ cliente.squad }}</span>
          <span v-if="dadosFaseAtiva?.score">• Score: {{ dadosFaseAtiva.score }}</span>
        </div>
      </div>
      <button class="btn btn-ghost" @click="emit('close')" aria-label="Fechar">✕</button>
    </header>

    <TcTimelineFases
      :fases="fases"
      :cliente-fases="cliente.fases || {}"
      :active="faseAtiva"
      @select="faseAtiva = $event"
    />

    <TcJobProgress v-if="jobAtivo" :job="jobAtivo" />

    <div v-if="loadingDetalhe" class="sp-loading">
      <VLoadingState size="lg" />
    </div>

    <div v-else-if="!analiseAtual" class="sp-vazio">
      <p>Nenhuma analise para esta fase ainda.</p>
      <button class="btn" @click="analisarFase" :disabled="!!jobAtivo">
        Analisar agora
      </button>
    </div>

    <div v-else class="sp-body">
      <section class="sp-coluna sp-coluna--relatorio">
        <div class="sp-card">
          <div class="sp-card-header">
            <h2>Resumo Executivo</h2>
            <span class="sp-veredicto">{{ analiseAtual.veredicto }}</span>
          </div>
          <p>{{ analiseAtual.resumo }}</p>
        </div>

        <div class="sp-card">
          <h2>Analise dos Materiais</h2>
          <p>{{ analiseAtual.analise_materiais }}</p>
        </div>

        <div class="sp-card">
          <h2>Percepcao do Cliente</h2>
          <div class="sp-percepcao">
            <div v-for="(valor, chave) in analiseAtual.percepcao_cliente" :key="chave">
              <span class="label">{{ chave }}</span>
              <strong>{{ valor }}/10</strong>
            </div>
          </div>
        </div>

        <div class="sp-card">
          <h2>Dores / Insatisfacoes</h2>
          <ul>
            <li v-for="(d, i) in analiseAtual.dores" :key="i" :data-gravidade="d.gravidade">
              <span class="gravidade" :class="`gravidade--${d.gravidade}`">{{ d.gravidade }}</span>
              {{ d.descricao }}
            </li>
          </ul>
        </div>
      </section>

      <section class="sp-coluna sp-coluna--acoes">
        <div class="sp-card">
          <h2>Oportunidades</h2>
          <ul class="sp-oportunidades">
            <li v-for="(op, i) in analiseAtual.oportunidades" :key="i">
              <strong>{{ op.titulo }}</strong>
              <p>{{ op.descricao }}</p>
              <div class="linha">
                <span v-if="op.valor_estimado">R$ {{ op.valor_estimado.toLocaleString('pt-BR') }}</span>
                <button class="btn btn-sm" @click="abrirFormLead(op)">+ Kommo</button>
              </div>
            </li>
          </ul>
        </div>

        <div class="sp-card">
          <h2>Riscos</h2>
          <ul>
            <li v-for="(r, i) in analiseAtual.riscos" :key="i">
              <strong>{{ r.tipo }}</strong> — {{ r.descricao }}
              <small>(prob: {{ r.probabilidade }} / impacto: {{ r.impacto }})</small>
            </li>
          </ul>
        </div>

        <div class="sp-card">
          <h2>Recomendacoes</h2>
          <ol>
            <li v-for="(rec, i) in analiseAtual.recomendacoes" :key="i">
              <span class="prioridade" :class="`prioridade--${rec.prioridade}`">{{ rec.prioridade }}</span>
              {{ rec.descricao }}
            </li>
          </ol>
        </div>
      </section>
    </div>

    <footer class="sp-footer">
      <span class="sp-versao">Versao {{ analiseAtual?.versao || '-' }}</span>
      <div class="sp-actions">
        <button class="btn btn-ghost" @click="analisarFase" :disabled="!!jobAtivo">
          Re-analisar
        </button>
      </div>
    </footer>

    <div v-if="mostraFormLead" class="sp-modal" @click.self="mostraFormLead = false">
      <div class="sp-modal-body">
        <h2>Novo lead no Kommo</h2>
        <TcKommoLeadForm
          :oportunidade="oportunidadeSelecionada"
          @submit="criarLead"
          @cancel="mostraFormLead = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.super-painel {
  position: fixed; inset: 0;
  background: var(--bg-body);
  display: flex; flex-direction: column;
  z-index: 9000;
  overflow-y: auto;
}
.sp-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-card);
}
.sp-titulo h1 { font-size: var(--font-size-xl); color: var(--text-high); margin: 0; }
.sp-meta { font-size: var(--font-size-sm); color: var(--text-low); margin-top: var(--spacing-xs); }
.sp-meta > span + span { margin-left: var(--spacing-xs); }

.sp-loading, .sp-vazio {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--spacing-md);
}

.sp-body {
  display: grid; grid-template-columns: 1.2fr 1fr;
  gap: var(--spacing-lg); padding: var(--spacing-lg);
  flex: 1;
}
.sp-coluna { display: flex; flex-direction: column; gap: var(--spacing-md); }
.sp-card {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-md); padding: var(--spacing-lg);
}
.sp-card h2 {
  font-size: var(--font-size-lg); color: var(--text-high);
  margin: 0 0 var(--spacing-md);
}
.sp-card-header { display: flex; justify-content: space-between; align-items: center; }
.sp-veredicto {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg-inner); border-radius: var(--radius-sm);
  font-size: var(--font-size-sm); color: var(--text-high);
}

.sp-percepcao { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--spacing-md); }
.sp-percepcao .label { display: block; color: var(--text-low); font-size: var(--font-size-sm); }
.sp-percepcao strong { color: var(--text-high); font-size: var(--font-size-lg); }

.gravidade, .prioridade {
  display: inline-block;
  padding: 2px 6px; border-radius: var(--radius-sm);
  font-size: var(--font-size-xs); margin-right: var(--spacing-xs);
  text-transform: uppercase; font-weight: 700;
}
.gravidade--critica, .prioridade--critica { background: var(--color-danger); color: #fff; }
.gravidade--alta, .prioridade--alta         { background: var(--color-danger); color: #fff; }
.gravidade--media, .prioridade--media       { background: var(--color-care); color: #000; }
.gravidade--baixa, .prioridade--baixa       { background: var(--color-safe); color: #fff; }

.sp-oportunidades { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing-md); }
.sp-oportunidades .linha { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-sm); }

.sp-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-card);
}
.sp-versao { color: var(--text-muted); font-size: var(--font-size-sm); }

.sp-modal {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6); z-index: 9100;
  display: flex; align-items: center; justify-content: center;
}
.sp-modal-body {
  background: var(--bg-card); border-radius: var(--radius-md);
  padding: var(--spacing-lg); min-width: 440px; max-width: 600px;
}

@media (max-width: 1024px) {
  .sp-body { grid-template-columns: 1fr; }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/dashboards/TorreDeControle/components/TcSuperPainel.vue
git commit -m "feat(tc): super painel fullscreen com relatorio ia e acoes crm"
```

---

## Task 13: TcTabVisaoGeral (Heatmap + Trends)

**Files:**
- Create: `client/dashboards/TorreDeControle/components/TcTabVisaoGeral.vue`

- [ ] **Step 1: Write the tab with heatmap + trends**

```vue
<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import VLineChart from '../../../components/charts/VLineChart.vue'

const props = defineProps({
  heatmap: { type: Array, required: true },  // [{ fase, status_cor, total }]
  trend: { type: Array, default: () => [] }  // opcional: [{ periodo, score_medio }]
})

// agrupa heatmap por fase x cor
const heatmapGrid = computed(() => {
  const porFase = {}
  for (const row of props.heatmap) {
    porFase[row.fase] = porFase[row.fase] || { verde: 0, amarelo: 0, vermelho: 0 }
    porFase[row.fase][row.status_cor] = Number(row.total) || 0
  }
  return Object.entries(porFase).map(([fase, counts]) => ({ fase, ...counts }))
})

const trendLabels = computed(() => props.trend.map(t => t.periodo))
const trendData = computed(() => props.trend.map(t => Number(t.score_medio) || 0))
</script>

<template>
  <div class="tab-visao-geral">
    <div class="card">
      <h3 class="card-title">Heatmap de Fases</h3>
      <table class="heatmap">
        <thead>
          <tr>
            <th>Fase</th>
            <th>Verde</th>
            <th>Amarelo</th>
            <th>Vermelho</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in heatmapGrid" :key="h.fase">
            <td>{{ h.fase }}</td>
            <td class="cell cell--safe">{{ h.verde }}</td>
            <td class="cell cell--care">{{ h.amarelo }}</td>
            <td class="cell cell--danger">{{ h.vermelho }}</td>
            <td><strong>{{ h.verde + h.amarelo + h.vermelho }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="trend.length" class="card">
      <h3 class="card-title">Tendencia de Score Medio</h3>
      <VLineChart
        :labels="trendLabels"
        :data="trendData"
        label="Score medio"
        :color="'#22c55e'"
        :gradient="true"
      />
    </div>
  </div>
</template>

<style scoped>
.tab-visao-geral { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.heatmap { width: 100%; border-collapse: collapse; }
.heatmap th, .heatmap td {
  padding: var(--spacing-sm); text-align: left;
  border-bottom: 1px solid var(--border-row);
}
.heatmap th { color: var(--text-low); font-weight: 500; font-size: var(--font-size-sm); }
.cell { font-weight: 700; text-align: center; }
.cell--safe   { color: var(--color-safe); }
.cell--care   { color: var(--color-care); }
.cell--danger { color: var(--color-danger); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/dashboards/TorreDeControle/components/TcTabVisaoGeral.vue
git commit -m "feat(tc): tab visao geral com heatmap de fases"
```

---

## Task 14: TcTabSquads + TcTabChurn + TcTabOportunidades

**Files:**
- Create: `client/dashboards/TorreDeControle/components/TcTabSquads.vue`
- Create: `client/dashboards/TorreDeControle/components/TcTabChurn.vue`
- Create: `client/dashboards/TorreDeControle/components/TcTabOportunidades.vue`

- [ ] **Step 1: TcTabSquads.vue**

```vue
<script setup>
import { computed } from 'vue'
import VBarChart from '../../../components/charts/VBarChart.vue'

const props = defineProps({
  squads: { type: Array, required: true } // [{ squad, clientes, score_medio, risco, oportunidades }]
})

const labels = computed(() => props.squads.map(s => s.squad))
const datasets = computed(() => [
  { label: 'Score medio', data: props.squads.map(s => Number(s.score_medio) || 0) }
])
</script>

<template>
  <div class="tab-squads">
    <div class="card">
      <h3 class="card-title">Saude por Squad</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Squad</th><th>Clientes</th><th>Score medio</th><th>Risco</th><th>Oportunidades</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in squads" :key="s.squad">
            <td>{{ s.squad }}</td>
            <td>{{ s.clientes }}</td>
            <td>
              <strong :class="s.score_medio < 5 ? 'danger' : s.score_medio < 7 ? 'care' : 'safe'">
                {{ s.score_medio ?? '-' }}
              </strong>
            </td>
            <td>{{ s.risco }}</td>
            <td>R$ {{ Number(s.oportunidades || 0).toLocaleString('pt-BR') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3 class="card-title">Comparativo de Score</h3>
      <VBarChart :labels="labels" :datasets="datasets" :horizontal="false" />
    </div>
  </div>
</template>

<style scoped>
.tab-squads { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.danger { color: var(--color-danger); }
.care   { color: var(--color-care); }
.safe   { color: var(--color-safe); }
</style>
```

- [ ] **Step 2: TcTabChurn.vue**

```vue
<script setup>
defineProps({
  churn: { type: Array, required: true } // [{ id, nome, score, veredicto, dores_graves }]
})
const emit = defineEmits(['abrir-cliente'])
</script>

<template>
  <div class="tab-churn">
    <div class="card">
      <h3 class="card-title">Radar de Churn — Clientes em Risco</h3>
      <p class="subtitulo">Ordenado por score ascendente + dores graves</p>
      <ul class="lista-risco">
        <li v-for="c in churn" :key="c.id" class="item" @click="emit('abrir-cliente', c.id)">
          <div class="meta">
            <strong>{{ c.nome }}</strong>
            <span class="veredicto">{{ c.veredicto }}</span>
          </div>
          <div class="indicadores">
            <span class="score" :class="c.score < 3 ? 'critico' : c.score < 5 ? 'alto' : 'medio'">
              {{ c.score }}
            </span>
            <span v-if="c.dores_graves > 0" class="dores">
              {{ c.dores_graves }} dor(es) grave(s)
            </span>
          </div>
        </li>
        <li v-if="!churn.length" class="empty">Nenhum cliente em zona de risco.</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.subtitulo { color: var(--text-low); margin-bottom: var(--spacing-md); }
.lista-risco { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing-xs); }
.item {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--spacing-sm); border-radius: var(--radius-sm);
  cursor: pointer; transition: background 150ms;
}
.item:hover { background: var(--hover-overlay-minimal); }
.meta { display: flex; flex-direction: column; }
.veredicto { color: var(--text-low); font-size: var(--font-size-sm); }
.indicadores { display: flex; align-items: center; gap: var(--spacing-md); }
.score {
  font-weight: 700; font-size: var(--font-size-lg);
  padding: 2px 8px; border-radius: var(--radius-sm);
}
.critico { background: var(--color-danger); color: #fff; }
.alto    { background: var(--color-care); color: #000; }
.medio   { background: var(--bg-inner); color: var(--text-high); }
.dores { color: var(--color-danger); font-size: var(--font-size-sm); }
.empty { color: var(--text-lowest); text-align: center; padding: var(--spacing-lg); }
</style>
```

- [ ] **Step 3: TcTabOportunidades.vue**

```vue
<script setup>
import { computed } from 'vue'
import VBarChart from '../../../components/charts/VBarChart.vue'

const props = defineProps({
  oportunidades: { type: Array, required: true } // [{ status, total, valor }]
})

const total = computed(() => props.oportunidades.reduce((a, o) => a + Number(o.valor || 0), 0))
const labels = computed(() => props.oportunidades.map(o => o.status))
const datasets = computed(() => [
  { label: 'Valor (R$)', data: props.oportunidades.map(o => Number(o.valor || 0)) }
])
</script>

<template>
  <div class="tab-oportunidades">
    <div class="card">
      <h3 class="card-title">Pipeline de Oportunidades</h3>
      <div class="scorecards">
        <div class="scorecard" v-for="o in oportunidades" :key="o.status">
          <div class="scorecard-label">{{ o.status }}</div>
          <div class="scorecard-value">{{ o.total }}</div>
          <div class="scorecard-sub">R$ {{ Number(o.valor || 0).toLocaleString('pt-BR') }}</div>
        </div>
        <div class="scorecard scorecard--total">
          <div class="scorecard-label">Total</div>
          <div class="scorecard-value">R$ {{ total.toLocaleString('pt-BR') }}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Distribuicao por Status</h3>
      <VBarChart :labels="labels" :datasets="datasets" :horizontal="true" />
    </div>
  </div>
</template>

<style scoped>
.tab-oportunidades { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.scorecard-sub { color: var(--text-low); font-size: var(--font-size-sm); }
.scorecard--total { border: 1px solid var(--color-primary); }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add client/dashboards/TorreDeControle/components/TcTabSquads.vue \
        client/dashboards/TorreDeControle/components/TcTabChurn.vue \
        client/dashboards/TorreDeControle/components/TcTabOportunidades.vue
git commit -m "feat(tc): tabs squads, churn e oportunidades"
```

---

## Task 15: TcTabColaboradores + TcPainelGeral (Hub das Tabs)

**Files:**
- Create: `client/dashboards/TorreDeControle/components/TcTabColaboradores.vue`
- Create: `client/dashboards/TorreDeControle/components/TcPainelGeral.vue`

- [ ] **Step 1: TcTabColaboradores.vue**

```vue
<script setup>
defineProps({
  colaboradores: { type: Array, required: true }
  // [{ id, name, score_medio, total_clientes, clientes_risco, pontos_fortes, pontos_atencao, recomendacoes, distribuicao, periodo }]
})
</script>

<template>
  <div class="tab-colabs">
    <div v-if="!colaboradores.length" class="empty">
      Nenhuma analise de colaboradores ainda. A primeira roda no proximo domingo as 03:00.
    </div>
    <div v-else class="grid">
      <div class="card colab-card" v-for="c in colaboradores" :key="c.id">
        <div class="colab-header">
          <strong>{{ c.name }}</strong>
          <span class="score" :class="(c.score_medio ?? 0) < 5 ? 'danger' : 'safe'">
            {{ c.score_medio ?? '-' }}
          </span>
        </div>
        <div class="colab-stats">
          <span>{{ c.total_clientes }} clientes</span>
          <span v-if="c.clientes_risco">• {{ c.clientes_risco }} em risco</span>
          <small v-if="c.periodo">• {{ c.periodo }}</small>
        </div>
        <div class="secao" v-if="c.pontos_fortes?.length">
          <h4>Pontos Fortes</h4>
          <ul><li v-for="(p, i) in c.pontos_fortes" :key="i">{{ p }}</li></ul>
        </div>
        <div class="secao" v-if="c.pontos_atencao?.length">
          <h4>Pontos de Atencao</h4>
          <ul><li v-for="(p, i) in c.pontos_atencao" :key="i">{{ p }}</li></ul>
        </div>
        <div class="secao" v-if="c.recomendacoes?.length">
          <h4>Recomendacoes</h4>
          <ol><li v-for="(r, i) in c.recomendacoes" :key="i">{{ r }}</li></ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-colabs { padding: var(--spacing-md) 0; }
.empty { padding: var(--spacing-2xl); text-align: center; color: var(--text-low); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: var(--spacing-lg); }
.colab-card { display: flex; flex-direction: column; gap: var(--spacing-md); }
.colab-header { display: flex; justify-content: space-between; align-items: center; }
.colab-stats { color: var(--text-low); font-size: var(--font-size-sm); }
.colab-stats > span + span { margin-left: var(--spacing-xs); }
.secao h4 { font-size: var(--font-size-sm); color: var(--text-low); margin: 0 0 var(--spacing-xs); text-transform: uppercase; }
.secao ul, .secao ol { margin: 0; padding-left: var(--spacing-lg); color: var(--text-medium); font-size: var(--font-size-sm); }
.score { font-weight: 700; padding: 2px 10px; border-radius: var(--radius-sm); }
.danger { background: var(--color-danger); color: #fff; }
.safe   { background: var(--color-safe); color: #fff; }
</style>
```

- [ ] **Step 2: TcPainelGeral.vue (hub das 5 tabs + scorecards)**

```vue
<script setup>
import { ref, onMounted, computed } from 'vue'
import TcTabVisaoGeral from './TcTabVisaoGeral.vue'
import TcTabSquads from './TcTabSquads.vue'
import TcTabChurn from './TcTabChurn.vue'
import TcTabOportunidades from './TcTabOportunidades.vue'
import TcTabColaboradores from './TcTabColaboradores.vue'
import VScorecard from '../../../components/ui/VScorecard.vue'
import { useTorreControle } from '../composables/useTorreControle.js'

const emit = defineEmits(['abrir-cliente'])

const tc = useTorreControle()
const tabAtiva = ref('visao-geral')
const colaboradores = ref([])

const TABS = [
  { key: 'visao-geral',    label: 'Visao Geral' },
  { key: 'squads',         label: 'Squads' },
  { key: 'churn',          label: 'Churn' },
  { key: 'oportunidades',  label: 'Oportunidades' },
  { key: 'colaboradores',  label: 'Colaboradores' }
]

const sc = computed(() => tc.painelGeral.value?.scorecards || {})

async function carregarColaboradores() {
  try {
    const res = await fetch('/api/tc/colaboradores', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      colaboradores.value = data.colaboradores || []
    }
  } catch { /* silencioso — tab pode nao estar liberada */ }
}

onMounted(async () => {
  await tc.carregarPainelGeral()
  carregarColaboradores()
})
</script>

<template>
  <div class="painel-geral">
    <div class="scorecards">
      <VScorecard label="Clientes Ativos" :value="sc.clientes_ativos" />
      <VScorecard label="Score Medio" :value="sc.score_medio" />
      <VScorecard label="Em Risco" :value="sc.em_risco" variant="danger" />
      <VScorecard label="Oportunidades"
                  :value="`R$ ${Number(sc.oportunidades_brl || 0).toLocaleString('pt-BR')}`" />
      <VScorecard label="Taxa de Analise" :value="`${sc.taxa_analise ?? 0}%`" />
    </div>

    <nav class="tabs" role="tablist">
      <button
        v-for="t in TABS" :key="t.key"
        role="tab" :aria-selected="tabAtiva === t.key"
        :class="['tab', { active: tabAtiva === t.key }]"
        @click="tabAtiva = t.key">
        {{ t.label }}
      </button>
    </nav>

    <section v-if="tc.loading.value" class="loading"><VLoadingState size="lg" /></section>

    <section v-else-if="tc.painelGeral.value" class="tab-content">
      <TcTabVisaoGeral
        v-if="tabAtiva === 'visao-geral'"
        :heatmap="tc.painelGeral.value.heatmap"
      />
      <TcTabSquads
        v-else-if="tabAtiva === 'squads'"
        :squads="tc.painelGeral.value.squads"
      />
      <TcTabChurn
        v-else-if="tabAtiva === 'churn'"
        :churn="tc.painelGeral.value.churn"
        @abrir-cliente="emit('abrir-cliente', $event)"
      />
      <TcTabOportunidades
        v-else-if="tabAtiva === 'oportunidades'"
        :oportunidades="tc.painelGeral.value.oportunidades"
      />
      <TcTabColaboradores
        v-else-if="tabAtiva === 'colaboradores'"
        :colaboradores="colaboradores"
      />
    </section>
  </div>
</template>

<style scoped>
.painel-geral { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.tabs { display: flex; gap: var(--spacing-xs); border-bottom: 1px solid var(--border-card); }
.tab {
  background: none; border: none; color: var(--text-low);
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: inherit; cursor: pointer;
  border-bottom: 2px solid transparent; transition: all 150ms;
}
.tab:hover { color: var(--text-high); }
.tab.active { color: var(--text-high); border-bottom-color: var(--color-primary); }
.loading { display: flex; justify-content: center; padding: var(--spacing-2xl); }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add client/dashboards/TorreDeControle/components/TcTabColaboradores.vue \
        client/dashboards/TorreDeControle/components/TcPainelGeral.vue
git commit -m "feat(tc): tab colaboradores e hub painel geral com 5 tabs"
```

---

## Task 16: Integrate into TorreDeControle/index.vue

**Files:**
- Modify: `client/dashboards/TorreDeControle/index.vue`
- Modify: `client/dashboards/TorreDeControle/config.js` (remove mock flag)
- Modify: `config/dashboards.json` (set status: available for TC)

- [ ] **Step 1: Rewrite `index.vue` with mode toggle (Painel Geral | Matriz)**

Critical: existing file has 300 lines. Read it first, then apply surgical Edit. Key changes:
- Import `TcSuperPainel` and `TcPainelGeral`
- Replace `TcDetalhePanel` drawer logic with fullscreen `TcSuperPainel`
- Add mode toggle in header: "Painel Geral" vs "Matriz"
- Track `clienteAberto` + `faseAberta` → renders `TcSuperPainel` when set

Skeleton:

```vue
<script setup>
import { ref, onMounted, computed } from 'vue'
import TcMatrizTable from './components/TcMatrizTable.vue'
import TcSuperPainel from './components/TcSuperPainel.vue'
import TcPainelGeral from './components/TcPainelGeral.vue'
import VRefreshButton from '../../components/ui/VRefreshButton.vue'
import VLoadingState from '../../components/ui/VLoadingState.vue'
import VToggleGroup from '../../components/ui/VToggleGroup.vue'
import { useTorreControle } from './composables/useTorreControle.js'

const tc = useTorreControle()
const modo = ref('painel-geral') // 'painel-geral' | 'matriz'
const clienteAberto = ref(null)  // objeto cliente
const faseAberta = ref(null)     // faseConfigId

const modos = [
  { value: 'painel-geral', label: 'Painel Geral' },
  { value: 'matriz',       label: 'Matriz' }
]

onMounted(async () => {
  await tc.carregarMatriz()
})

function abrirCliente(clienteOrId, faseId = null) {
  const cliente = typeof clienteOrId === 'object'
    ? clienteOrId
    : tc.matriz.value.clientes.find(c => c.id === clienteOrId)
  if (!cliente) return
  clienteAberto.value = cliente
  faseAberta.value = faseId
}

function fecharPainel() {
  clienteAberto.value = null
  faseAberta.value = null
}
</script>

<template>
  <div class="dashboard-container">
    <header class="main-header">
      <div>
        <h1 class="main-title">Torre de Controle</h1>
        <p class="main-subtitle">Saude dos clientes do pipeline Saber</p>
      </div>
      <div class="main-actions">
        <VToggleGroup v-model="modo" :options="modos" />
        <VRefreshButton @refresh="tc.carregarMatriz" />
      </div>
    </header>

    <VLoadingState v-if="tc.loading.value" size="lg" />

    <TcPainelGeral
      v-else-if="modo === 'painel-geral'"
      @abrir-cliente="abrirCliente"
    />

    <TcMatrizTable
      v-else-if="modo === 'matriz' && tc.matriz.value.clientes.length"
      :clientes="tc.matriz.value.clientes"
      :fases="tc.matriz.value.fases"
      @select="abrirCliente"
    />

    <TcSuperPainel
      v-if="clienteAberto"
      :cliente="clienteAberto"
      :fases="tc.matriz.value.fases"
      :fase-inicial="faseAberta"
      :lead-id="clienteAberto.lead_id || clienteAberto.id_externo || String(clienteAberto.id)"
      @close="fecharPainel"
    />
  </div>
</template>
```

- [ ] **Step 2: Update `config.js` — remove mock flag if present**

- [ ] **Step 3: Update `config/dashboards.json` — set TC status**

```json
{
  "id": "torre-de-controle",
  "status": "available",
  "statusMessage": ""
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add client/dashboards/TorreDeControle/index.vue client/dashboards/TorreDeControle/config.js config/dashboards.json
git commit -m "feat(tc): torre de controle com painel geral + super painel fullscreen"
```

---

## Task 17: Environment Variables

**Files:**
- Modify: `.env.example`
- Modify local: `.env` (not committed)

- [ ] **Step 1: Add Super Painel block to `.env.example`**

Append to `.env.example` (do NOT remove existing vars):

```bash
# ── Super Painel — Torre de Controle ───────────────────────

# Kommo CRM
KOMMO_BASE_URL=https://edisonv4companycom.kommo.com/api/v4
KOMMO_API_TOKEN=
KOMMO_PIPELINE_SABER_ID=12925780
KOMMO_RATE_LIMIT_PER_SECOND=3

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL_ANALYSIS=gpt-5.4-mini
OPENAI_MODEL_VISUAL=gpt-5.4
OPENAI_MODEL_NOTE=gpt-5.4-nano
OPENAI_MODEL_EMBEDDING=text-embedding-3-small
OPENAI_MAX_CONCURRENT=3
OPENAI_MAX_RPM=60

# n8n extracao
N8N_EXTRACT_WEBHOOK_URL=
N8N_MAX_CONCURRENT=2

# Job worker
JOB_POLL_INTERVAL=3000
JOB_BATCH_SIZE=2
JOB_MAX_RETRIES=3
JOB_LOCK_TTL_MS=600000

# RAG
RAG_MAX_CONTEXT_TOKENS=12000
RAG_LAYER1_BUDGET=2000
RAG_LAYER2_BUDGET=3000
RAG_LAYER2_TOP_K=5
RAG_LAYER3_BUDGET=2000
RAG_LAYER3_TOP_K=5

# Analise semanal de colaboradores (cron no UTC-3)
COLLAB_ANALYSIS_CRON=0 3 * * 0
COLLAB_ANALYSIS_MODEL=gpt-5.4-mini
```

- [ ] **Step 2: Preencher valores em `.env` local (nao commitar)**

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(tc): env vars super painel (kommo, openai, rag, jobs)"
```

---

## Task 18: End-to-End Verification + Smoke Tests

**Goal:** Garantir que todos os fluxos funcionam fim-a-fim antes de considerar o Super Painel pronto para producao.

- [ ] **Step 1: Verify build + server boot**

```bash
npm run build
npm run dev
```

Logs esperados:
- `[worker] started — poll=3000ms batch=2`
- `Server listening on port 3000`
- Nenhum erro de import ou de migrations

- [ ] **Step 2: Verify migrations applied**

```bash
psql "$DATABASE_URL" -c "\dt dashboards_hub.tc_*"
```

Deve listar todas as tabelas novas: `tc_jobs`, `tc_extracoes`, `tc_analises_ia`, `tc_embeddings`, `tc_conhecimento`, `tc_usuario_clientes`, `tc_analise_colaboradores` alem das existentes.

```bash
psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

- [ ] **Step 3: Smoke test — Rotas autenticadas**

Logar no hub via browser e no console do devtools:

```js
await fetch('/api/tc/matriz',       { credentials: 'include' }).then(r => r.json())
await fetch('/api/tc/painel-geral', { credentials: 'include' }).then(r => r.json())
```

Ambos devem retornar JSON estruturado (ou objeto vazio caso nao tenha dados ainda).

- [ ] **Step 4: Smoke test — Fluxo de analise**

Com um `projetoFaseId` real e `leadId` real do pipeline Saber:

```js
const job = await fetch('/api/tc/analisar', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projetoFaseId: 1, leadId: '26791207', fase: 'kickoff' })
}).then(r => r.json())
console.log('jobId', job.jobId)

// Poll:
setInterval(async () => {
  const j = await fetch(`/api/tc/job/${job.jobId}`, { credentials: 'include' }).then(r => r.json())
  console.log(j.status, j.progresso)
}, 3000)
```

Comportamento esperado:
- Status avanca: pending → processing → completed
- Progresso passa por cada step (fetching_kommo → extracting_content → ... → done)
- Linha nova em `tc_analises_ia`
- Linha nova em `tc_embeddings` com `referencia_tipo='analise_ia'`
- Nota nova no lead Kommo (conferir na UI Kommo)

- [ ] **Step 5: Smoke test — Deduplicacao**

Disparar a MESMA analise 2x em rapida sucessao. Segunda chamada deve retornar o mesmo `jobId` do primeiro (lock_key UNIQUE).

- [ ] **Step 6: Smoke test — Rate limit / 429**

Disparar 10+ analises em paralelo. Logs devem mostrar retry com backoff em `429`, sem erro estourando para o frontend. Jobs completam eventualmente.

- [ ] **Step 7: Smoke test — Permissoes**

- Usuario `operacao` sem entrada em `tc_usuario_clientes` → `/api/tc/matriz` retorna `clientes: []`
- Usuario `operacao` com atribuicao → retorna apenas seus clientes
- Usuario `admin` ou `board` → retorna todos
- Tab Colaboradores visivel apenas para admin/board

- [ ] **Step 8: Smoke test — UI Super Painel**

- Abrir Torre de Controle
- Toggle entre "Painel Geral" e "Matriz" funciona
- Clicar em um cliente na matriz abre `TcSuperPainel` fullscreen
- Timeline de fases clicavel — muda a analise exibida
- Botao "Re-analisar" dispara job, mostra `TcJobProgress`
- Botao "+ Kommo" em uma oportunidade abre `TcKommoLeadForm` em modal
- `Esc` fecha o super painel

- [ ] **Step 9: Smoke test — Cron semanal (dry run)**

```bash
node -e "
  import('./server/jobs/collaborator-analysis-cron.js').then(async m => {
    // forca run manual
    const mod = await import('./server/jobs/collaborator-analysis-cron.js')
    // se exportarmos runWeeklyAnalysis, chamar direto aqui
    console.log('ok')
  })
"
```

Ou aguardar dia/horario configurado e verificar inserts em `tc_analise_colaboradores`.

- [ ] **Step 10: Performance check**

Com 20 clientes carregados, medir:
- `/api/tc/matriz` < 500ms
- `/api/tc/painel-geral` < 1s
- `TcSuperPainel` abre em < 300ms (exclui chamada de IA)

Se lento, adicionar indices nas queries mais usadas (JOINs em `tc_analises_ia`, `tc_oportunidades`).

- [ ] **Step 11: Final commit + tag**

```bash
git status                        # deve estar limpo
git log --oneline -20              # verificar os 14 commits do super painel
git tag tc-super-painel-v1
git push origin feat --tags
```

- [ ] **Step 12: Deploy checklist**

- [ ] `.env` em producao com todas as vars preenchidas (Kommo token, OpenAI key, n8n webhook)
- [ ] Migration 004 executada contra o banco Easypanel
- [ ] `pgvector` extension habilitada no banco Easypanel
- [ ] Logs do Easypanel mostram `[worker] started` apos deploy
- [ ] Fumaca em producao — matriz carrega, abre super painel, dispara analise
- [ ] Analise em producao chega ate "completed" e nota aparece no Kommo

---

## Resumo Final

14 commits atomicos cobrindo:
1. Migration (novas 7 tabelas + pgvector)
2. Rate limiter generico
3. Kommo client
4. OpenAI client
5. RAG engine 3 camadas
6. Analyzer (orchestration kommo+n8n+rag+openai)
7. Job worker com Postgres queue
8. Rotas Express `/api/tc/*`
9. Integracao server + cron semanal
10. Composable frontend
11. Componentes utilitarios (progress, timeline, form kommo)
12. Super Painel fullscreen
13. Tab Visao Geral
14. Tabs Squads/Churn/Oportunidades + Colaboradores + Painel Geral hub
15. Integracao TorreDeControle/index.vue
16. Env vars

**Go-live:** apos Task 18 completo e smoke tests passando em staging.
