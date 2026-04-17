# Coding Conventions

**Analysis Date:** 2026-04-16

## Language

**Primary:** JavaScript (ES2022+, ESM modules throughout)
**No TypeScript.** The entire codebase is plain JavaScript — `.js` files for logic, `.vue` SFCs for components. Do not introduce TypeScript.

## Naming Patterns

**Files:**
- Vue components: `PascalCase.vue` (e.g., `VScorecard.vue`, `VBarChart.vue`, `GtmFunnelTable.vue`)
- Shared components prefixed with `V`: `VScorecard`, `VDataTable`, `VLayout`, `VToggleGroup`
- Dashboard-specific components prefixed with dashboard abbreviation: `GtmBowTieChart`, `MvSectionTable`, `DreSankeyChart`, `NpsContent`, `TcMatrizTable`
- Composables: `camelCase` with `use` prefix: `useDashboardData.js`, `useFormatters.js`, `useChartDefaults.js`
- Pinia stores: `camelCase` descriptive name: `auth.js`, `dashboardData.js`
- Server files: `kebab-case.js` (e.g., `cache-manager.js`, `api-client.js`)
- Config files: `kebab-case.json` (e.g., `dashboards.json`)
- Dashboard config: always `config.js` inside dashboard folder
- Dashboard entry: always `index.vue` inside dashboard folder
- Migrations: `NNN_description.sql` (e.g., `001_create_hub_tables.sql`)

**Functions:**
- Use `camelCase` for all functions: `fetchData`, `formatCurrency`, `transformApiData`, `handleRefresh`
- Event handlers: prefix with `handle` (e.g., `handleRefresh`, `handleLogin`, `handleSelect`)
- Data transformers: prefix with `transform` (e.g., `transformApiData`)
- Format helpers: prefix with `format` (e.g., `formatPercentage`, `formatCurrency`, `formatDateTime`)
- Boolean getters: prefix with `is`/`has`/`can` (e.g., `isUpdateLocked`, `canAccessDashboard`, `hasData`)

**Variables:**
- Use `camelCase`: `dashboardId`, `cacheKey`, `fromCache`, `lastUpdateTime`
- Refs: `camelCase` matching the data name: `const loading = ref(false)`, `const data = shallowRef(null)`
- Constants (module-level): `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEOUT`, `LOCK_TTL_MS`, `PROFILES_CACHE_TTL`)
- Private module variables: `_camelCase` prefix (e.g., `_profilesCache`, `_profilesCacheTime`)

**CSS Variables:**
- Use `--kebab-case` with category prefix: `--bg-card`, `--text-high`, `--color-primary`, `--chart-color-1`, `--spacing-md`, `--radius-sm`, `--font-size-base`

## Code Style

**Formatting:**
- No Prettier or ESLint configured. Code style is manual/convention-based.
- Indentation: 2 spaces
- Semicolons: not used (no-semicolon style throughout)
- Quotes: single quotes for strings in JS, double quotes in HTML attributes
- Trailing commas: not used consistently
- Max line length: ~120 characters (soft, not enforced)

**Linting:**
- No linter configured. Zero linting tooling in `devDependencies`.
- Code quality is enforced by convention and CLAUDE.md guidelines.

## Module System

**ESM everywhere:**
- `"type": "module"` in `package.json`
- All imports use ES module syntax: `import ... from '...'`
- `node-fetch` v3 requires dynamic import: `const { default: fetch } = await import('node-fetch')`
- `__dirname`/`__filename` not available in ESM; use `fileURLToPath(import.meta.url)` + `dirname()` pattern:
  ```js
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  ```

## Import Organization

**Order in Vue SFCs (`<script setup>`):**
1. Vue core: `import { ref, computed, onMounted, watch } from 'vue'`
2. Vue Router / Pinia: `import { useRoute } from 'vue-router'`
3. Composables: `import { useDashboardData } from '../../composables/useDashboardData.js'`
4. Formatter helpers: `import { formatDateTime, formatNumber } from '../../composables/useFormatters.js'`
5. Shared UI components: `import VRefreshButton from '../../components/ui/VRefreshButton.vue'`
6. Local/dashboard-specific components: `import SafraChart from './components/SafraChart.vue'`

