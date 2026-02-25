# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dashboard de Conversão de Safra — displays agricultural crop conversion metrics (leads, monetized leads, conversion rates by safra/crop period) fetched from an N8N webhook API.

## Tech Stack

- **Backend:** Node.js + Express + node-fetch (ESM)
- **Frontend:** Vanilla HTML/CSS/JS, Chart.js (line+area chart), Lucide Icons, Montserrat font
- **Cache:** File-based `cache.json` with 30-min TTL

## Environment

Requires `.env` with:
- `API_ENDPOINT` (required) — N8N webhook URL
- `PORT` (optional, default: 3000)

## Architecture

```
Browser (index.html + script.js)
  → GET /api/data?_t=timestamp[&refresh=true]
    → server.js reads cache.json
      → cache valid (<30min) and no refresh → return cached
      → else → fetch API_ENDPOINT, save cache.json, return fresh
```

**Endpoints:**
- `GET /api/data` — Main data endpoint. `?refresh=true` bypasses cache.
- `GET /api/cache/status` — Cache metadata (age, validity, expiry).

**Frontend components:**
- `renderScorecards()` — KPI cards (total leads, monetized, avg conversion)
- `renderChart()` — Chart.js line+area chart with red gradient fill. Manages `safraChartInstance` lifecycle (destroy before recreate).
- `renderTable()` — Detailed breakdown table by safra period
- `forceRefresh()` — Button handler, shows loading state with Lucide loader icon

## API Response Shape

```json
{
  "data": [
    { "safra": "01/2026", "count_leads": 11, "count_leads_monetizados": 4, "convertion_rate": 0.3636 }
  ],
  "time": "2026-02-24T18:07:26.865-03:00"
}
```

## Design

Follows `../design-system.md` (v2). Primary `#ff0000`, dark theme, 6px radius cards, section titles with red `::before` bar.
