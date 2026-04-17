# Torre de Controle — Sistema de Sync Kommo (DB-first)

> **Goal:** DB vira source of truth. Usuario ao abrir ja ve os dados do DB (instantaneo). Kommo so e chamado em duas situacoes: botao "Atualizar" manual OU cron agendado. Lock evita sync duplicado.

**Approval gate:** implementar sem commitar; build + smoke; hand-off.

---

## Task 1 — Migration 007 (companies + sync state)

**Files:** `migrations/007_tc_kommo_sync.sql`

```sql
-- Tabela de companies (1 company = N leads no pipeline Saber)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_companies (
  id              BIGINT PRIMARY KEY,          -- kommo company id
  name            VARCHAR(255) NOT NULL,
  responsible_user_id BIGINT,
  custom_fields   JSONB DEFAULT '[]',
  raw             JSONB,                        -- payload cru do Kommo
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de leads (1 row por lead do pipeline Saber)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_leads (
  id              BIGINT PRIMARY KEY,          -- kommo lead id
  company_id      BIGINT REFERENCES dashboards_hub.tc_kommo_companies(id) ON DELETE SET NULL,
  pipeline_id     BIGINT NOT NULL,
  status_id       BIGINT NOT NULL,
  name            VARCHAR(500),
  price           NUMERIC(14,2),
  responsible_user_id BIGINT,
  custom_fields   JSONB DEFAULT '[]',
  raw             JSONB,
  removed_from_kommo BOOLEAN DEFAULT false,    -- soft-delete quando sumir do Kommo
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_status ON dashboards_hub.tc_kommo_leads(status_id);
CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_company ON dashboards_hub.tc_kommo_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_tc_kommo_leads_pipeline ON dashboards_hub.tc_kommo_leads(pipeline_id);

-- Tabela de usuarios Kommo (accounts)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_kommo_users (
  id              BIGINT PRIMARY KEY,
  name            VARCHAR(255),
  email           VARCHAR(255),
  raw             JSONB,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Estado da ultima sincronizacao (1 linha unica, id=1)
CREATE TABLE IF NOT EXISTS dashboards_hub.tc_sync_state (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  ultima_sync_iniciada TIMESTAMPTZ,
  ultima_sync_concluida TIMESTAMPTZ,
  ultima_sync_erro    TEXT,
  leads_total         INTEGER DEFAULT 0,
  leads_novos         INTEGER DEFAULT 0,
  leads_atualizados   INTEGER DEFAULT 0,
  companies_total     INTEGER DEFAULT 0,
  duracao_ms          INTEGER,
  locked_by_job_id    INTEGER,
  CHECK (id = 1)
);
INSERT INTO dashboards_hub.tc_sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;
```

**Step:** aplicar via `node ... migrations/007`. Sem commit.

---

## Task 2 — Servico kommo-sync.js (lock + upsert)

**Files:** `server/services/kommo-sync.js` (novo)

