---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 05
subsystem: integration
tags: [dispatcher, feature-flag, oauth-reauth, job-worker, kommo-fallback]

requires:
  - phase: 04-03
    provides: google-docs, google-slides, openai-prompts
  - phase: 04-04
    provides: figma, miro
provides:
  - server/services/extractors/index.js (dispatchExtractor + feature flag)
  - tc-analyzer.js (integracao + GoogleReauthRequiredError fail-mark)
  - tc-job-worker.js (propagacao userId + fallback Kommo)
  - migrations/017_tc_analise_erro_code.sql (erro_code + erro_mensagem)
affects: [04-06]

key-decisions:
  - "Fallback Kommo: users.kommo_user_id = tc_leads.responsible_user_id (sem JOIN via tc_kommo_users — coluna users.kommo_user_id ja guarda o id Kommo)"
  - "Fail-mark: persistencia dedicada em tc_analises_ia antes de chamar analyzeText — nao gera custo OpenAI quando Google expirou"
  - "Feature flag INTERNAL_EXTRACTORS aceita csv + 'all' sentinel + chave de grupo (google/figma/miro) e nome especifico da plataforma"
  - "extractViaN8n preservado ate cutover em 04-07"

requirements-completed:
  - EXT-01
  - EXT-06

duration: ~30min
completed: 2026-04-20
---

# Phase 4 Plan 05 — Dispatcher + integracao tc-analyzer/worker

## Accomplishments
- `server/services/extractors/index.js` (65 linhas): dispatchExtractor, isPlatformInternal, getEnabledPlatforms — fallbackN8n injetado pelo caller
- `server/services/tc-analyzer.js`: getOrExtract aceita opts.userId, runAnalysis aceita userId, fail-mark mid-loop com GoogleReauthRequiredError => status_avaliacao=incompleta + erro_code=google_reauth_required
- `server/services/tc-job-worker.js`: resolveOwnershipUserId (trigger_owner -> Kommo fallback -> missing), falha limpa se sem user_id, log [TC-WORKER] job X ownership=source, enqueueJob({ triggeredByUserId })
- `migrations/017_tc_analise_erro_code.sql`: adiciona erro_code + erro_mensagem em tc_analises_ia

## Files Created/Modified
- `migrations/017_tc_analise_erro_code.sql` (12 linhas, commit bea02a0)
- `server/services/extractors/index.js` (65 linhas, commit 57d31e3)
- `server/services/tc-analyzer.js` (+142 linhas liquidas, commit 378f300)
- `server/services/tc-job-worker.js` (+39 linhas liquidas, commit 1292c6a)

## Self-Check
- [x] dispatchExtractor roteia por INTERNAL_EXTRACTORS csv
- [x] Fallback n8n quando plataforma nao esta no flag (extractViaN8n preservado)
- [x] runAnalysis aceita/propaga userId
- [x] GoogleReauthRequiredError capturado -> status_avaliacao=incompleta + erro_code=google_reauth_required
- [x] tc-job-worker resolve ownership: trigger -> kommo -> falha
- [x] node --check passa em todos os arquivos
- [x] grep counts: tc-analyzer 13, dispatcher 14, worker 19

## Deviations
- Plan sugeria JOIN com tc_kommo_users; usamos `users.kommo_user_id = tc_leads.responsible_user_id` direto (mais simples, mesmo resultado — tc_kommo_users.id e o proprio id Kommo)
- Adicionei enqueueJob({ triggeredByUserId }) parametro (nao no plano) para permitir que rotas HTTP autenticadas passem req.session.user.id explicitamente; rota POST em torre-controle.js sera atualizada quando consumir

## Next
04-06 (UI): modal Block-on-trigger, banner reauth e card admin dependem de:
- GET /api/google/status (ja existe)
- erro_code=google_reauth_required em tc_analises_ia (agora existe)
- runAnalysis retorna { status: 'incompleta', erro_code } (agora existe)

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
