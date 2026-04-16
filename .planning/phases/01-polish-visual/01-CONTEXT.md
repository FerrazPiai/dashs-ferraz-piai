# Phase 1: Polish Visual - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Padronizar visual, responsividade e feedback em todos os dashboards ativos. Resultado: usuario navega entre qualquer dashboard e percebe consistencia visual — espacamento, tipografia, loading states, empty states, paleta de graficos e feedback de interacao uniformes. Telas de 768px a 1920px sem quebra de layout.

Requisitos cobertos: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05.

</domain>

<decisions>
## Implementation Decisions

### Loading States
- **D-01:** Criar componente compartilhado `VLoadingState` com spinner padrao e tamanho configuravel via prop (sm/md/lg). Dashboards substituem implementacoes custom por `<VLoadingState />`.
- **D-02:** Apenas spinner — sem skeleton. Skeleton pode ser adicionado futuramente se necessario.

### Empty States
- **D-03:** Criar componente compartilhado `VEmptyState` com icone Lucide + titulo + descricao opcional. Props: `icon`, `title`, `description`.
- **D-04:** Sem botao de acao no VEmptyState — manter componente leve e simples.

### Responsividade
- **D-05:** Estrategia desktop-first. Manter design desktop como base e adaptar com breakpoints 1024px (tablet) e 768px (laptop pequeno).
- **D-06:** Scorecards empilham em telas menores, tabelas ganham scroll horizontal (`overflow-x: auto`), graficos reduzem proporcionalmente.
- **D-07:** Tabelas grandes (GTM Motion, Fechamento Mensal com 10+ colunas) usam scroll horizontal — sem esconder colunas.

### Paleta de Graficos
- **D-08:** `useChartDefaults.js` vira unica fonte de verdade para cores, tooltip styles e font sizes de graficos. VBarChart e VLineChart param de redefinir valores inline.
- **D-09:** Font sizes de graficos alinhados com design system tokens: `--font-size-xs` (10px), `--font-size-sm` (12px), `--font-size-base` (14px).
- **D-10:** Tooltip styles centralizados no composable (background, text colors, padding).

### Feedback Visual
- **D-11:** Feedback sutil e consistente. Hover: leve mudanca de background (~rgba branco 5-8%). Click: breve escurecimento. Focus: outline vermelho fino. Transicoes de 150ms.
- **D-12:** Alinhado com minimalismo V4 — sem scale, sem shadow expressivo, sem glow.
- **D-13:** Transicoes de rota instantaneas — sem fade/slide entre dashboards. Loading state do dashboard novo fornece feedback suficiente.

### Claude's Discretion
- Decisao sobre quais CSS variables adicionais criar (opacity tokens, focus ring colors, error/warning backgrounds) fica a criterio do Claude durante o planejamento.
- Ordem de refatoracao dos dashboards (qual dashboard atacar primeiro) fica a criterio do Claude.
- Nivel de granularidade dos breakpoints responsivos dentro de cada dashboard.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design-system.md` — Especificacao completa do design system V4 (fonte Ubuntu, paleta sem azul, hierarquia de cores)
- `client/styles/design-system.css` — CSS custom properties (cores, spacing, tipografia, transicoes, sombras)
- `client/styles/layout.css` — Layout base do app, sidebar, area principal (unico arquivo com media queries de layout)
- `client/styles/components.css` — Classes globais de componentes (.card, .btn, .table, .scorecards, .spinner)

### Composables e Componentes Chave
- `client/composables/useChartDefaults.js` — Fonte de verdade para configuracao de graficos (cores, semantic colors, chart defaults)
- `client/composables/useFormatters.js` — Formatadores pt-BR (moeda, percentual, datas, numeros)
- `client/components/ui/VScorecard.vue` — Componente de scorecard (referencia para loading/trend states)
- `client/components/ui/VDataTable.vue` — Componente de tabela (referencia para empty state atual)
- `client/components/charts/VBarChart.vue` — Cores e tooltips hardcoded que precisam ser centralizados
- `client/components/charts/VLineChart.vue` — Mesmo problema de VBarChart

### Codebase Analysis
- `.planning/codebase/CONVENTIONS.md` — Convencoes de codigo, naming patterns, CSS conventions
- `.planning/codebase/CONCERNS.md` — Tech debt, bugs conhecidos, areas frageis (especialmente God Components)

### Dashboards para Refatorar
- `client/dashboards/TxConvSaberMonetizacao/index.vue` — Loading state custom, sem media queries
- `client/dashboards/NpsSatisfacao/index.vue` — Skeleton table (sera substituido por VLoadingState)
- `client/dashboards/FechamentoMensal/index.vue` — Inline styles, sem media queries
- `client/dashboards/DreFluxoCaixa/index.vue` — Tem algumas media queries proprias (referencia)
- `client/dashboards/GtmMotion/index.vue` — 2889 linhas, maior arquivo (cuidado com edits)
- `client/dashboards/Admin/index.vue` — Cores hardcoded (#4ade80, #1a1a1a)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/composables/useChartDefaults.js`: Ja tem `getChartDefaults()`, `getChartColors()`, `getSemanticColors()` — precisa ser expandido para ser a unica fonte de verdade
- `client/components/ui/VScorecard.vue`: Ja tem loading state com spinner — pode servir de modelo para VLoadingState
- `client/components/ui/VDataTable.vue`: Ja tem empty state basico ("Nenhum dado disponivel") — pode servir de modelo para VEmptyState
- `client/styles/design-system.css`: Tokens de spacing (xs-2xl), tipografia (xs-kpi), cores (primary, semantic, chart) ja definidos
- `client/styles/components.css`: Media queries basicas em 1024px e 768px para grids — expandir para dashboards

### Established Patterns
- CSS custom properties como fonte de verdade para valores visuais (var(--bg-card), var(--text-high), etc.)
- Componentes Vue com `<script setup>`, scoped styles, props tipados
- Lucide Icons via CDN com `data-lucide="icon-name"` (nao componentes)
- Chart.js via CDN (window.Chart) com destroy em onBeforeUnmount

### Integration Points
- Novos componentes VLoadingState e VEmptyState serao adicionados em `client/components/ui/`
- Cada dashboard index.vue precisara substituir loading/empty states custom
- `useChartDefaults.js` sera atualizado e importado por VBarChart/VLineChart
- `design-system.css` recebera tokens adicionais (focus, opacity, breakpoints)
- `components.css` recebera estilos globais de hover/focus

</code_context>

<specifics>
## Specific Ideas

- Minimalismo V4: feedback visual deve ser sutil, sem animacoes expressivas
- Publico principal: equipe interna em desktops/laptops — responsividade ate 768px e suficiente
- God Components (GtmMotion com 2889 linhas): edits precisam ser cirurgicos (Edit tool), nunca rewrite completo
- Design system V4 (preto/vermelho/branco, Ubuntu, sem azul) e inviolavel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-polish-visual*
*Context gathered: 2026-04-16*
