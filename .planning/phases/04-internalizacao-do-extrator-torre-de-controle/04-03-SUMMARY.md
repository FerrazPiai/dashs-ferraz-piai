---
phase: 04-internalizacao-do-extrator-torre-de-controle
plan: 03
subsystem: extractors
tags: [google-docs, google-slides, openai, gpt-4o, gpt-4.1, vision, oauth]

requires:
  - phase: 04-02
    provides: getAccessToken(userId), GoogleReauthRequiredError
provides:
  - server/services/extractors/openai-prompts.js (VISION_IMAGE_PROMPT, AUDITORIA_NARRATIVA_PROMPT, MIRO_AUDIT_PROMPT, MIRO_VISION_PROMPT)
  - server/services/extractors/google-docs.js (extractGoogleDoc)
  - server/services/extractors/google-slides.js (extractGoogleSlides + vision)
affects: [04-05]

tech-stack:
  added: []
  patterns:
    - "Rate limit de vision: createRateLimiter concurrent-rpm (3, 60)"
    - "withRetry compartilhado com servicos OpenAI (kommo-sync precedente)"
    - "GoogleReauthRequiredError tipado propagado 401/403 -> tc-analyzer para fail-mark D-04"

key-files:
  created:
    - server/services/extractors/openai-prompts.js
    - server/services/extractors/google-docs.js
    - server/services/extractors/google-slides.js
  modified: []

key-decisions:
  - "Prompts reconstruidos do research secao 6 (condensed) com densidade semantica equivalente — snapshot integral do workflow nao estava disponivel; preservamos intencao, cobertura e rigidez das regras"
  - "google-slides envia narrativa final (gpt-4.1 AUDITORIA_NARRATIVA_PROMPT) ao final — mesmo step do branch figma"
  - "google-docs trata tableOfContents e section break, preserva # titulo como header"

patterns-established:
  - "Cada extrator exporta funcao nomeada + default"
  - "Retorno { texto, imagens, erros, _meta }"
  - "AbortSignal.timeout em cada fetch externo"

requirements-completed:
  - EXT-02
  - EXT-03

duration: ~15min
completed: 2026-04-20
---

# Phase 4 Plan 03 — Google Docs/Slides + prompts OpenAI

## Accomplishments
- `openai-prompts.js` com 4 constantes (VISION_IMAGE_PROMPT, AUDITORIA_NARRATIVA_PROMPT, MIRO_AUDIT_PROMPT, MIRO_VISION_PROMPT) + aliases historicos
- `google-docs.js` parseia /document/d/{id}, percorre body.content[] (paragraph/table/sectionBreak/tableOfContents)
- `google-slides.js` parseia /presentation/d/{id}, percorre pageElements[] (shape.text, table, elementGroup, image), extrai speaker notes, chama GPT-4o vision detail=high em cada imagem e emite narrativa final gpt-4.1
- Rate-limit vision via createRateLimiter compartilhado com figma.js (3 concurrent, 60 rpm)

## Files Created
- `server/services/extractors/openai-prompts.js` (~100 linhas)
- `server/services/extractors/google-docs.js` (~80 linhas)
- `server/services/extractors/google-slides.js` (~190 linhas)

## Self-Check
- [x] extractGoogleDoc(url, { userId }) retorna { texto, imagens: [], erros: [] }
- [x] extractGoogleSlides usa GPT-4o detail=high (hardcoded)
- [x] Importam getAccessToken + GoogleReauthRequiredError
- [x] Rate-limit via createRateLimiter
- [x] 401/403 -> GoogleReauthRequiredError
- [x] node --check passa em todos
- [x] Commit atomico: 0681f46

## Next
04-05 (dispatcher) consome os 4 extratores (figma + miro + google-docs + google-slides) via INTERNAL_EXTRACTORS feature flag.

---
*Phase: 04-internalizacao-do-extrator-torre-de-controle*
*Completed: 2026-04-20*
