---
title: Decisao arquitetural — Internalizacao do extrator Torre de Controle
date: 2026-04-18
context: Definir como substituir o workflow n8n `uiUUXegcBHe3z2fg` (Auditoria Saber) por implementacao 100% no backend do hub
---

# Decisao Arquitetural — Internalizacao do Extrator Torre de Controle

## Contexto

O dashboard `client/dashboards/TorreDeControle/` depende hoje do workflow n8n
`uiUUXegcBHe3z2fg` (Auditoria Saber Extrator De Dados) para ler apresentacoes,
transcricoes, boards Figma e Miro, gerar narrativa auditavel e popular a tabela
`dashboards_hub.tc_extracoes`.

**Dor real encontrada:** a maioria das analises nao acontece porque o Service
Account usado pelo workflow nao tem acesso aos Google Docs/Slides privados dos
gestores (403 no `Copy file`). A consequencia e `status_avaliacao = incompleta`
em escala.

O research doc `.planning/research/n8n-workflow-auditoria-saber-interno.md` ja
havia mapeado o workflow tecnicamente e proposto uma arquitetura interna com
Service Account + tokens no `.env`. Esta decisao **refina** essa proposta
corrigindo o modelo de credencial Google e eliminando a dependencia do Mistral
OCR.

## Decisoes tomadas

### 1. OAuth 2.0 por usuario (Google) em vez de Service Account

Cada gestor autentica a propria conta Google uma unica vez no hub
(`drive.readonly` + `documents.readonly` + `presentations.readonly`).
Refresh token armazenado **criptografado** em tabela nova (sugestao:
`dashboards_hub.google_oauth_tokens(user_id, refresh_token_enc, scopes,
connected_at, revoked_at)`).

Beneficio: o sistema le apenas o que o proprio gestor ja pode ler. Resolve a
falha de acesso atual sem precisar compartilhar nenhuma pasta com Service
Account.

Custo: fluxo de reautorizacao quando token expira ou e revogado (banner
"reconectar Google" + fila de extracoes pendentes).

### 2. APIs nativas Google — zero OCR, zero Mistral

Para o escopo em producao (Slides e Docs), o pipeline `Copy file → PDF →
Mistral OCR` e desnecessario. Vamos direto no tipo estruturado:

| Tipo | API | Saida |
|---|---|---|
| Google Docs | `docs.documents.get` | JSON com `body.content` (textRuns, tables, headings) |
| Google Slides | `slides.presentations.get` | JSON com slides ordenados, text boxes, tabelas, speaker notes, IDs de imagens |
| Imagens embutidas em slides | `drive.files.get?alt=media` + GPT-4o vision | Descricao densa por imagem |

Ganhos: custo zero de OCR, estrutura preservada (ordem, notas do apresentador,
tabelas), sem erros de OCR, mais rapido.

Mistral OCR fica **removido** do pipeline ativo (variavel no `.env` pode ficar
dormant caso entre no escopo futuro de upload de PDF arbitrario — ver seed
`upload-pdf-arbitrario-tc.md`).

### 3. Figma e Miro internalizados com token centralizado no `.env`

Mantem o padrao do research doc para esses dois branches:

- `FIGMA_TOKEN` no `.env` (mover de hardcoded no workflow)
- `MIRO_TOKEN` no `.env` (mover de hardcoded no workflow)
- Loops de vision serializados com `p-limit`
- Miro: **corrigir paginacao** de `/items` (workflow atual so le pagina 1)

OAuth por-usuario **nao se aplica** para Figma/Miro no escopo atual —
arquivos ja sao acessiveis via link com token master (comportamento aceito).

### 4. Cutover total do n8n

Ao concluir a internalizacao, remove-se:
- `extractViaN8n` de `server/services/tc-analyzer.js`
- `N8N_EXTRACT_WEBHOOK_URL` do `.env` e do Easypanel
- Workflow `uiUUXegcBHe3z2fg` arquivado (nao deletado) como referencia historica

## Arquitetura resultante

```
server/services/extractors/
  index.js                       // extractContent(url, platform, userId)
  google-slides-extractor.js     // slides.presentations.get + vision em imagens
  google-docs-extractor.js       // docs.documents.get + concat textRun
  figma-extractor.js             // FIGMA_TOKEN centralizado
  miro-extractor.js              // MIRO_TOKEN centralizado (com paginacao corrigida)
  shared/
    google-oauth.js              // OAuth2 flow, token refresh, token CRUD
    openai-vision.js             // GPT-4o image.analyze
    openai-chat.js               // GPT-4.1 JSON schema (narrativa final)
```

## Pontos em aberto (nao decididos)

- **Quem "dona" a extracao** quando Gestor A cadastra URL no Kommo e Gestor B
  abre a analise? Registrado em `.planning/research/questions.md`.
- **Criptografia do refresh_token no DB:** chave em env var (`TOKEN_ENC_KEY`)
  ou KMS do Easypanel? Decidir na fase de planejamento.
- **Reautorizacao UX:** banner global vs. modal no ponto de uso. Decidir na
  fase UI.

## Referencias

- Research tecnico: `.planning/research/n8n-workflow-auditoria-saber-interno.md`
- Shapes de webhook atuais: `.planning/research/n8n-extraction-webhook-shapes.md`
- Backend atual: `server/services/tc-analyzer.js`
- Google Slides API: https://developers.google.com/slides/api/reference/rest
- Google Docs API: https://developers.google.com/docs/api/reference/rest
