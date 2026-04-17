# Phase 01: Polish Visual — Research

**Researched:** 2026-04-16
**Phase Goal:** Todos os dashboards ativos tem visual consistente, responsivo e com feedback claro ao usuario

---

## Current State Audit

### Loading States (per dashboard)

| Dashboard | Current Implementation | Needs Change? |
|-----------|----------------------|---------------|
| Admin | None (delegates to child tabs) | Yes — add VLoadingState |
| NpsSatisfacao | Delegates to NpsContent child | Yes — add VLoadingState |
| TxConvSaberMonetizacao | Custom spinner + text "Carregando dados..." with hardcoded `border-top-color: #ff0000` (line ~698) | Yes — replace with VLoadingState |
| FechamentoMensal | Skeleton shimmer animation with `@keyframes shimmer` (line ~1473) | Yes — replace with VLoadingState |
| DreFluxoCaixa | Spinner in KPI cards (40px, hardcoded red border-top) (line ~1077) | Yes — replace with VLoadingState |
| GtmMotion | Delegates `:loading` to GtmScorecard children | Partial — verify children use standard spinner |
| MarketingVendas | Delegates `:loading` to MvSectionTable/MvListagemTable children | Partial — verify children use standard spinner |

### Empty States (per dashboard)

| Dashboard | Current Implementation | Needs Change? |
|-----------|----------------------|---------------|
| Admin | None | N/A (admin interface, not data dashboard) |
| NpsSatisfacao | Error icon + text (lines 84-87) | Yes — add VEmptyState |
| TxConvSaberMonetizacao | "Nenhum dado disponivel" with `color: #999` inline (lines 109-150) | Yes — replace with VEmptyState |
| FechamentoMensal | Em-dash "—" for null values | Partial — acceptable for table cells |
| DreFluxoCaixa | Em-dash "—" for null values | Partial — acceptable for KPI cards |
| GtmMotion | Not visible in parent | Check child components |
| MarketingVendas | Not visible in parent | Check child components |

### Media Queries / Responsiveness

| Dashboard | Has Media Queries? | Details |
|-----------|-------------------|---------|
| Admin | No | — |
| NpsSatisfacao | No | — |
| TxConvSaberMonetizacao | No | No responsive rules at all |
| FechamentoMensal | No | Hardcoded cell widths for heatmap table |
| DreFluxoCaixa | Yes (3 breakpoints) | 1400px (5-col), 1024px (2-col), 640px (2-col) — REFERENCE |
| GtmMotion | Unknown (2889 lines) | Likely no — check scoped styles |
| MarketingVendas | No | — |

### Hardcoded Colors / Inline Styles

| Dashboard | Issues |
|-----------|--------|
| Admin | `rgba(255,0,0,0.08)` tab states (lines 59-65) — minor |
| NpsSatisfacao | `#1a1a1a` bg, `rgba(255,255,255,0.06)` borders (lines 488, 503) |
| TxConvSaberMonetizacao | `#ff0000` spinner, `#999` empty text |
| FechamentoMensal | Heatmap rgba colors (green/yellow/red), `#1a1a1a`, `#222`, `#141414` |
| DreFluxoCaixa | `#ff0000` spinner, KPI badge rgba colors, `#111` filter bg |
| GtmMotion | `#22c55e`, `#fbbf24`, `#ef4444` legend dots, `#0d0d0d` bg |
| MarketingVendas | `#14b8a6`, `#888`, `#a855f7`, `#666` icon colors (lines 102-107) |

---

## Chart Components Analysis

### useChartDefaults.js (composable)

**Exports:** `getChartDefaults(overrides)`, `getChartColors()`, `getSemanticColors()`, `createGradient()`, `mergeDeep()`

**Provides:**
- Tooltip: bg `#141414`, title `#ffffff`, body `#cccccc`, border `#333333`, Ubuntu 13px/12px
- Grid: `rgba(255, 255, 255, 0.03)`
- Ticks: `#666666`, 11px
- Legend: `#cccccc`, Ubuntu 12px
- Colors: 8-color palette (green, orange, yellow, red, purple, lime, pink, gray)
- Semantic: safe, care, danger, info, primary, neutral

