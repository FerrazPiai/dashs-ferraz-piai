---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 01
subsystem: infra
tags: [crypto, aes-256-gcm, oauth, postgres, migration, requirements, env-config]

# Dependency graph
requires:
  - phase: 02-torre-de-controle
    provides: tabela dashboards_hub.users, tabela dashboards_hub.tc_jobs
  - phase: 03-torre-de-controle-super-painel
    provides: schema base de tc_kommo_users (mapping Kommo <-> hub user)
provides:
  - utilitario AES-256-GCM (server/lib/crypto.js) para criptografar refresh tokens
  - schema google_oauth_tokens (one-to-one user -> refresh_token criptografado)
  - coluna tc_jobs.triggered_by_user_id (ownership do job para D-01/D-02)
  - requisitos canonicos EXT-01..EXT-06 em REQUIREMENTS.md
  - variaveis .env TOKEN_ENC_KEY, INTERNAL_EXTRACTORS, FIGMA_TOKEN, MIRO_TOKEN
affects:
  - 04-02 OAuth Google flow (usa server/lib/crypto.js + google_oauth_tokens)
  - 04-03 Extratores Google Slides/Docs (usa refresh_token do user)
  - 04-04 Extrator Figma/Miro interno (usa FIGMA_TOKEN/MIRO_TOKEN do env)
  - 04-05 Dispatch e feature-flag (usa INTERNAL_EXTRACTORS)
  - 04-06 Cutover n8n (checa EXT-06 como criterio de conclusao)
  - 04-07 Perfil + reauth UX (usa google_oauth_tokens)

# Tech tracking
tech-stack:
  added:
    - "node:crypto AES-256-GCM (nativo, sem dep externa)"
    - "Postgres TEXT[] para scopes em google_oauth_tokens"
  patterns:
    - "Crypto helper ESM puro sem estado interno (getKey a cada call)"
    - "Migration idempotente com IF NOT EXISTS + DO $$ block para alters condicionais"
    - "Feature-flag por plataforma via lista em env (INTERNAL_EXTRACTORS=...)"

key-files:
  created:
    - server/lib/crypto.js
    - migrations/016_google_oauth_tokens.sql
  modified:
    - .planning/REQUIREMENTS.md
    - .env.example

key-decisions:
  - "TOKEN_ENC_KEY 32 bytes base64 (AES-256-GCM) — chave em env, nao em DB"
  - "Formato cipher: base64(iv || tag || ciphertext), iv=12B, tag=16B"
  - "UNIQUE (user_id) em google_oauth_tokens — um refresh_token por gestor"
  - "tc_jobs.triggered_by_user_id nullable + ON DELETE SET NULL (preserva job auditavel)"
  - "Partial index em google_oauth_tokens.revoked_at WHERE NULL (cobre tokens ativos)"

patterns-established:
  - "Crypto helper: exportar encrypt(plaintext) e decrypt(cipherB64) + generateKey() auxiliar"
  - "Migration: SET search_path + CREATE TABLE IF NOT EXISTS + DO $$ block para alters de tabelas existentes"
  - "Requisitos numerados por fase (EXT-01..EXT-06) anexados ao fim de REQUIREMENTS.md"

requirements-completed:
  - EXT-01

# Metrics
duration: 8min
completed: 2026-04-20
---

# Phase 4 Plan 01: Fundacoes Crypto + Migration + Requirements + Env Summary

**Fundacoes da internalizacao: crypto AES-256-GCM, migration google_oauth_tokens + tc_jobs.triggered_by_user_id, registro canonico EXT-01..EXT-06 e 4 novas env vars**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-20T11:32:00Z
- **Completed:** 2026-04-20T11:40:03Z
- **Tasks:** 4
- **Files modified:** 4 (2 criados + 2 modificados via append)

## Accomplishments
- Utilitario `server/lib/crypto.js` com AES-256-GCM pronto para criptografar refresh tokens Google (IV 12B + tag 16B + ciphertext, tudo base64-packed)
- Migration `016_google_oauth_tokens.sql` criando a tabela nova (UNIQUE user_id, FK users ON DELETE CASCADE, partial index em revoked_at IS NULL) e adicionando `tc_jobs.triggered_by_user_id` nullable
- `REQUIREMENTS.md` agora documenta EXT-01..EXT-06 como requisitos canonicos da fase 4, linkando para `decisao-internalizacao-extracao-tc.md`
- `.env.example` lista as 4 variaveis novas (TOKEN_ENC_KEY, INTERNAL_EXTRACTORS, FIGMA_TOKEN, MIRO_TOKEN) sem mexer nas existentes