**Order in server files:**
1. Node built-ins: `import { promises as fs } from 'node:fs'`
2. Third-party packages: `import express from 'express'`
3. Local modules: `import { getCachedData } from '../lib/cache-manager.js'`

**Path Aliases:**
- `@` maps to `./client` (configured in `vite.config.js`), but rarely used in practice
- Most imports use relative paths (`../../components/...`)
- Always include `.js` extension for local JS imports (ESM requirement)

## Vue Component Patterns

**Always use `<script setup>` (Composition API).** No Options API in the codebase.

**Component structure (SFC order):**
1. `<template>` first
2. `<script setup>` second
3. `<style scoped>` third

**Props pattern:**
```js
const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    default: 0
  },
  formatter: {
    type: Function,
    default: (val) => val
  }
})
```
- Always include `type`
- Use `required: true` or provide `default`
- Use `validator` for complex prop validation (arrays of objects):
  ```js
  columns: {
    type: Array,
    required: true,
    validator: (columns) => columns.every(col => typeof col === 'object' && 'key' in col && 'label' in col)
  }
  ```

**Emits pattern:**
```js
const emit = defineEmits(['update:modelValue'])
```

**v-model pattern** (two-way binding):
- Use `modelValue` prop + `update:modelValue` emit (standard Vue 3 pattern)
- See `VToggleGroup.vue` for reference

**Composables pattern:**
```js
export function useDashboardData(dashboardId) {
  const data = shallowRef(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchData = async (forceRefresh = false) => { ... }
  const hasData = computed(() => data.value !== null)

  return { data, loading, error, fetchData, hasData }
}
```
- Named export function with `use` prefix
- Return an object with refs and methods
- Use `shallowRef` for large data objects (performance)
- Also export as default object for alternative import style

**Pinia stores:**
```js
export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref(false)
  // ...
  return { authenticated, ... }
})
```
- Use Composition API style (`setup` function), not Options API
- Store name matches filename: `'auth'` in `auth.js`, `'dashboardData'` in `dashboardData.js`

## Chart.js Patterns

**Chart.js and ECharts are loaded via CDN** (not npm), accessed as `window.Chart` and `window.echarts`.

**Always destroy Chart.js instances in `onBeforeUnmount`:**
```js
let chartInstance = null

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
```

**Recreate on data change:**
```js
watch(
  () => [props.labels, props.datasets],
  () => { createChart() },
  { deep: true }
)
```

**Design system chart defaults:** Use `getChartDefaults()` from `client/composables/useChartDefaults.js` or inline defaults matching the V4 design system colors.

**Chart color palette (NO BLUE as primary):**
```js
['#22c55e', '#f97316', '#fbbf24', '#ff0000', '#a855f7', '#84cc16', '#ec4899', '#999999']
```

## Lucide Icons Pattern

**Icons loaded via CDN**, not npm. After rendering new content with icons, call:
```js
await nextTick()
if (window.lucide) window.lucide.createIcons()
```

**In templates:** Use `<i data-lucide="icon-name"></i>` (not components).

## Error Handling

**Frontend:**
- Use `try/catch` around `fetch()` calls
- Set `error.value = err.message` for user display
- Redirect to `/login` on 401 responses:
  ```js
  if (response.status === 401) {
    window.location.href = '/login'
    return
  }
  ```
- Log errors with timestamp: `console.error(\`[${new Date().toISOString()}] ...\`, err)`
- Show error state in template with `v-if="error"`:
  ```html
  <div v-if="error" class="error-message">
    <i data-lucide="alert-circle"></i>
    <span>{{ error }}</span>
  </div>
  ```

**Backend:**
- Express routes use `try/catch` with `next(error)` for unhandled errors
- Global error handler in `server/index.js` returns structured JSON:
  ```js
  res.status(err.status || 500).json({
    error: { message: err.message, status: err.status || 500, timestamp }
  })
  ```
