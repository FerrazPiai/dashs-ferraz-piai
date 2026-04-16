---
phase: 01
slug: polish-visual
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-16
---

# Phase 01 — UI Design Contract

> Visual and interaction contract for the Polish Visual phase. Locks spacing, typography, color, copywriting, feedback, and component contracts before planning.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (custom CSS custom properties) |
| Preset | not applicable |
| Component library | none (custom Vue components, V-prefixed) |
| Icon library | Lucide Icons (CDN, `data-lucide` attributes) |
| Font | Ubuntu (Google Fonts: 300, 400, 500, 700) |

---

## Spacing Scale

Existing tokens in `client/styles/design-system.css` `:root`. Values are NOT multiples of 4 — this is the established system and must not be changed in this phase.

| Token | Value | Usage |
|-------|-------|-------|
| --spacing-xs | 4px | Icon gaps, inline padding |
| --spacing-sm | 8px | Compact element spacing |
| --spacing-md | 15px | Default element spacing, card padding |
| --spacing-lg | 20px | Section padding, card body |
| --spacing-xl | 25px | Layout gaps |
| --spacing-2xl | 30px | Major section breaks, section-title margin |

Exceptions: `--spacing-md` (15px), `--spacing-lg` (20px), `--spacing-xl` (25px), `--spacing-2xl` (30px) are not multiples of 4. Accepted — changing would break all existing dashboards.

**Enforcement rule:** All new spacing in this phase MUST use these tokens. Remove any hardcoded px values in dashboard files being refactored.

---

## Typography

Existing tokens in `client/styles/design-system.css`. Font: Ubuntu.

| Role | Token | Size | Weight | Line Height |
|------|-------|------|--------|-------------|
| Body | --font-size-base | 12px | 400 (--font-weight-normal) | 1.5 |
| Label / Small | --font-size-sm | 11px | 400 | 1.5 |
| Caption / Chart | --font-size-xs | 10px | 400 | 1.4 |
| Medium text | --font-size-md | 13px | 400 | 1.5 |
| Section label | --font-size-lg | 14px | 700 (--font-weight-bold) | 1.4 |
| Page title | --font-size-xl | 22px | 600 (--font-weight-semibold) | 1.3 |
| KPI display | --font-size-kpi | 48px | 700 | 1.1 |
| KPI compact | --font-size-kpi-compact | 36px | 700 | 1.1 |

**Chart font sizes (D-09):**
- Axis labels: `--font-size-xs` (10px)
- Axis titles: `--font-size-sm` (11px)  
- Tooltip body: `--font-size-base` (12px)
- Datalabels: `--font-size-xs` (10px)

**Enforcement rule:** Charts must reference these tokens via `useChartDefaults.js`. No inline font size declarations in chart components.

---

## Color

Existing V4 Design System. Inviolable — no changes permitted.

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Dominant (body) | --bg-body | #0d0d0d | Page background |
| Surface (cards) | --bg-card | #141414 | Card backgrounds, sidebar |
| Inner surface | --bg-inner | #1a1a1a | Nested elements, table headers |
| Hover surface | --bg-hover | #1a1a1a | Hover backgrounds |
| Accent (10%) | --color-primary | #ff0000 | Active states, section title bars, focus rings, primary CTA |
| Text high | --text-high | #ffffff | Headings, KPI values |
| Text medium | --text-medium | #cccccc | Body text, default |
| Text low | --text-low | #999999 | Secondary labels |
| Text muted | --text-muted | #888888 | Timestamps, hints |
| Text lowest | --text-lowest | #666666 | Disabled, decorative |

**Chart palette (no blue as primary):**

| Token | Color | Name |
|-------|-------|------|
| --chart-color-1 | #22c55e | Verde |
| --chart-color-2 | #f59e0b | Laranja |
| --chart-color-3 | #fbbf24 | Amarelo |
| --chart-color-4 | #ef4444 | Vermelho |
| --chart-color-5 | #a855f7 | Roxo |
| --chart-color-6 | #84cc16 | Verde-limao |
| --chart-color-7 | #f43f5e | Rosa |
| --chart-color-8 | #06b6d4 | Ciano (only if needed) |
| --chart-color-neutral | #6b7280 | Cinza |

Accent reserved for: section title bars (`::before` red bar), focus outlines, active toggle buttons, primary CTA hover, spinner border-top.

**Semantic colors:**

| Token | Value | Usage |
|-------|-------|-------|
| --color-safe | #22c55e | Positive metrics, success |
| --color-care | #fbbf24 | Warnings, attention |
| --color-danger | #ef4444 | Errors, negative metrics |
| --color-info | #3b82f6 | Info only (not in charts) |

---

## Copywriting Contract

| Element | Copy (pt-BR) |
|---------|-------------|
| Loading state (VLoadingState) | [no text — spinner only, context comes from surrounding card title] |
| Empty state heading (VEmptyState) | "Nenhum dado disponivel" |
| Empty state body (VEmptyState) | "Os dados serao exibidos quando estiverem disponiveis." |
| Error state (useDashboardData) | "Erro ao carregar dados: {error.message}" |
| Refresh button tooltip | "Atualizar dados" |
| Table empty row | "Nenhum registro encontrado" |

**Rules:**
- All user-facing copy in Portuguese (pt-BR)
- No action buttons in empty states (D-04 — keep lightweight)
- Error messages show the technical error for internal users (not generic)

---

## Interaction Feedback Contract (D-11, D-12)

All interactions follow V4 minimalism: subtle, functional, no expressive animations.