## Task Commits

Este plano usa commit atomico por plano (nao por task) porque todas as tasks sao independentes e pequenas (~50 linhas somadas). Todas as 4 tasks caem em um unico commit `feat(04-01)`:

1. **Task 1: server/lib/crypto.js (AES-256-GCM)** — crypto helper ESM puro
2. **Task 2: migrations/016_google_oauth_tokens.sql** — schema + alter tc_jobs
3. **Task 3: EXT-01..EXT-06 em REQUIREMENTS.md** — append apos rodape existente
4. **Task 4: .env.example** — append com bloco "Extrator Torre de Controle (fase 4)"

**Plan metadata + arquivos:** commit unico `feat(04-01): fundacoes crypto + migration + requirements + env`

## Files Created/Modified
- `server/lib/crypto.js` (novo) — encrypt/decrypt/generateKey usando `node:crypto`, AES-256-GCM, 12B IV e 16B tag
- `migrations/016_google_oauth_tokens.sql` (novo) — tabela `dashboards_hub.google_oauth_tokens` (one-to-one user -> refresh_token_enc) + `ALTER tc_jobs ADD COLUMN triggered_by_user_id` protegido por bloco `DO $$`
- `.planning/REQUIREMENTS.md` (modificado — append) — nova secao `## Extrator Torre de Controle (EXT)` com 6 requisitos canonicos
- `.env.example` (modificado — append) — bloco novo com TOKEN_ENC_KEY, INTERNAL_EXTRACTORS, FIGMA_TOKEN, MIRO_TOKEN

## Decisions Made
- **Formato do cipher base64(iv || tag || ciphertext)**: compactar IV+tag+ciphertext em um unico campo TEXT no DB para simplificar storage e decrypt (nao precisa de 3 colunas). IV aleatorio a cada chamada (nao reuse), garantindo confidencialidade mesmo com plaintexts iguais.
- **Partial index `WHERE revoked_at IS NULL`**: otimiza o caso comum (consultar tokens ativos) sem custo de indexar linhas revogadas.
- **`UNIQUE (user_id)` em vez de permitir multiplos registros**: um gestor tem uma conta Google conectada. Reconectar = UPDATE, nao INSERT novo.
- **`tc_jobs.triggered_by_user_id NULLABLE`**: compatibilidade com jobs legados ja persistidos (nao tem user_id) e com jobs futuros D-02 (scheduled detection de mudanca de fase no Kommo — fora de escopo desta fase).
- **`ON DELETE SET NULL` em tc_jobs.triggered_by_user_id**: preserva auditabilidade do job mesmo apos usuario ser deletado; fallback D-02 (Kommo-resp) ainda pode resolver ownership.

## Deviations from Plan

None - plano executado exatamente como escrito. Todos os blocos de codigo literais (crypto.js, SQL, markdown EXT, env block) foram copiados verbatim do PLAN.md.

## Issues Encountered
None.

## User Setup Required

**External services require manual configuration.** Apos merge e antes do plano 04-02:

- **Gerar TOKEN_ENC_KEY**: rodar `node -e "import('./server/lib/crypto.js').then(m=>console.log(m.generateKey()))"` e colar o output como valor de `TOKEN_ENC_KEY` no `.env` local e no Easypanel (producao).
- **Rodar migration 016**: `psql $DATABASE_URL -f migrations/016_google_oauth_tokens.sql` (ou pelo mecanismo de migration do projeto, se houver).
- **Verificar**: `SELECT * FROM dashboards_hub.google_oauth_tokens LIMIT 1` nao deve dar erro. `\d+ dashboards_hub.tc_jobs` deve mostrar a coluna `triggered_by_user_id`.
- **FIGMA_TOKEN / MIRO_TOKEN**: extrair dos nodes hardcoded no workflow n8n `uiUUXegcBHe3z2fg` durante o plano 04-04.
- **INTERNAL_EXTRACTORS**: deixar vazio ate o plano 04-05 estar pronto (feature-flag e rollout gradual).