- Error messages in Portuguese for user-facing responses
- All `console.error` and `console.log` include ISO timestamp prefix: `[${new Date().toISOString()}]`

## Logging

**Framework:** `console` (no logging library)

**Pattern — always include ISO timestamp:**
```js
console.log(`[${new Date().toISOString()}] Cache HIT para ${dashboardId}`)
console.error(`[${new Date().toISOString()}] Error:`, err.message)
console.warn(`[${new Date().toISOString()}] N8N status check failed:`, err.message)
```

**Frontend store logs:** Use `[Store]` prefix:
```js
console.log(`[Store] Dados carregados para ${dashboardId}`)
```

**Router logs (dev only):**
```js
if (import.meta.env.DEV) {
  router.afterEach((to) => { console.log('[Router] Navigated to:', to.path) })
}
```

## Comments

**When to Comment:**
- JSDoc on all exported functions and composables
- Section dividers in large files using comment blocks:
  ```js
  // ──────────────────────────────────────────────
  // Data Transformation (webhook -> UI format)
  // ──────────────────────────────────────────────
  ```
- Inline comments in Portuguese for business logic explanations
- Config files have JSDoc headers: `/** Dashboard Configuration */`

**JSDoc pattern:**
```js
/**
 * Fetch dashboard data
 * @param {string} dashboardId - Dashboard identifier
 * @param {boolean} forceRefresh - Bypass cache
 * @returns {Promise<object>} Dashboard data
 */
```

## Dashboard Structure Convention

Every dashboard follows the same folder structure:
```
client/dashboards/DashboardName/
  config.js      # { id, title, icon, description }
  index.vue      # Main dashboard component
  components/    # Dashboard-specific components (optional)
  mock-data.js   # Mock data for development (optional)
  historico-*.js  # Historical data constants (optional)
```

**Dashboard `index.vue` standard layout:**
1. Header with title + last update time + VRefreshButton
2. Loading state (spinner)
3. Error state (alert icon + message)
4. Scorecards row (VScorecard components)
5. Charts section (VChartCard wrapping chart components)
6. Tables section (VDataTable or custom tables)
7. Update confirmation modals (VConfirmModal)

**Data flow in dashboards:**
```
onMounted -> fetchData() -> data.value -> computed transforms -> template renders
             useDashboardData composable
```

## CSS Conventions

**Global styles** defined in `client/styles/`:
- `design-system.css`: CSS custom properties (colors, spacing, typography, etc.)
- `layout.css`: App layout, sidebar, main content area
- `components.css`: Global component classes (`.card`, `.btn`, `.table`, `.scorecards`, `.spinner`)

**Scoped styles** in components: Use `<style scoped>` for component-specific overrides.

**Class naming:** Simple, descriptive, lowercase with hyphens (BEM-like but not strict BEM):
- `.dashboard-container`, `.main-header`, `.main-title`, `.main-actions`
- `.card`, `.card-header`, `.card-title`, `.card-body`
- `.scorecard`, `.scorecard-label`, `.scorecard-value`
- `.toggle-group`, `.toggle-btn`, `.toggle-btn.active`

**Always use CSS custom properties** from `design-system.css` instead of hardcoded values:
- `var(--bg-card)` not `#141414`
- `var(--text-high)` not `#ffffff`
- `var(--color-primary)` not `#ff0000`
- `var(--radius-md)` not `6px`

## Server Route Conventions

**Route pattern:**
```js
import { Router } from 'express'
const router = Router()

router.get('/path', async (req, res, next) => {
  try {
    // ...business logic...
    res.json({ data, timestamp: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

export default router
```

**Error responses:** Always structured as `{ error: { message, status } }`

**Auth middleware:** Applied at the path level in `server/index.js`, not per-route:
```js
app.use('/api/dashboards', requireAuth)
app.use('/api/data', requireAuth)
```

## Git Conventions

- Conventional commits in Portuguese, lowercase, single-line (~50 chars)
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`, `perf:`
- Co-authored footer with Claude when applicable
- Never use `--no-verify`

---

*Convention analysis: 2026-04-16*