| Element | Trigger | Effect | Duration |
|---------|---------|--------|----------|
| Card | hover | background: `rgba(255, 255, 255, 0.05)` | 150ms (--transition-fast) |
| Button (primary) | hover | background: `--color-primary-dark` (#cc0000) | 150ms |
| Button (ghost) | hover | background: `rgba(255, 255, 255, 0.08)` | 150ms |
| Toggle button | active | background: `--bg-toggle-active` (#2a2a2a) | 150ms |
| Clickable row | hover | background: `rgba(255, 255, 255, 0.03)` | 150ms |
| Clickable row | click (active) | background: `rgba(255, 255, 255, 0.06)` | 100ms |
| Focus (keyboard) | focus-visible | outline: `2px solid var(--color-primary)`, outline-offset: `2px` | instant |
| Route transition | navigation | none — instant swap (D-13) | 0ms |

**Forbidden effects (D-12):**
- No `transform: scale()` on hover
- No `box-shadow` changes on hover
- No glow / text-shadow effects
- No slide/fade route transitions

**New CSS tokens to add in `design-system.css`:**

```css
--hover-overlay-subtle: rgba(255, 255, 255, 0.05);
--hover-overlay-light: rgba(255, 255, 255, 0.08);
--hover-overlay-minimal: rgba(255, 255, 255, 0.03);
--focus-ring-color: var(--color-primary);
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
```

---

## Component Contracts

### VLoadingState (NEW — D-01, D-02)

| Property | Contract |
|----------|----------|
| Location | `client/components/ui/VLoadingState.vue` |
| Props | `size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) }` |
| Template | Single centered spinner using existing `.spinner` / `.spinner-lg` classes |
| Sizes | sm: 16px (`.spinner`), md: 32px (`.spinner-lg`), lg: 48px (new `.spinner-xl`) |
| Wrapper | `display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl)` |
| No skeleton | D-02 — spinner only, no skeleton placeholders |

### VEmptyState (NEW — D-03, D-04)

| Property | Contract |
|----------|----------|
| Location | `client/components/ui/VEmptyState.vue` |
| Props | `icon: String` (Lucide name), `title: { type: String, default: 'Nenhum dado disponivel' }`, `description: String` (optional) |
| Template | Centered column: Lucide icon (32px, `--text-lowest`) + title (`--text-low`, `--font-size-lg`) + description (`--text-muted`, `--font-size-base`) |
| Spacing | Icon to title: `--spacing-md` (15px), title to description: `--spacing-sm` (8px) |
| No CTA | D-04 — no action buttons |
| Icon rendering | `data-lucide="{icon}"` attribute, call `lucide.createIcons()` in `onMounted` |

### useChartDefaults.js Update (D-08, D-09, D-10)

| Property | Contract |
|----------|----------|
| Colors | Must export ALL chart colors from CSS tokens (read from computed styles or hardcode matching values) |
| Font sizes | Axis labels: 10px, axis titles: 11px, tooltip body: 12px, datalabels: 10px |
| Tooltip style | `{ backgroundColor: '#1a1a1a', titleColor: '#ffffff', bodyColor: '#cccccc', borderColor: '#333333', borderWidth: 1, padding: 12, titleFont: { family: 'Ubuntu', size: 12, weight: '600' }, bodyFont: { family: 'Ubuntu', size: 12, weight: '400' } }` |
| Font family | `'Ubuntu', 'Segoe UI', sans-serif` in all chart text configs |
| Grid | `rgba(255, 255, 255, 0.03)` |

**VBarChart.vue and VLineChart.vue** must stop redeclaring colors/tooltip styles inline and use `useChartDefaults()` exclusively.

---

## Responsiveness Contract (D-05, D-06, D-07)

Strategy: desktop-first with breakpoints.

| Breakpoint | Token (new) | Targets |
|------------|-------------|---------|
| <= 1024px | --bp-tablet | Scorecards 2-column grid, reduce card padding |
| <= 768px | --bp-laptop-sm | Scorecards stack to 1 column, tables get `overflow-x: auto` |

**Scorecard grid behavior:**

| Viewport | Grid |
|----------|------|
| > 1024px | `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` |
| <= 1024px | `grid-template-columns: repeat(2, 1fr)` |
| <= 768px | `grid-template-columns: 1fr` |

**Table behavior (D-07):**
- All tables: `overflow-x: auto` wrapper at all breakpoints
- No column hiding — horizontal scroll for wide tables (GTM Motion, Fechamento Mensal)
- Min-width on table: `min-width: 600px` (prevents column crushing)

**Chart behavior:**
- Charts: `width: 100%`, height scales proportionally via container
- No fixed pixel heights on chart containers

**Where to add media queries:**
- Global responsive rules: `client/styles/components.css` (extend existing media queries)
- Dashboard-specific overrides: scoped `<style>` in each dashboard `index.vue`

---

## Dashboard Refactoring Order

Per CONTEXT.md (Claude's discretion), recommended order based on complexity and impact:

| Priority | Dashboard | Reason |
|----------|-----------|--------|
| 1 | Admin | Smallest, hardcoded colors, quick win |
| 2 | NpsSatisfacao | Has skeleton table to replace with VLoadingState |
| 3 | TxConvSaberMonetizacao | Custom loading, no media queries |
| 4 | FechamentoMensal | Inline styles, no media queries |
| 5 | DreFluxoCaixa | Already has some media queries (partial) |
| 6 | GtmMotion | 2889 lines — surgical edits only, last due to risk |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| No external registries | N/A — all custom components | not required |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: FLAG (8 sizes, 3 weights — accepted: inviolable pre-existing design system)
- [x] Dimension 5 Spacing: FLAG (3 values not multiples of 4 — accepted: inviolable pre-existing design system)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-16

---

*Phase: 01-polish-visual*
*UI-SPEC created: 2026-04-16*
