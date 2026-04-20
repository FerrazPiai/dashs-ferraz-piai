# Requirements: Dashboards V4

**Defined:** 2026-04-16
**Core Value:** Visao unificada e confiavel das metricas operacionais e financeiras da V4 Company

## v1 Requirements

Requirements para o milestone atual: melhorias visuais, finalizacao de dashboards em desenvolvimento e manutencao continua.

### Melhorias Visuais

- [ ] **VIS-01**: Revisar e padronizar espacamento, tipografia e alinhamento em todos os dashboards ativos
- [ ] **VIS-02**: Melhorar responsividade dos dashboards em telas menores (tablet, laptop pequeno)
- [ ] **VIS-03**: Padronizar loading states e empty states em todos os dashboards
- [ ] **VIS-04**: Revisar paleta de cores dos graficos para consistencia com design system V4
- [ ] **VIS-05**: Melhorar feedback visual de acoes do usuario (hover, click, transitions)

### Torre de Controle

- [ ] **TC-01**: Finalizar implementacao do dashboard Torre de Controle (status: development → available)
- [ ] **TC-02**: Matriz de status clicavel com drill-down funcional (TcMatrizTable + TcDetalhePanel)
- [ ] **TC-03**: Integrar com webhook n8n para dados reais (atualmente usa mock-data)

### Componentes Compartilhados

- [ ] **COMP-01**: Revisar VScorecard — garantir consistencia visual (trend indicators, formatters)
- [ ] **COMP-02**: Revisar VDataTable — melhorar visual de headers, alinhamento, color-coding
- [ ] **COMP-03**: Revisar VBarChart e VLineChart — padronizar tooltips, labels, responsividade

### Infraestrutura

- [ ] **INFRA-01**: Documentar todos os webhooks n8n e seus formatos de dados esperados
- [ ] **INFRA-02**: Padronizar tratamento de erros e fallbacks quando API retorna dados nulos/vazios

## v2 Requirements

Deferidos para futuro. Rastreados mas nao no roadmap atual.

### Funcionalidades Futuras

- **FUT-01**: Dashboard de metricas de IA/automacoes (Tech Projects integrado)
- **FUT-02**: Notificacoes in-app para alertas de metricas (KPIs fora do target)
- **FUT-03**: Export de dados para CSV/PDF
- **FUT-04**: Testes automatizados (Vitest para composables e utilitarios)
- **FUT-05**: Dark/light mode toggle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migracao para TypeScript | Projeto e JavaScript puro, complexidade nao justifica |
| Mobile app nativa | Web responsive atende, sem demanda |
| Redis/Memcached | Cache file-based suficiente para uso interno |
| Acesso direto a Google Sheets | Dados sempre via n8n webhooks (desacoplamento) |
| Redesign completo | Melhorias incrementais, nao rewrite |
| Novos frameworks (React, Svelte) | Vue 3 atende bem, equipe conhece |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 1 | Pending |
| VIS-02 | Phase 1 | Pending |
| VIS-03 | Phase 1 | Pending |
| VIS-04 | Phase 1 | Pending |
| VIS-05 | Phase 1 | Pending |
| TC-01 | Phase 2 | Pending |
| TC-02 | Phase 2 | Pending |
| TC-03 | Phase 2 | Pending |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| INFRA-01 | Phase 3 | Pending |
| INFRA-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after initial definition*

## Extrator Torre de Controle (EXT)

Requisitos da fase 4 — internalizacao do workflow n8n `uiUUXegcBHe3z2fg`.
Decisao arquitetural em `.planning/notes/decisao-internalizacao-extracao-tc.md`.

### EXT-01 OAuth Google per-user
Gestor conecta sua conta Google uma unica vez (scopes `drive.readonly` + `documents.readonly` + `presentations.readonly`). O `refresh_token` fica armazenado criptografado (AES-256-GCM) na tabela `dashboards_hub.google_oauth_tokens`. Reauth via banner+retry quando o token expira/e revogado. Ownership do job segue trigger-owner (`triggered_by_user_id`) com fallback Kommo-resp (`users.kommo_user_id` ↔ `tc_kommo_users.responsible_user_id`).

### EXT-02 Google Slides via API nativa
Extracao de Slides usa `slides.presentations.get` para estrutura (text boxes, tabelas, speaker notes, image IDs) + GPT-4o vision com `detail=high` para cada imagem embutida. Sem Mistral OCR. Sem download de PDF. Prompts OpenAI portados literal do workflow n8n atual (secao 6 de `.planning/research/n8n-workflow-auditoria-saber-interno.md`).

### EXT-03 Google Docs via API nativa
Extracao de transcricoes em Google Docs usa `docs.documents.get` e concatena `body.content[]` (paragraphs, textRuns, tables, headings) preservando ordem. Sem Mistral OCR. Sem download de PDF.

### EXT-04 Figma interno
Extracao Figma roda 100% no backend via Figma REST API com `FIGMA_TOKEN` centralizado no `.env`. Prompts do branch figma portados literal. Preserva `auditoria_narrativa_integral` se paridade exigir.

### EXT-05 Miro interno com paginacao
Extracao Miro roda 100% no backend via Miro REST API v2 com `MIRO_TOKEN` centralizado no `.env`. `/v2/boards/{id}/items` e paginado via cursor (`cursor` + `limit=50`) ate `cursor` ausente — corrige o bug atual do workflow n8n que so le pagina 1 e trunca boards grandes.

### EXT-06 Cutover n8n
`extractViaN8n`, `N8N_EXTRACT_WEBHOOK_URL`, `PLATFORM_TO_N8N` e `n8nLimiter` removidos do codigo. Feature flag `INTERNAL_EXTRACTORS=transcricao,google,figma,miro` em `.env` permite rollout por plataforma durante cutover. Workflow n8n `uiUUXegcBHe3z2fg` e ARQUIVADO (nao deletado) como referencia historica. `.env.example` e `.planning/codebase/INTEGRATIONS.md` atualizados.
