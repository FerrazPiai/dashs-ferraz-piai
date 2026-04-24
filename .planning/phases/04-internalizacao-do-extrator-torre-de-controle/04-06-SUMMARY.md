---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 06
subsystem: frontend
tags: [vue, pinia, oauth, ui, block-on-trigger, reauth-banner]

requires:
  - phase: 04-02
    provides: /api/google/{status,connect-drive/start,disconnect}
  - phase: 04-05
    provides: erro_code=google_reauth_required em tc_analises_ia
provides:
  - client/stores/googleConnection.js (Pinia store)
  - client/components/ui/VGoogleConnectModal.vue (Block-on-trigger D-03)
  - client/components/ui/VGoogleReauthBanner.vue (fail-mark D-04)
  - client/dashboards/Admin/components/GoogleConnectionCard.vue (D-05)
  - client/dashboards/Admin/index.vue (aba "Minha conta")
  - client/dashboards/TorreDeControle/components/TcSuperPainel.vue (guard + banner)
  - server/routes/torre-controle.js (POST /analises/:id/retentar + triggeredByUserId)

key-decisions:
  - "Banner e modal integrados em TcSuperPainel.vue (nao TcAnaliseCard.vue — esse arquivo nao existe; o botao Analisar vive em TcSuperPainel)"
  - "POST /api/torre-controle/analises/:id/retentar adicionado (nao existia no codebase). Lookup de projeto_fase_id/fase_slug da analise original e re-enfileira analyze_phase com lockKey retry-{analiseId}"
  - "Guard D-03 so dispara para fases != projeto-concluido (fase final so consolida analises previas; nao le Google)"
  - "Rotas /analisar, /analisar-final, /analisar-massa agora passam triggeredByUserId=req.session.user.id ao enqueueJob"

requirements-completed:
  - EXT-01 (UI surface completa)

duration: ~30min
completed: 2026-04-20
build: "npm run build -> ok (✓ built in 2.45s) — googleConnection-DMVW7sP_.js bundled"
---

# Phase 4 Plan 06 — Frontend OAuth (Block-on-trigger + banner + admin card)

## Accomplishments
- Pinia store `googleConnection` com cache 30s em fetchStatus, startConnect (window.location redirect), disconnect
- `VGoogleConnectModal`: modal Block-on-trigger com lista de garantias, botao primario Conectar Google, backdrop blur
- `VGoogleReauthBanner`: banner inline vermelho (border-left #ef4444) com Reconectar + Retentar; reason=expired/revoked
- `GoogleConnectionCard`: card na aba Minha conta do /admin, mostra email/data/status/chips de escopo, botoes conditional-render (Conectar/Reconectar/Desconectar)
- `Admin/index.vue`: nova aba "Minha conta" (icone user), disponivel para todos os roles
- `TcSuperPainel.vue`: guard Google antes de analisarFase (fetchStatus force=true), banner reauth substitui banner incompleta quando erro_code=google_reauth_required
- `torre-controle.js`: POST /analises/:id/retentar + triggeredByUserId em todas as rotas de analise

## Files Created
- `client/stores/googleConnection.js` (~90 linhas)
- `client/components/ui/VGoogleConnectModal.vue` (~160 linhas)
- `client/components/ui/VGoogleReauthBanner.vue` (~140 linhas)
- `client/dashboards/Admin/components/GoogleConnectionCard.vue` (~260 linhas)

## Files Modified
- `client/dashboards/Admin/index.vue` (+6 linhas — aba + import + render)
- `client/dashboards/TorreDeControle/components/TcSuperPainel.vue` (+25 linhas — imports, refs, computed reauth, guard, banner no template, modal no root)
- `server/routes/torre-controle.js` (+35 linhas — rota retentar + triggeredByUserId x3)

## Deviations from Plan
- Task 6 referenciava `TcAnaliseCard.vue` (inexistente). Integracao feita em `TcSuperPainel.vue` — local onde o botao "Analisar agora" / "Analisar Consolidada" vive.
- Plan nao incluia criacao do endpoint `/analises/:id/retentar`, apenas assumia sua existencia. Criado neste plano com lookup de projeto_fase_id + fase_slug a partir de tc_analises_ia.

## Self-Check
- [x] Modal aparece quando /api/google/status retorna connected=false e user clica Analisar
- [x] Banner aparece em analise com erro_code=google_reauth_required
- [x] Card /admin mostra email, data, status, scope chips
- [x] Aba "Minha conta" visivel em Admin para todos os roles
- [x] Design tokens V4: accent #ff0000 (Conectar/Reconectar), destructive #ef4444 (Desconectar/banner border)
- [x] Build frontend passa (vite build)
- [x] node --check passa nos arquivos backend

## Next
04-07 (cutover): remover extractViaN8n, limpar .env.example, atualizar INTEGRATIONS.md, criar smoke script, arquivar workflow n8n uiUUXegcBHe3z2fg (passo manual).

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
