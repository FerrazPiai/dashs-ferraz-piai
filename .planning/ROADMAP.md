# Roadmap: Dashboards V4 — Milestone Visual & Torre de Controle

## Overview

Este milestone refina a experiencia visual dos dashboards existentes, conclui o dashboard Torre de Controle (colocando-o em producao) e padroniza os componentes compartilhados e a infraestrutura de erros. O resultado e uma plataforma mais polida, com todos os 7 dashboards funcionais e componentes confiavéis.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Polish Visual** - Padronizar visual, responsividade e feedback em todos os dashboards ativos
- [ ] **Phase 2: Torre de Controle** - Finalizar e lancar dashboard Torre de Controle em producao
- [ ] **Phase 3: Componentes e Infraestrutura** - Padronizar componentes compartilhados e tratamento de erros

## Phase Details

### Phase 1: Polish Visual
**Goal**: Todos os dashboards ativos tem visual consistente, responsivo e com feedback claro ao usuario
**Depends on**: Nothing (first phase)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05
**Success Criteria** (what must be TRUE):
  1. Usuario ve espacamento, tipografia e alinhamento uniformes ao navegar entre qualquer dashboard
  2. Dashboards exibem corretamente em telas de 768px a 1920px sem overflow ou quebra de layout
  3. Todo estado de carregamento mostra skeleton/spinner padrao e todo estado vazio mostra mensagem clara
  4. Graficos de todos os dashboards usam a mesma paleta de cores (sem azul, conforme design system V4)
  5. Hover em cards/botoes, click em acoes e transicoes de rota tem feedback visual perceptivel
**Plans**: TBD
**UI hint**: yes

### Phase 2: Torre de Controle
**Goal**: Dashboard Torre de Controle esta disponivel em producao com dados reais e navegacao funcional
**Depends on**: Phase 1
**Requirements**: TC-01, TC-02, TC-03
**Success Criteria** (what must be TRUE):
  1. Torre de Controle aparece na sidebar com bolinha verde (status available) e abre sem modal de aviso
  2. Matriz de status exibe clientes/metricas e usuario pode clicar em uma celula para ver painel de detalhe
  3. Dados da matriz vem do webhook n8n em producao (nao de mock-data)
  4. Drill-down no TcDetalhePanel mostra informacoes relevantes do item selecionado
**Plans**: TBD
**UI hint**: yes

### Phase 3: Componentes e Infraestrutura
**Goal**: Componentes reutilizaveis sao visuamente consistentes e a aplicacao se comporta com elegancia quando dados estao ausentes
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, COMP-03, INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. VScorecard exibe trend indicators e valores formatados de forma identica em qualquer dashboard
  2. VDataTable tem headers, alinhamento e color-coding uniformes independente do dashboard que o usa
  3. VBarChart e VLineChart tem tooltips, labels e comportamento responsivo identicos em todos os usos
  4. Documento de webhooks n8n lista cada endpoint, formato de dados esperado e dashboard associado
  5. Quando API retorna dados nulos ou vazios, todos os dashboards mostram estado de fallback ao inves de crashar
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Polish Visual | 0/? | Not started | - |
| 2. Torre de Controle | 0/? | Not started | - |
| 3. Componentes e Infraestrutura | 0/? | Not started | - |