```js
import pool from '../lib/db.js'
import { getLeadsSaberCompleto, getKommoUsers, getCompaniesByIds, PIPELINE_SABER } from './kommo-client.js'

const LOCK_TTL_MS = 10 * 60 * 1000 // 10min (igual outros dashboards)

async function adquirirLock() {
  const { rows } = await pool.query(`
    UPDATE dashboards_hub.tc_sync_state
    SET ultima_sync_iniciada = NOW(), ultima_sync_erro = NULL
    WHERE id = 1
      AND (ultima_sync_iniciada IS NULL
           OR ultima_sync_concluida >= ultima_sync_iniciada
           OR ultima_sync_iniciada < NOW() - ($1 || ' milliseconds')::interval)
    RETURNING id
  `, [String(LOCK_TTL_MS)])
  return rows.length > 0
}

async function liberarLock(stats, erro) {
  await pool.query(`
    UPDATE dashboards_hub.tc_sync_state SET
      ultima_sync_concluida = NOW(),
      ultima_sync_erro = $1,
      leads_total = $2, leads_novos = $3, leads_atualizados = $4,
      companies_total = $5, duracao_ms = $6
    WHERE id = 1
  `, [erro || null, stats.total || 0, stats.novos || 0, stats.atualizados || 0, stats.companies || 0, stats.duracao || 0])
}

export async function isSyncEmAndamento() {
  const { rows: [s] } = await pool.query(`SELECT * FROM dashboards_hub.tc_sync_state WHERE id = 1`)
  if (!s || !s.ultima_sync_iniciada) return { ativo: false, estado: s }
  const iniciada = new Date(s.ultima_sync_iniciada).getTime()
  const concluida = s.ultima_sync_concluida ? new Date(s.ultima_sync_concluida).getTime() : 0
  if (concluida >= iniciada) return { ativo: false, estado: s }
  const expirou = Date.now() - iniciada > LOCK_TTL_MS
  return { ativo: !expirou, estado: s }
}

export async function rodarSync({ force = false } = {}) {
  if (!force) {
    const { ativo } = await isSyncEmAndamento()
    if (ativo) throw new Error('sync ja em andamento')
  }
  if (!(await adquirirLock())) throw new Error('nao foi possivel adquirir lock')

  const t0 = Date.now()
  const stats = { novos: 0, atualizados: 0, companies: 0, total: 0 }
  try {
    const [leads, users] = await Promise.all([
      getLeadsSaberCompleto(),
      getKommoUsers()
    ])
    const companyIds = [...new Set(leads.map(l => l._embedded?.companies?.[0]?.id).filter(Boolean))]
    const companies = await getCompaniesByIds(companyIds)
    stats.companies = companies.length
    stats.total = leads.length

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Users (accounts)
      for (const u of users) {
        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_users (id, name, email, raw, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, raw = EXCLUDED.raw, updated_at = NOW()
        `, [u.id, u.name, u.email, JSON.stringify(u)])
      }

      // Companies
      for (const c of companies) {
        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_companies (id, name, responsible_user_id, custom_fields, raw, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            responsible_user_id = EXCLUDED.responsible_user_id,
            custom_fields = EXCLUDED.custom_fields,
            raw = EXCLUDED.raw,
            updated_at = NOW()
        `, [c.id, c.name, c.responsible_user_id || null, JSON.stringify(c.custom_fields_values || []), JSON.stringify(c)])
      }

      // Leads — conta novos vs atualizados
      for (const l of leads) {
        const companyId = l._embedded?.companies?.[0]?.id || null
        const { rows: existing } = await client.query(`SELECT id FROM dashboards_hub.tc_kommo_leads WHERE id = $1`, [l.id])
        const isNovo = existing.length === 0

        await client.query(`
          INSERT INTO dashboards_hub.tc_kommo_leads
            (id, company_id, pipeline_id, status_id, name, price, responsible_user_id, custom_fields, raw, removed_from_kommo, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
          ON CONFLICT (id) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            status_id = EXCLUDED.status_id,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            responsible_user_id = EXCLUDED.responsible_user_id,
            custom_fields = EXCLUDED.custom_fields,
            raw = EXCLUDED.raw,
            removed_from_kommo = false,
            updated_at = NOW()
        `, [l.id, companyId, l.pipeline_id || PIPELINE_SABER, l.status_id, l.name, l.price, l.responsible_user_id || null,
            JSON.stringify(l.custom_fields_values || []), JSON.stringify(l)])

        if (isNovo) stats.novos++
        else stats.atualizados++
      }

      // Marca leads sumidos do Kommo como removed (soft delete) — opcional
      const idsAtuais = leads.map(l => l.id)
      if (idsAtuais.length > 0) {
        await client.query(`
          UPDATE dashboards_hub.tc_kommo_leads SET removed_from_kommo = true
          WHERE pipeline_id = $1 AND id <> ALL($2) AND removed_from_kommo = false
        `, [PIPELINE_SABER, idsAtuais])
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    stats.duracao = Date.now() - t0
    await liberarLock(stats, null)
    return stats
  } catch (err) {
    stats.duracao = Date.now() - t0
    await liberarLock(stats, err.message)
    throw err
  }
}

// Cron: chama a cada N minutos (default 60)
export function startSyncCron() {
  const minutos = parseInt(process.env.TC_SYNC_CRON_MINUTES || '60', 10)
  if (minutos <= 0) return
  console.log(`[${new Date().toISOString()}] [kommo-sync] cron ativo: cada ${minutos}min`)
  setInterval(async () => {
    try {
      const stats = await rodarSync()
      console.log(`[${new Date().toISOString()}] [kommo-sync] auto-sync ok:`, stats)
    } catch (err) {
      if (err.message !== 'sync ja em andamento') {
        console.error(`[${new Date().toISOString()}] [kommo-sync] auto-sync falhou:`, err.message)
      }
    }
  }, minutos * 60 * 1000)
}
```

---

## Task 3 — Rotas: refatorar `/matriz` para ler do DB + novas `/atualizar` e `/status-atualizacao`

**Files:** `server/routes/torre-controle.js`

1. **GET `/status-atualizacao`** — retorna `{ ativo, ultima_sync_iniciada, ultima_sync_concluida, stats }`
2. **POST `/atualizar`** — `rodarSync({ force: req.body?.force })` em background (fire-and-forget com promise nao awaited), retorna `{ iniciado: true }`
3. **Refatorar `/matriz`**:
   - Remove chamada a `getLeadsSaberCompleto` e `getCompaniesByIds` direto
   - Query composta: `tc_kommo_leads JOIN tc_kommo_companies JOIN tc_kommo_users` filtrando `pipeline_id = PIPELINE_SABER AND removed_from_kommo = false AND status_id != 143 AND status_id NOT IN STAGE_PRE_PROJETO`
   - Extrai `name` da company, custom fields do lead, account via join de users
4. **`/cliente/:id/fase/:faseId`** e `/colaboradores` tambem leem do DB (nao mais do cache em memoria)
5. **Remover** arquivo `kommo-cache.js` (nao mais necessario) — OU manter e popular no sync para compat

---

## Task 4 — Sync inicial + integrar em `server/index.js`

**Files:** `server/index.js`

```js
import { startSyncCron, rodarSync } from './services/kommo-sync.js'

app.listen(PORT, async () => {
  // ... logs existentes
  startJobWorker()
  startCollaboratorCron()
  startSyncCron() // <- novo

  // Sync inicial se o DB estiver vazio
  const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*) FROM dashboards_hub.tc_kommo_leads`)
  if (parseInt(count, 10) === 0) {
    console.log('[kommo-sync] DB vazio — rodando sync inicial em background')
    rodarSync().catch(err => console.error('[kommo-sync] sync inicial falhou:', err.message))
  }
})
```

---

## Task 5 — Frontend: botao Atualizar com lock state

**Files:** `client/dashboards/TorreDeControle/composables/useTorreControle.js`, `index.vue`

1. **Composable**:
   - `syncStatus` (shallowRef): `{ ativo, ultima_sync_concluida, stats, erro }`
   - `carregarStatusSync()`: GET `/api/tc/status-atualizacao`
   - `dispararAtualizacao()`: POST `/api/tc/atualizar`, depois polling a cada 5s ate `ativo=false`

2. **index.vue header**:
   - Substituir o `VRefreshButton @click="handleRefresh"` por:
     ```html
     <button class="btn" :disabled="syncAtivo" @click="atualizar">
       <span v-if="syncAtivo">Atualizando... ({{ syncProgress }})</span>
       <span v-else>Atualizar Kommo</span>
     </button>
     <span class="sync-info">Ultima: {{ formatSync }}</span>
     ```
   - Ao terminar o sync, auto-chamar `carregarMatriz()`

---

## Task 6 — Env vars + build + smoke

**Files:** `.env.example`

```
TC_SYNC_CRON_MINUTES=60
```

- `npm run build` deve passar
- Aplicar migration 007 manualmente ou via script node
- Smoke: `POST /api/tc/atualizar` → acompanhar `GET /api/tc/status-atualizacao` ate concluir → `GET /api/tc/matriz` retorna dados do DB
- Testar botao "Atualizar" no frontend — esperado: disabled enquanto sync roda, re-habilita ao concluir

---

## Fluxo final

| Momento | O que acontece |
|---------|---------------|
| Usuario abre /torre-de-controle | Frontend chama `/api/tc/matriz` → **le do DB** (ms, sem Kommo) |
| Usuario clica "Atualizar Kommo" | Frontend chama `POST /atualizar`, botao fica disabled, polling `/status-atualizacao` a cada 5s |
| Sync roda | Kommo GET leads+companies+users → upsert DB em transaction → atualiza `tc_sync_state` |
| Sync concluido | Frontend re-chama `/matriz`, atualiza tela, libera botao, mostra "Ultima: ha 2s" |
| Cron 1h/1x | Mesmo fluxo automatico, sem intervencao do user. Se sync manual esta ativo, skipa |
| Sync inicial (DB vazio) | Dispara automaticamente ao subir o servidor |
| Lock stuck >10min | Proxima tentativa considera expirado e re-adquire |

**Benefícios:**
- Load instantaneo (zero latencia Kommo por padrao)
- Rate-limit friendly (Kommo chamado 1x por hora default)
- Resiliente: se Kommo cai, app continua servindo dados cached
- Auditavel: `tc_sync_state` mostra ultima sync, duracao, erro
