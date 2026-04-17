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