## Next Phase Readiness
- **04-02 (OAuth flow)** pronto para consumir `server/lib/crypto.js#encrypt` ao persistir `refresh_token` na nova tabela e `decrypt` ao carregar para usar nas APIs Google.
- **04-03 (extratores Google Slides/Docs)** pronto para usar a tabela + dispatch por `triggered_by_user_id` com fallback Kommo-resp (D-02).
- **04-04 (extratores Figma/Miro)** pronto para usar `FIGMA_TOKEN`/`MIRO_TOKEN` direto de `process.env`.
- **04-05 (cutover)** pronto para usar `INTERNAL_EXTRACTORS` como feature-flag.

## Verification Output

Comandos do bloco `<verification>` do PLAN.md:

- `grep -c "aes-256-gcm\|createCipheriv\|createDecipheriv\|TOKEN_ENC_KEY" server/lib/crypto.js` → **8** (esperado >=4)
- `grep -c "CREATE TABLE IF NOT EXISTS google_oauth_tokens\|triggered_by_user_id\|refresh_token_enc" migrations/016_google_oauth_tokens.sql` → **6** (esperado >=3)
- `grep -c "^### EXT-0[1-6]" .planning/REQUIREMENTS.md` → **6** (esperado exatamente 6)
- `grep -c "TOKEN_ENC_KEY\|INTERNAL_EXTRACTORS\|FIGMA_TOKEN\|MIRO_TOKEN" .env.example` → **4** (esperado >=4)
- `grep -E "^SESSION_SECRET|^DATABASE_URL" .env.example` → ambas entradas pre-existentes preservadas
- `npm run build`: **skip** (nao afeta este plano — nenhum arquivo criado e importado pelo build atual; `server/lib/crypto.js` so e consumido a partir de 04-02)
- Manual `SELECT * FROM dashboards_hub.google_oauth_tokens`: **skip** (usuario roda apos setup da TOKEN_ENC_KEY)

## Acceptance Criteria Re-check

### Task 1 — server/lib/crypto.js
- [x] File exists
- [x] Contains `export function encrypt(`
- [x] Contains `export function decrypt(`
- [x] Contains `export function generateKey(`
- [x] Uses `aes-256-gcm` literal
- [x] Imports from `node:crypto`
- [x] Reads `process.env.TOKEN_ENC_KEY` e decodifica base64 para 32 bytes
- [x] IV 12 bytes e GCM tag 16 bytes

### Task 2 — migrations/016_google_oauth_tokens.sql
- [x] File exists
- [x] Contains `SET search_path TO dashboards_hub`
- [x] Contains `CREATE TABLE IF NOT EXISTS google_oauth_tokens`
- [x] Colunas: user_id, refresh_token_enc, access_token, expires_at, scopes, connected_at, last_used_at, revoked_at, error_message
- [x] `UNIQUE (user_id)`
- [x] `REFERENCES users(id) ON DELETE CASCADE`
- [x] `ALTER TABLE tc_jobs ADD COLUMN IF NOT EXISTS triggered_by_user_id`
- [x] Bloco `DO $$ ... END$$` para alter condicional

### Task 3 — REQUIREMENTS.md
- [x] Linha `^## Extrator Torre de Controle`
- [x] Linhas `^### EXT-01`..`^### EXT-06` (6 matches)
- [x] Secoes pre-existentes (VIS, TC, COMP, INFRA, FUT, Out of Scope, Traceability) preservadas (append apenas)

### Task 4 — .env.example
- [x] `TOKEN_ENC_KEY=`
- [x] `INTERNAL_EXTRACTORS=`
- [x] `FIGMA_TOKEN=`
- [x] `MIRO_TOKEN=`
- [x] `SESSION_SECRET` e `DATABASE_URL` pre-existentes preservados

## Self-Check: PASSED

Todos os 4 arquivos do plano existem em disco:
- `server/lib/crypto.js` ✓
- `migrations/016_google_oauth_tokens.sql` ✓
- `.planning/REQUIREMENTS.md` ✓ (modified)
- `.env.example` ✓ (modified)

Todos os criterios de aceite das 4 tasks foram verificados via grep. O commit hash sera preenchido apos a operacao `git commit`.

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
