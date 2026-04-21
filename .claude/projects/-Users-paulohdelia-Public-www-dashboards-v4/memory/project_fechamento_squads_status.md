---
name: Fechamento Squads Status
description: Status da implementação do dashboard Fechamento Financeiro por Squads — integração API, UX, pendências
type: project
---

Dashboard Fechamento Financeiro por Squads — integrado com `useDashboardData` composable para buscar dados da API real.

**Concluído:**
- UX/UI completa: tabela financeira com grupos colapsáveis (Aquisição, Renovação, Expansão, Comissão, Revenue Churn), drill-down até nível cliente
- Scorecards: Receita Total, NRR%, Expansão, Revenue Churn, Churn Rate, Isenções
- Gráficos: NRR Evolution (linha por squad), Revenue Churn por Tipo (stacked bar), Ranking de Squads
- Engine de churn (`churn-engine.js`) com testes
- Seletor de período: trimestral e mensal
- Filtro de squad (consolidado ou individual)
- Variação M/M e % do Total como toggles
- Integração com `useDashboardData` — busca da API real em produção
- Suporte a `?mock-data` na URL para desenvolvimento com dados mock
- Refresh/update com verificação de lock e modal de confirmação
- Registrado em `dashboards.json` com status "development"

**Pendente:**
- Nomes dos coordenadores no `SQUAD_COORDINATORS` (todos '—')
- Webhook de atualização (`webhookEndpoint`) não configurado em `dashboards.json`
- `workflowId` do N8N não configurado
- Teste visual em produção com dados reais
- Mudar status para "available" quando pronto

**Why:** Dashboard financeiro detalhado por squad, complementa o Comparativo Squads existente com drill-down por categoria de receita e engine de churn.

**How to apply:** Ao trabalhar neste dashboard, usar `?mock-data` na URL para dev. Dados reais dependem do endpoint N8N estar configurado no `.env`.
