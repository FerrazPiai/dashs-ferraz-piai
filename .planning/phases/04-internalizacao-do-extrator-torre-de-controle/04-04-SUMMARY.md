---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 04
subsystem: extractors
tags: [figma, miro, openai, gpt-4o, gpt-4.1, cursor-pagination]

requires:
  - phase: 04-01
    provides: rate-limiter, env patterns
provides:
  - server/services/extractors/figma.js (extractFigma + vision + narrativa)
  - server/services/extractors/miro.js (extractMiro + cursor pagination)
affects: [04-05]

tech-stack:
  added: []
  patterns:
    - "Cursor-based pagination obrigatoria para Miro /v2/boards/{id}/items"
    - "Tokens centralizados em .env (FIGMA_TOKEN, MIRO_TOKEN), nao hardcoded"
    - "Rate-limit vision Figma (mesmo createRateLimiter de google-slides)"

key-files:
  created:
    - server/services/extractors/figma.js
    - server/services/extractors/miro.js
  modified: []

key-decisions:
  - "figma.js exporta paginas (document.children do tipo CANVAS) como PNG unico batch — mesma estrategia do node Figma -> Get multiple figmas do workflow"
  - "miro.js ordena itens por (y,x) para leitura natural top->bottom/left->right antes de serializar texto"
  - "miro.js suporta connector.captions (conexoes com texto) alem de sticky/text/shape/card/frame/image"

patterns-established:
  - "Validate token presence first; lance Error claro (FIGMA_TOKEN/MIRO_TOKEN nao configurado)"
  - "do { ... } while (cursor) obrigatorio em APIs paginadas do Miro"

requirements-completed:
  - EXT-04
  - EXT-05

duration: ~10min (parte implementada por agent anterior, parte inline)
completed: 2026-04-20
---

# Phase 4 Plan 04 — Figma + Miro extractors

## Accomplishments
- `figma.js` (commitado anteriormente em eba81e2): extractFigma(url) com regex multi-shape (/file|/design|/proto|/slides|/deck), GET /v1/files, GET /v1/images PNG batch, vision GPT-4o detail=high por pagina, narrativa final gpt-4.1, FIGMA_TOKEN centralizado
- `miro.js` (commit c4c3699): extractMiro(url) com **cursor pagination corrigida** (bug: workflow n8n atual so le primeira pagina de 50 itens), ordena por posicao espacial, handles 7 tipos de item, MIRO_TOKEN centralizado

## Files Created
- `server/services/extractors/figma.js` (~190 linhas, commit eba81e2)
- `server/services/extractors/miro.js` (~110 linhas, commit c4c3699)

## Critical Bug Fix
**Workflow n8n atual:** le apenas pagina 1 de `/v2/boards/{id}/items?limit=50`. Boards >50 itens perdem dados.
**Agora:** `do { fetch(...); cursor = page.cursor } while (cursor)` — garante leitura completa.

## Self-Check
- [x] extractFigma usa FIGMA_TOKEN + X-Figma-Token header
- [x] extractFigma chama /v1/files e /v1/images
- [x] extractFigma importa VISION_IMAGE_PROMPT de ./openai-prompts.js
- [x] extractMiro usa MIRO_TOKEN + Bearer
- [x] extractMiro tem `do { ... } while (cursor)` loop
- [x] extractMiro passa limit=50 + cursor query params
- [x] extractMiro handles sticky_note/text/shape/card/frame/image/connector
- [x] Retorno shape { texto, imagens, erros, _meta }
- [x] node --check passa
- [x] Commit atomico miro: c4c3699

## Next
04-05 (dispatcher) consome os 4 extratores (figma + miro + google-docs + google-slides).

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
