---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 02
subsystem: auth
tags: [oauth2, google, express, pg, aes-256-gcm, session]

requires:
  - phase: 04-01
    provides: crypto util (encrypt/decrypt), google_oauth_tokens schema
provides:
  - POST /api/google/connect-drive/start (modal Block-on-trigger)
  - GET /api/google/connect-drive/callback (CSRF state + open-redirect safe + exchange code -> tokens)
  - GET /api/google/status
  - POST /api/google/disconnect
  - server/services/google-oauth.js (storeTokens/getAccessToken/getStatus/revokeTokens + GoogleReauthRequiredError)
affects: [04-03, 04-05, 04-06]

tech-stack:
  added: []
  patterns:
    - OAuth2 secondary flow independente do login (flow per-scope-set)
    - Cache in-memory de access_token com TTL baseado em expires_at
    - Error tipado para reauth (GoogleReauthRequiredError com code google_reauth_required)

key-files:
  created:
    - server/services/google-oauth.js
    - server/routes/google.js
  modified:
    - server/index.js

key-decisions:
  - "prompt=consent forcado no /start para garantir refresh_token na primeira vez"
  - "Callback dedicado (GOOGLE_DRIVE_CALLBACK_URL ou derivado de GOOGLE_CALLBACK_URL) — nao reusar rota /api/auth/google/callback para evitar contaminar o login"
  - "State CSRF gerado com randomBytes(16).hex, validado e descartado no callback"
  - "resume_url sanitizado (so aceita paths relativos seguros) — previne open-redirect (T-04-02-03)"
  - "revokeTokens chama Google revoke endpoint com timeout 10s e sempre marca revoked_at localmente, mesmo se remoto falhar"

patterns-established:
  - "Rotas OAuth secundarias: sempre isSafeResumeUrl + state CSRF + session.save antes de redirecionar"
  - "Servicos que guardam credenciais: encrypt at rest + CACHE em memoria com margem de 60s pre-expiracao"

requirements-completed:
  - EXT-01

duration: ~25min
completed: 2026-04-20
---

# Phase 4 Plan 02: OAuth Google Drive per-user Summary

**OAuth 2.0 per-user para leitura Drive/Docs/Slides sem quebrar login existente; tokens encriptados em DB com reauth tipado**

## Performance

- **Duration:** ~25 min (inclui recover de stream timeout do primeiro subagent)
- **Tasks:** 3
- **Files modified:** 3 (2 criados, 1 editado)

## Accomplishments
- `server/services/google-oauth.js`: API de gestao de tokens (storeTokens/getAccessToken/getStatus/revokeTokens) com cache in-memory + refresh automatico via refresh_token encriptado (AES-256-GCM vindo de 04-01)
- `server/routes/google.js`: 4 endpoints (connect-drive/start, connect-drive/callback, status, disconnect) protegidos por requireAuth, com CSRF state e protecao contra open-redirect
- `server/index.js`: `app.use('/api/google', googleRouter)` registrado apos os outros routers autenticados

## Files Created/Modified
- `server/services/google-oauth.js` (criado, 160 linhas) — servico de gestao de tokens Google per-user + GoogleReauthRequiredError
- `server/routes/google.js` (criado, 165 linhas) — endpoints OAuth secundarios
- `server/index.js` (editado, +2 linhas) — import + mount em /api/google

## Decisions Made
- **Callback URL derivada** (`GOOGLE_DRIVE_CALLBACK_URL` com fallback `${GOOGLE_CALLBACK_URL}` tendo `/google/callback` trocado por `/google/connect-drive/callback`). Mantem compatibilidade com setup atual sem exigir env var nova para dev.
- **isSafeResumeUrl** valida: comeca com `/`, nao `//`, nao contem `://`, nao `/\\`. Paths relativos apenas — mitigacao de T-04-02-03 (open redirect).
- **store email opcional**: `storeTokens` tenta gravar google_email no users se a coluna existir (try/catch silencioso para nao quebrar antes de schema migrar).

## Deviations from Plan

Nenhum desvio substantivo. Ajustes:
- Plan Task 2 spec nao exigia `include_granted_scopes=true`; incluido para paridade com Google OAuth best practice (permite Google incrementar escopos sem re-pedir consent repetido).
- Plan Task 2 pedia que o callback retornasse `google_oauth_error=1` em caso de erro; implementacao emite sub-tipos (`=denied`, `=state`, `=token`, `=no_refresh_token`, `=server`) para facilitar debug — superset compativel com o que o frontend precisa ler (04-06 usara apenas a presenca do param).

**Total deviations:** 0 correctivos, 2 ajustes de superset (compativeis com frontend).
**Impact on plan:** Nenhum — superset das garantias do plano.

## Issues Encountered
- Primeiro spawn do gsd-executor agent atingiu stream idle timeout apos ~5 min sem criar arquivos (deviacao de runtime, nao do plano). Recover feito inline com leitura previa de `server/routes/auth.js`, `server/middleware/requireAuth.js` e `server/index.js` para respeitar convencoes do codebase.

## Self-Check: PASSED

### Task 1 — server/services/google-oauth.js
- [x] exists
- [x] exporta storeTokens, getAccessToken, getStatus, revokeTokens
- [x] exporta class GoogleReauthRequiredError com code='google_reauth_required'
- [x] importa encrypt/decrypt de `../lib/crypto.js`
- [x] contem 3 scopes: drive.readonly, documents.readonly, presentations.readonly
- [x] ON CONFLICT (user_id) DO UPDATE
- [x] cache Map in-memory para access_token
- [x] chama oauth2.googleapis.com/token e oauth2.googleapis.com/revoke

### Task 2 — server/routes/google.js
- [x] exists
- [x] importa requireAuth de `../middleware/requireAuth.js`
- [x] POST /connect-drive/start com state em sessao + authorize_url no response
- [x] GET /connect-drive/callback chama storeTokens
- [x] GET /status chama getStatus(req.session.user.id)
- [x] POST /disconnect chama revokeTokens
- [x] authorize_url contem os 3 scopes
- [x] authorize_url contem access_type=offline e prompt=consent
- [x] req.session.save(...) antes de cada redirect no callback

### Task 3 — server/index.js
- [x] import googleRouter from './routes/google.js'
- [x] app.use('/api/google', googleRouter)
- [x] rotas existentes (auth, api, admin, admin/alertas, tc) inalteradas

## Next Phase Readiness
- Contract pronto para 04-06 (frontend Block-on-trigger modal + admin card)
- `getAccessToken(userId)` pronto para 04-03 (Google Docs/Slides extractors) consumir
- `GoogleReauthRequiredError` pronto para 04-05 capturar em `runAnalysis` e fail-mark o job
- **Blocker para user (fora do plano):** configurar `GOOGLE_DRIVE_CALLBACK_URL` no `.env` + no Google Cloud Console (Authorized redirect URIs). Ou usar fallback automatico derivando de `GOOGLE_CALLBACK_URL`.

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
