# Architecture

```
            ┌──────────────────────── Browser (React + Three.js) ─────────────────────────┐
            │  Sidebar ─► App state (selected system/planet, compare list, chat) ◄─ Panel  │
            │                 │                                                             │
            │   GalaxyView / SystemView / CompareView (react-three-fiber canvases)          │
            └─────────┬──────────────────────────────┬────────────────────────────────────┘
                      │ GET /data/exoplanets.json    │ POST /api/chat     GET /api/nasa
                      ▼                              ▼                     ▼
          public/data snapshot          server/chat.js ──► Featherless   server/nasa.js ──► NASA TAP
          (npm run fetch-data)          (key stays here)   LLM API      (avoids browser CORS)
```

## Data flow

1. `scripts/fetch-nasa.mjs` queries the archive's `pscomppars` table (one row per confirmed planet, best values combined) and writes `public/data/exoplanets.json`.
2. `src/lib/data.js` loads that snapshot (or the offline sample), runs `habitabilityReport()` on every planet and groups planets into systems by `hostname`.
3. Components read the prepared data. Nothing in the UI calculates science directly.

## AI grounding

When the user asks Astra something, `planetContext()` builds a compact JSON of the selected planet, its star, its sibling planets and the computed habitability indicators. `server/chat.js` puts it in the system prompt with rules: use only these numbers, say when values are missing or estimated, and never claim a planet is habitable or has life. This keeps answers factual and makes it easy to check them against the panel.

## One server codebase, two runtimes

`server/*.js` export plain async functions returning `{ status, body }`.
- **Development:** `vite.config.js` mounts them as middleware on `/api/*`.
- **Production (Vercel):** `api/*.js` wrap the same functions as serverless functions.

## Scales used in 3D (and why)

Real distances span from 0.01 AU to thousands of light years, so scenes use compressed scales, stated in the on-screen legend:
- Galaxy: `r = 10·log10(1 + distance_pc)`, true direction from RA/Dec.
- System: orbit radius `3 + 22·√(a / a_max)`, true eccentricity, true relative periods.
- Compare: **true** relative planet sizes.
