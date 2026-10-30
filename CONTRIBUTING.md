# Contributing to Exoplanet Explorer

Thanks for helping! This project is beginner-friendly. If something here is unclear, open an issue and ask.

## 1. Set up

```bash
git clone https://github.com/Harshvardhan-Mor/HFT26-TEAM-13.git
cd HFT26-TEAM-13
npm install
npm run fetch-data
cp .env.example .env   # add your own Featherless key if you work on the AI chat
npm run dev
```

## 2. Workflow

1. Pick or open an issue and comment "I'll take this" so nobody duplicates work.
2. Create a branch: `git checkout -b feat/short-description` (or `fix/...`, `docs/...`).
3. Make small, focused commits.
4. Run `npm test` and `npm run build` before pushing. Both must pass.
5. Push and open a Pull Request against `main`. Fill in the PR template and add a screenshot for any visual change.
6. One reviewer approves, then merge. Pull `main` often to avoid conflicts.

**Never commit `.env` or any API key.** If you do by accident, tell the maintainer immediately so the key can be revoked.

## 3. Module ownership

Each area has an owner who reviews PRs touching it. Owners: put your GitHub username next to your area.

| Area | Files | Owner | What it covers |
|---|---|---|---|
| 🌌 **3D visualisation** | `src/components/GalaxyView.jsx`, `SystemView.jsx`, `CompareView.jsx`, `Label.jsx`, `src/lib/visual.js` | _@username_ | Scenes, camera, orbits, colors, labels, performance |
| 🛰️ **Data and science** | `src/lib/nasa.js`, `src/lib/habitability.js`, `src/lib/data.js`, `scripts/`, `tests/` | _@username_ | NASA queries, formulas, unit tests. **Every formula needs a citation in a comment and a test.** |
| ✨ **AI astronomer** | `server/chat.js`, `api/chat.js`, `src/components/AstronomerChat.jsx`, `planetContext()` in `src/lib/data.js` | _@username_ | Prompting, grounding, model choice, error handling |
| 🎨 **UI, docs and demo** | `src/App.jsx`, `Sidebar.jsx`, `PlanetPanel.jsx`, `HabitabilityCard.jsx`, `src/styles.css`, `README.md`, `docs/` | _@username_ | Layout, accessibility, mobile, documentation |

## 4. Good first issues

- **Data:** add a "Discovery method" filter to the sidebar (`discoverymethod` column).
- **3D:** show the Solar System's habitable zone as a reference ring in System view.
- **3D:** add a "Planets discovered per year" timeline slider to the Galaxy view (`disc_year`).
- **AI:** stream Astra's replies token-by-token (`stream: true`) instead of waiting for the full answer.
- **AI:** add a "Tour mode" where Astra picks five remarkable planets and explains each.
- **Science:** add the full four-parameter ESI (radius, density, escape velocity, surface temperature) where mass and radius are both known; weights 0.57 / 1.07 / 0.70 / 5.58 (Schulze-Makuch et al. 2011).
- **UI:** keyboard navigation and screen-reader labels for the planet list.
- **UI:** shareable URLs (`?planet=TRAPPIST-1 e`) so people can link to a planet.

## 5. Code style

- Plain JavaScript and React function components. No TypeScript required.
- Keep science and data logic in `src/lib/` (no React there) so it stays testable.
- Comment *why*, not *what*. Cite the paper or source for any scientific number.
- Label estimated values in the UI. Never present a guess as NASA data.

## 6. Code of conduct

Be kind and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
