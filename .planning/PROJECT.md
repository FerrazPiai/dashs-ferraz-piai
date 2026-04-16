# Dashboards V4 — Hub Centralizado

## What This Is

Plataforma SPA centralizada de dashboards da V4 Company (Ferraz & Piai). Consolida 7 dashboards operacionais e financeiros em uma unica aplicacao com autenticacao por roles, cache inteligente e integracao direta com workflows n8n. Construida com Vue 3 + Express, deploy via Docker no Easypanel.

## Core Value

Visao unificada e confiavel das metricas operacionais e financeiras da V4 Company — dados certos, para as pessoas certas, no momento certo.

## Requirements

### Validated

- ✓ Hub de dashboards com sidebar navegavel e rotas auto-geradas — existing
- ✓ Autenticacao dual: email/senha (bcrypt) + Google OAuth com auto-criacao de usuario — existing
- ✓ Controle de acesso por roles (admin, board, operacao) com guard de rota e API — existing
- ✓ Cache file-based com TTL configuravel por dashboard e bypass via refresh — existing
- ✓ Proxy de APIs externas (webhooks n8n GET) com timeout de 5min — existing
- ✓ Trigger de atualizacao via webhook POST com lock file e verificacao de status n8n — existing
- ✓ Sistema de status de dashboards (available/development/maintenance) com modal — existing
- ✓ Design system V4: tema escuro, fonte Ubuntu, paleta sem azul, componentes padronizados — existing
- ✓ Dashboard Raio-X Financeiro: Sankey (ECharts), 3 modos visualizacao (DRE/Caixa/Planejado), KPIs executivos — existing
- ✓ Dashboard GTM Motion: funil comercial, bowtie chart com animacao de particulas, periodo mes/trimestre — existing
- ✓ Dashboard Tx Conversao Saber→Monetizacao: analise de safra, breakdown por tier, 3 visoes de tabela — existing
- ✓ Dashboard Comparativo Squads (Fechamento Mensal): heatmap por squad, dados historicos 2025 hardcoded — existing
- ✓ Dashboard NPS Satisfacao: sistema de 6 filtros, periodo mes/trimestre, comparativo — existing
- ✓ Dashboard Marketing & Vendas: visao por tier, analista e canal (hidden na sidebar) — existing
- ✓ Painel Admin: CRUD de usuarios e perfis com modais — existing
- ✓ Componentes reutilizaveis: VScorecard, VDataTable, VBarChart, VLineChart, VChartCard, VToggleGroup, VRefreshButton — existing
- ✓ Composables: useDashboardData (fetch+cache), useFormatters (8 formatadores), useChartDefaults (paleta+config) — existing
- ✓ Sessao server-side com PostgreSQL store (8h TTL, httpOnly, SameSite) — existing
- ✓ Deploy Docker multi-stage (node:20-alpine) com health check — existing

### Active

- [ ] Melhorias visuais nos dashboards existentes (UI/UX refinement)
- [ ] Torre de Controle: finalizar dashboard (status: development)
- [ ] Manutencao continua: bugs, ajustes de dados, novos dashboards conforme demanda

### Out of Scope

- TypeScript — projeto e JavaScript puro (ES2022+), nao migrar
- Testes automatizados — zero infraestrutura de testes, nao e prioridade atual
- Light mode — tema escuro only, sem toggle
- Mobile app nativa — web responsive e suficiente
- Redis/Memcached — cache file-based atende bem para uso interno
- API paga Anthropic — usar Claude Max via Agent SDK

## Context

**Ecossistema STACKS:** Este projeto e o principal consumidor de dados do ecossistema. Todos os dashboards recebem dados via webhooks n8n hospedados no Easypanel. O design system deste repo e referencia para todos os outros projetos STACKS.

**Infraestrutura:**
- Deploy: Easypanel (Docker containers com auto-SSL via Let's Encrypt)
- Banco: PostgreSQL (usuarios, sessoes, perfis)
- Automacoes: n8n self-hosted no Easypanel
- CDN: Chart.js 4.4.1, ECharts 5.5.0, Lucide Icons (nao via npm)

**Dashboards ativos em producao:** 6 (Raio-X, GTM Motion, Tx Conversao, Comparativo Squads, NPS, Marketing & Vendas)
**Dashboard em desenvolvimento:** 1 (Torre de Controle)
**Dashboard hidden:** 1 (Marketing & Vendas — disponivel mas oculto na sidebar)

**Dados:** Todos vem de planilhas Google Sheets processadas por workflows n8n. Cada dashboard tem seu workflow dedicado com schedule de 5-30min.

**Usuarios:** Equipe interna V4 Company — roles board (diretoria) e operacao (time operacional). ~20-50 usuarios.

## Constraints

- **Stack:** Vue 3 + Express + JavaScript puro — nao migrar para TypeScript ou outro framework
- **Deploy:** Docker multi-stage → Easypanel — sem outro provider
- **Design:** Design System V4 (preto/vermelho/branco, Ubuntu, sem azul) — obrigatorio
- **Dados:** Webhooks n8n como unica fonte — sem acesso direto a planilhas
- **Charts CDN:** Chart.js e ECharts carregados via CDN (window.Chart, window.echarts) — nao via npm
- **Idioma:** UI e codigo em portugues (pt-BR), variaveis em ingles
- **Commits:** Conventional commits em portugues, lowercase, co-authored com Claude
- **Seguranca:** Nunca hardcodar secrets, sempre .env + Docker env vars
- **API IA:** Nunca usar API paga Anthropic — usar Claude Max via Agent SDK

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cache file-based em vez de Redis | Simplicidade para uso interno, sem overhead de servico extra | ✓ Good |
| Charts via CDN em vez de npm | Evita bundle bloat, Chart.js e ECharts sao grandes | ✓ Good |
| PostgreSQL para sessoes | Sessoes sobrevivem restart do servidor (antes era in-memory) | ✓ Good |
| Google OAuth com auto-criacao | Facilita onboarding — qualquer email @v4company.com cria conta automaticamente | ✓ Good |
| Roles no dashboards.json | Simples e visual, sem precisar de DB para permissoes basicas | ✓ Good |
| Dados historicos hardcoded (2025) | API nao retorna historico antigo, fallback necessario | ⚠️ Revisit |
| Marketing & Vendas hidden | Dashboard funcional mas sem demanda ativa | — Pending |
| GSD como framework permanente | Organizar trabalho continuo com rastreamento e fases | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-16 after initialization*
