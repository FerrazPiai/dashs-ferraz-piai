# Testing Patterns

**Analysis Date:** 2026-04-16

## Test Framework

**Runner:** None configured.

There is **no test framework, no test runner, and no test files** in this project. The `package.json` contains zero testing dependencies (no vitest, jest, mocha, cypress, playwright, or similar). There are no `*.test.*`, `*.spec.*`, or `__tests__` directories in the source code.

**No configuration files exist:**
- No `jest.config.*`
- No `vitest.config.*`
- No `cypress.config.*`
- No `playwright.config.*`
- No `.nycrc` or `c8` coverage config

**No test scripts in `package.json`:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "nodemon --watch server --watch config --ext js,mjs,cjs,json server/index.js",
    "client:dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server/index.js"
  }
}
```

## Current State

Testing is entirely manual. The codebase relies on:

1. **Manual browser testing** during development (Vite HMR on `localhost:5173`)
2. **Mock data** for offline/API-unavailable development:
   - `client/dashboards/GtmMotion/mock-data.js` — triggered via `?mock-data` query param
   - `client/dashboards/FechamentoMensal/historico-2025.js` — hardcoded historical data
3. **Console logging** throughout the codebase with timestamps for debugging
4. **Health check endpoint** at `GET /health` for production uptime monitoring

## Recommended Test Setup (If Adding Tests)

If tests are introduced to this project, the recommended setup based on the existing stack would be:

**Framework:** Vitest (native Vite integration, ESM-first)

**Why Vitest:**
- Already uses Vite for build/dev
- ESM-only codebase (`"type": "module"`)
- Vue 3 + `<script setup>` components
- Zero config needed for Vite projects

**Suggested config file:** `vitest.config.js`
```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    root: '.',
    include: ['**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['client/**/*.{js,vue}', 'server/**/*.js']
    }
  },
  resolve: {
    alias: { '@': './client' }
  }
})
```

**Suggested package.json scripts:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Suggested dependencies:**
```
vitest @vue/test-utils jsdom @vitest/coverage-v8
```

## Test File Organization (Recommended)

**Location:** Co-located with source files.

**Naming:** `[filename].test.js`

**Structure:**
```
client/
  composables/
    useDashboardData.js
    useDashboardData.test.js     # Unit test for composable
    useFormatters.js
    useFormatters.test.js        # Unit test for formatters
  components/
    ui/
      VScorecard.vue
      VScorecard.test.js         # Component test
server/
  lib/
    cache-manager.js
    cache-manager.test.js        # Unit test for cache logic
    api-client.js
    api-client.test.js           # Unit test with mocked fetch
  routes/
    api.test.js                  # Integration test with supertest
```

## Testable Units (Priority Order)

### High Priority — Pure Functions (Easy Wins)

**`client/composables/useFormatters.js`** — 8 pure formatting functions, zero dependencies:
- `formatPercentage(value, decimals, isDecimal)` — handles null, NaN, decimal/percentage conversion
- `formatCurrency(value)` — BRL formatting with Intl
- `formatNumber(value, decimals)` — pt-BR number formatting
- `formatDateTime(isoString, includeTime)` — ISO to dd/mm/yyyy
- `formatCurrencyAbbrev(value)` — abbreviated R$ 25,1k / R$ 13,1M
- `formatRelativeTime(date)` — "2 horas atras"
- `truncate(text, maxLength)` — text truncation
- `formatBytes(bytes)` — human-readable file sizes

**`server/lib/cache-manager.js`** — File-based cache with TTL:
- `getCachedData(dashboardId, ttl)` — read + validate + TTL check
- `setCachedData(dashboardId, data)` — write with timestamp
- `getCacheStatus(dashboardId, ttl)` — metadata without data

### Medium Priority — Composables & Stores

**`client/composables/useDashboardData.js`** — requires mocking `fetch`:
- Test retry logic (MAX_RETRIES = 1, retryable errors)
- Test 401 redirect behavior
- Test empty response handling

**`client/stores/auth.js`** — Pinia store, requires mocking `fetch`:
- Test `check()`, `login()`, `logout()`, `setPassword()`
- Test computed properties: `role`, `isAdmin`, `needsPassword`

**`client/composables/useChartDefaults.js`** — pure utility:
- `getChartDefaults(overrides)` — deep merge behavior
- `getChartColors()` — returns correct palette
- `createGradient(ctx, color, height)` — requires canvas mock

### Lower Priority — Server Routes

**`server/routes/api.js`** — complex route logic:
- `GET /api/data/:dashboardId` — cache hit/miss, fallback, null-payload detection
- `GET /api/:dashboardId/trigger-update` — lock/unlock, webhook POST
- Role-based access control (`canAccessDashboard`)

**`server/routes/auth.js`** — auth flows:
- Login with credentials
- Google OAuth callback
- Password set/change

**`server/middleware/requireAuth.js`** and `requireRole.js` — simple middleware.

## Mocking Patterns (Recommended)

**Browser `fetch` mocking (frontend):**
```js
import { vi, describe, it, expect } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('useDashboardData', () => {
  it('fetches dashboard data and sets refs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ data: { kpis: [] }, fromCache: false })),
      json: () => Promise.resolve({ data: { kpis: [] }, fromCache: false })
    })

    // test composable...
  })
})
```

**Server route testing (backend):**
Would require `supertest` or similar:
```js
import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import apiRoutes from '../routes/api.js'

// mock session, cache-manager, etc.
```

**What to Mock:**
- `fetch` / `node-fetch` (external API calls, N8N webhooks)
- `fs` operations (cache read/write)
- `pg` pool (database queries)
- `window.Chart` / `window.lucide` (CDN libraries)
- `express-session` (session state)

**What NOT to Mock:**
- Pure utility functions (`useFormatters.js`, `useChartDefaults.js`)
- Data transformation functions within dashboards
- Vue reactivity (let Composition API run naturally)

## Coverage

**Requirements:** None enforced. No coverage thresholds configured.

**Critical paths lacking coverage:**
- All formatter functions in `client/composables/useFormatters.js` (8 functions, 0 tests)
- Cache TTL logic in `server/lib/cache-manager.js`
- Auth flow in `server/routes/auth.js` (login, OAuth, password management)
- Role-based access in `server/routes/api.js` (`canAccessDashboard`)
- Data transformation functions in each dashboard's `index.vue`

## Test Types

**Unit Tests:**
- Not implemented. Ideal candidates: composables, formatters, cache-manager, data transformers.

**Integration Tests:**
- Not implemented. Ideal candidates: Express routes with supertest, Pinia stores with mocked API.

**E2E Tests:**
- Not implemented. `.playwright-mcp/` directory exists at project root (empty), suggesting Playwright was considered but not set up.

## Summary

This is a **zero-test codebase**. All quality assurance is manual. The `.playwright-mcp/` directory hints at planned but unimplemented E2E testing. If introducing tests, start with the pure functions in `useFormatters.js` (highest ROI, zero mocking needed) and the cache manager (file I/O only).

---

*Testing analysis: 2026-04-16*
