---
status: testing
phase: 04-internalizacao-do-extrator-torre-de-controle
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
  - 04-06-SUMMARY.md
  - 04-07-SUMMARY.md
started: 2026-04-20T00:00:00Z
updated: 2026-04-20T00:00:00Z
---

## Current Test

number: 2
name: Block-on-trigger modal (Torre de Controle)
expected: |
  Em /torre-de-controle, abrir um cliente no SuperPainel e clicar "Analisar agora" numa fase != projeto-concluido. Se NAO estiver conectado ao Google, um modal com titulo "Conectar conta Google" aparece com botao primario "Conectar Google" (vermelho) e secundario "Cancelar".
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Rode `npm run build` depois `npm start`. Server sobe sem erros, migrations 016 e 017 aplicam, e `GET /health` retorna `{ status: 'ok', ... }`.
result: pass
notes: "Server subiu em port 3001 (configurado .env). Migrations 016 e 017 aplicadas via `node scripts/apply-migration.js`. /health responde `{status:'ok', environment:'development'}`. DeprecationWarning do pg nao e blocker."

### 2. Block-on-trigger modal (Torre de Controle)
expected: Em `/torre-de-controle`, abrir um cliente no SuperPainel e clicar "Analisar agora" numa fase != projeto-concluido. Se NAO estiver conectado ao Google (ou `/api/google/status` retornar `connected=false` ou `scopes_ok=false`), um modal com titulo "Conectar conta Google" aparece com botao primario "Conectar Google" (vermelho #ff0000) e secundario "Cancelar". Clicar em "Conectar Google" redireciona para o consent do Google.
result: [pending]

### 3. OAuth callback resume flow
expected: Apos autorizar no consent do Google, voltar para a URL de origem com query `?google_oauth=connected`. Dashboard Torre de Controle fica acessivel e proximas tentativas de "Analisar agora" nao abrem o modal novamente.
result: [pending]

### 4. GET /api/google/status retorna shape correto
expected: `curl -b cookies.txt http://localhost:3000/api/google/status` retorna JSON com `{ connected: bool, email?, connected_at?, expires_at?, scopes_ok?, revoked_at? }`. Apos connect, `connected=true`, `email` preenchido, `scopes_ok=true`.
result: [pending]

### 5. Aba "Minha conta" no /admin
expected: Em `/admin`, uma nova aba "Minha conta" (icone user) aparece ao lado das outras. Ao clicar, mostra o card "Conexao Google" com: titulo, badge de status (verde "Ativo" se conectado), email, data da conexao, 3 chips de escopo (`drive.readonly`, `documents.readonly`, `presentations.readonly`) em verde. Se conectado: botao "Desconectar" (borda vermelha #ef4444). Se nao conectado: botao "Conectar Google" (vermelho #ff0000).
result: [pending]

### 6. Desconectar e revogar
expected: No card "Conexao Google" do /admin, clicar "Desconectar" -> window.confirm aparece; confirmar -> botao some, status flipa para "Nao conectado", botao "Conectar Google" aparece. No banco, `dashboards_hub.google_oauth_tokens.revoked_at` fica preenchido para o user atual.
result: [pending]

### 7. Banner de reauth em analise incompleta
expected: Criar cenario: desconectar Google, disparar "Analisar agora" (OU inserir row de teste em `tc_analises_ia` com `status_avaliacao='incompleta'` + `erro_code='google_reauth_required'`). No SuperPainel, dentro do body da fase, um banner horizontal com borda esquerda vermelha #ef4444 aparece: icone shield-alert, texto "Conexao Google expirou — reconecte para analisar.", botao "Reconectar" (#ff0000) e botao "Retentar analise".
result: [pending]

### 8. Retentar analise
expected: No banner de reauth (apos reconectar Google), clicar "Retentar analise" -> `POST /api/torre-controle/analises/:id/retentar` chamado -> retorna `{ jobId, status, reQueuedFor }`. Um novo job aparece em `dashboards_hub.tc_jobs` com `tipo=analyze_phase` e `triggered_by_user_id=<user atual>`.
result: [pending]

### 9. Smoke script — extratores internos
expected: Criar fixture `tests/fixtures/urls.json` com URLs reais de teste (Google Doc, Slides, Figma, Miro). Rodar `node scripts/smoke-extractors.js --platform all --user-id <seu_id> --urls tests/fixtures/urls.json`. Cada plataforma retorna OK com `texto_len > 0` e hash SHA-256 estavel em duas execucoes seguidas. Saidas em `scripts/smoke-output/`. Exit code 0.
result: [pending]

### 10. Miro cursor pagination (>50 itens)
expected: Rodar smoke contra board Miro com mais de 50 itens. `_meta.totalItens > 50` (nao para em 50). Em uma segunda corrida, `totalItens` identico (estavel).
result: [pending]

### 11. Legacy n8n removido
expected: `grep -rE "extractViaN8n|N8N_EXTRACT_WEBHOOK_URL|PLATFORM_TO_N8N" server/ client/` retorna 0 linhas. `.env.example` NAO contem `N8N_EXTRACT_WEBHOOK_URL`. Dashboard Torre de Controle ainda dispara analises e persiste resultados em `tc_analises_ia`.
result: [pending]

### 12. n8n workflow uiUUXegcBHe3z2fg arquivado
expected: No editor n8n (https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/), o workflow `# 6 - Auditoria Saber Extrator De Dados` aparece inativo (toggle Active off) e renomeado com prefixo `[ARQUIVADO Phase 04 — 2026-04-20]`. Nao foi deletado.
result: [pending]

## Summary

total: 12
passed: 1
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
