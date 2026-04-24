---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 07
subsystem: cutover
tags: [cutover, cleanup, smoke-test, docs]

requires:
  - phase: 04-03
  - phase: 04-04
  - phase: 04-05
  - phase: 04-06
provides:
  - tc-analyzer.js limpo (sem extractViaN8n/N8N_URL/PLATFORM_TO_N8N/n8nLimiter)
  - .env.example alinhado pos-cutover
  - INTEGRATIONS.md atualizado (Phase 04 section + removidos)
  - scripts/smoke-extractors.js (parity check contra URLs de staging)
  - .gitignore: scripts/smoke-output/

requirements-completed:
  - EXT-06

duration: ~15min
completed: 2026-04-20
build: "npm run build -> ok (built in 2.72s)"
pending-user-action:
  - "Arquivar workflow n8n uiUUXegcBHe3z2fg no editor n8n (Task 5 manual)"
---

# Phase 4 Plan 07 — Cutover + limpeza

## Accomplishments
- **tc-analyzer.js**: removidos `N8N_URL`, `n8nLimiter`, `PLATFORM_TO_N8N`, `extractViaN8n`, comentario do typo `plataform`. Import de `createRateLimiter/withRetry` removido (nao mais usado). Chamada a `dispatchExtractor` perdeu o param `fallbackN8n`.
- **.env.example**: removidos `N8N_EXTRACT_WEBHOOK_URL` e `N8N_MAX_CONCURRENT`. `INTERNAL_EXTRACTORS` default=all. Adicionados `GOOGLE_DRIVE_CALLBACK_URL`, `VISION_MAX_CONCURRENT=3`, `VISION_MAX_RPM=60`.
- **INTEGRATIONS.md**: nova secao "Phase 04 — Internalizacao do Extrator Torre de Controle" com 7 integracoes ativas (Google OAuth, Docs, Slides, Figma, Miro, OpenAI vision, OpenAI narrativa), secao "Removido" com workflow arquivado, contrato do dispatcher e regras de ownership (D-01/D-02).
- **scripts/smoke-extractors.js**: CLI Node ESM com `--platform`, `--user-id`, `--urls`. Roda dispatchExtractor por plataforma, mede tempo/tamanho/erros, gera hash SHA-256 truncado, salva em `scripts/smoke-output/<timestamp>-<platform>.json`. Skip Google sem userId. Exit 0/1 conforme falhas.
- **.gitignore**: `scripts/smoke-output/` adicionado.

## Files Modified
- `server/services/tc-analyzer.js` (−51 linhas liquidas: removidos N8N helpers, imports rate-limiter, fallbackN8n)
- `.env.example` (−3 linhas + 6 linhas adicionadas)
- `.planning/codebase/INTEGRATIONS.md` (+52 linhas nova secao Phase 04)
- `.gitignore` (+3 linhas)

## Files Created
- `scripts/smoke-extractors.js` (~120 linhas)

## Self-Check
- [x] `grep -rE 'extractViaN8n|N8N_EXTRACT_WEBHOOK_URL|PLATFORM_TO_N8N' server/ client/` retorna 0
- [x] `grep -cE 'N8N_EXTRACT_WEBHOOK_URL|N8N_MAX_CONCURRENT' .env.example` retorna 0
- [x] `grep -cE 'Google Docs API|Google Slides API|Figma REST|Miro REST|cursor pagination|uiUUXegcBHe3z2fg' INTEGRATIONS.md` = 6
- [x] `node --check` passa em todos os arquivos editados
- [x] `npm run build` passa (frontend + backend)
- [x] `node --check scripts/smoke-extractors.js` OK

## PENDING — Task 5 (manual, nao-autonoma)

**Passo manual requerido do user** (fora do scope autonomo GSD):

1. Abrir editor n8n: https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/
2. Localizar workflow `# 6 - Auditoria Saber Extrator De Dados` (ID `uiUUXegcBHe3z2fg`).
3. Desativar (toggle "Active" off).
4. Renomear para `[ARQUIVADO Phase 04 — 2026-04-20] # 6 - Auditoria Saber Extrator De Dados`.
5. Mover para folder/tag `arquivados` (se existir).
6. **NAO deletar** — manter como referencia historica dos prompts e do fluxo.
7. Smoke manual no dashboard Torre de Controle: disparar analise em lead com material Google + Figma/Miro, validar que gera insights sem cair no fallback (que nao existe mais — se plataforma nao coberta, dispatcher lanca).

> **Atualizar este SUMMARY** com data de arquivamento e operador apos execucao manual.
>
> **Placeholder:** arquivado em `____-__-__` por `____________`.

## Deviations from Plan
- Nenhum desvio tecnico. Task 5 permanece pendente (natureza manual do plano — autonomous: false).

## Phase 4 Completion

Com 04-07, a Phase 04 (Internalizacao do Extrator Torre de Controle) esta **tecnicamente concluida no codebase**. Success Criteria 7 do ROADMAP cumprido apos Task 5 manual.

Proximo passo recomendado: rodar `/gsd-verify` para validacao goal-backward da fase.

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed (code): 2026-04-20*
*Completed (n8n archive): PENDING*