**Missing from composable (hardcoded in components):**
- Bar border radius (4px default in VBarChart)
- Bar border width (0 default)
- Line tension (0.4)
- Point styling (radius 4, hover 6, border color white, border width 2)
- Datalabels font config

### VBarChart.vue — Does NOT use useChartDefaults

ALL values duplicated locally:
- Tooltip config: lines 80-85 (identical to composable)
- Grid/tick config: lines 93-110 (identical)
- Color array: lines 157-166 (identical to getChartColors())
- Datalabels: 11px horizontal / 10px vertical, `#ffffff`, bold

### VLineChart.vue — Does NOT use useChartDefaults

ALL values duplicated locally:
- Tooltip config: lines 74-84 (identical, plus custom % formatter)
- Grid/tick config: lines 91-111 (identical)
- Default color: `#ff0000` as prop default
- Point styling: radius 4, hover 6, border white 2px, tension 0.4
- Datalabels: 12px, bold

---

## Shared CSS Infrastructure

### design-system.css

Tokens defined:
- Spacing: xs(4), sm(8), md(15), lg(20), xl(25), 2xl(30)
- Typography: xs(10), sm(11), base(12), md(13), lg(14), xl(22), kpi(48), kpi-compact(36)
- Colors: primary, semantic, chart palette, backgrounds, text hierarchy, borders
- Transitions: fast(150ms), normal(250ms)
- Spinner: 16px (`.spinner`), 32px (`.spinner-lg`)

### components.css

Media queries:
- `@media (max-width: 1024px)` — `.grid-cols-3` → 2 columns
- `@media (max-width: 768px)` — `.grid-cols-2`, `.grid-cols-3` → 1 column, `.scorecards` → 1 column

Empty state classes available: `.empty-state`, `.empty-state-icon`, `.empty-state-text`

### layout.css

- `@media (max-width: 768px)` — sidebar collapses to 0 width, main content full width

### VLayout.vue

- `checkMobile()`: `window.innerWidth <= 768` → collapse sidebar
- Resize listener added on mount
- Sidebar overlay for mobile

---

## Implementation Strategy

### Work Breakdown by Concern

**1. New shared components (VLoadingState, VEmptyState)**
- Create in `client/components/ui/`
- VLoadingState: size prop (sm/md/lg), uses existing `.spinner` classes
- VEmptyState: icon/title/description props, Lucide icon + text
- Low risk, no existing code touched

**2. Chart centralization (useChartDefaults refactor)**
- Expand `useChartDefaults.js` with bar/line-specific defaults
- Refactor VBarChart.vue to use `getChartDefaults()` + `getChartColors()`
- Refactor VLineChart.vue to use `getChartDefaults()` + `getChartColors()`
- Medium risk — chart rendering must remain identical

**3. Design system tokens expansion**
- Add hover overlay tokens, focus ring tokens to `design-system.css`
- Add `.spinner-xl` for 48px loading
- Add global hover/focus styles to `components.css`
- Low risk — additive only

**4. Dashboard-by-dashboard refactoring**
- Replace custom loading/empty states with VLoadingState/VEmptyState
- Add media queries for responsiveness
- Replace hardcoded colors with CSS variables
- HIGH RISK for GtmMotion (2889 lines) — surgical edits only

### Dependency Order

```
Wave 1 (parallel, no deps):
  - Create VLoadingState + VEmptyState
  - Expand design-system.css tokens
  - Expand useChartDefaults.js

Wave 2 (depends on wave 1):
  - Refactor VBarChart/VLineChart to use useChartDefaults
  - Add global responsive + hover/focus styles to components.css

Wave 3 (depends on waves 1-2):
  - Dashboard refactoring: Admin → NpsSatisfacao → TxConv → FechamentoMensal → DreFluxoCaixa → GtmMotion
```

### Risks

| Risk | Mitigation |
|------|-----------|
| GtmMotion 2889 lines — edits may break | Edit tool only, never Write. Test after each change. |
| Chart refactor changes visual output | Compare before/after — colors, tooltips, grid must be identical |
| FechamentoMensal skeleton removal | VLoadingState spinner is simpler — acceptable per D-02 |
| Hardcoded colors serve semantic purposes (heatmap green/yellow/red) | Keep semantic inline rgba — only replace non-semantic hardcoded hex |

---

## RESEARCH COMPLETE
