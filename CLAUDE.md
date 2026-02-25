# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Monorepo of V4 Company dashboards. Each dashboard lives in its own subdirectory with an independent Node.js server, vanilla HTML/CSS/JS frontend, and file-based caching. UI language is Portuguese (pt-BR).

## Structure

```
dashboards-v4/
├── design-system.md          # Company-wide design system (v2) — all dashboards must follow this
├── .claude/commands/          # Custom slash commands (e.g., /commit)
└── dashboard-*/               # Each dashboard is a self-contained project
    ├── server.js              # Express server with caching + API proxy
    ├── index.html / style.css / script.js   # Frontend
    ├── package.json           # Dependencies (run npm install inside each dashboard)
    ├── .env / .env.example    # Environment config
    └── CLAUDE.md              # Dashboard-specific guidance
```

## Commands

Each dashboard runs independently. `cd` into the dashboard directory first:

```bash
npm install          # Install dependencies
npm start            # Production server (node server.js)
npm run dev          # Dev server with nodemon auto-reload
```

Servers default to `http://localhost:3000` (configurable via `PORT` in `.env`).

## Design System

**`design-system.md`** at the repo root is the source of truth. Key specs:

- **Primary color:** `#ff0000` (vermelho V4), dark: `#cc0000`
- **Backgrounds:** body `#0d0d0d`, cards `#141414`, inner `#1a1a1a`
- **Borders:** cards `#2a2a2a`, rows `#1f1f1f`, inputs `#333`
- **Text:** `#fff` > `#ccc` > `#999` > `#888` > `#666`
- **Semantic:** green `#22c55e`, yellow `#fbbf24`, red `#ef4444`, blue `#3b82f6`
- **Border-radius:** `4-6px` (conservative, no pills on cards)
- **Cards:** no box-shadow, separation via background + border only
- **Section titles:** red bar `::before` + uppercase + `letter-spacing: 2px`
- **Font:** Montserrat (Google Fonts) or Segoe UI system stack
- **Charts:** Chart.js with dark grid (`rgba(255,255,255,0.03)`), tick color `#666`
- **Reference:** https://tremborage.v4ferrazpiai.com.br/

## Common Patterns

- **Caching:** Each dashboard uses file-based `cache.json` with 30-min TTL. `?refresh=true` bypasses cache.
- **API proxy:** `server.js` proxies external APIs (N8N webhooks) to avoid CORS. The actual endpoint is in `.env` (`API_ENDPOINT`).
- **node-fetch v3** is ESM-only — imported via dynamic `await import('node-fetch')` inside route handlers.
- **Cache-busting:** `script.js?v=N` in HTML — bump version when changing JS.
- **Icons:** Lucide Icons via CDN. Call `lucide.createIcons()` after rendering dynamic content.
- **Charts:** Chart.js via CDN. Destroy previous instance before recreating to avoid memory leaks.

## Git Conventions

- Conventional Commits in Portuguese, lowercase, single-line (~50 chars max)
- Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`, `perf:`
- No body/footer, no `--no-verify`

## Gotchas

- `express.static(__dirname)` serves all files in dashboard root — `.env` and `cache.json` are accessible via HTTP (gitignored but not blocked)
- `init()` is called via `() => init()` wrapper on DOMContentLoaded — must NOT pass the Event object as argument
