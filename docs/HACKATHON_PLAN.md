# Hackathon plan (16 hours)

## Roles
| Person | Role | Owns (see CONTRIBUTING.md) |
|---|---|---|
| 1 | Driver: talks to Claude, merges PRs | AI astronomer |
| 2 | Integrator: runs the app, fixes setup, deploys to Vercel | Data and science |
| 3 | 3D polish: visuals, performance, camera moves | 3D visualisation |
| 4 | Story: slides, README, demo script, backup recording | UI, docs and demo |

## Timeline (finish ~10:30 AM)
| Time | Goal |
|---|---|
| 8:00–9:00 PM | Everyone: clone, `npm install`, `npm run fetch-data`, `npm run dev` works. Get Featherless key into `.env`. |
| 9:00 PM–12:00 AM | Each person takes 1–2 "good first issues" in their area. Deploy a first version to Vercel by midnight. |
| 12:00–2:00 AM | Polish the demo path (below). Fix anything that looks broken. |
| 2:00–6:00 AM | Sleep in shifts (2 + 2). |
| 6:00 AM | **Feature freeze.** Bug fixes only. |
| 6:00–8:30 AM | Final deploy, record a backup demo video, screenshots for slides. |
| 8:30–10:00 AM | Rehearse the 3-minute demo twice. Prepare judge answers. |

## 3-minute demo script
1. **Hook (15 s):** "Over 6,000 exoplanets are known, but their data is a spreadsheet. We turned it into a universe you can fly through."
2. **Galaxy (30 s):** Rotate the map. "Every dot is a real star from NASA's archive at its true position. Green ones host potentially habitable planets." Tick "Potentially habitable only".
3. **System (45 s):** Click TRAPPIST-1. "Seven Earth-size planets, orbits at real speed ratios. The green ring is the habitable zone computed from the star's temperature." Click planet e: show ESI, zone bar, "How is this calculated?"
4. **Astra (45 s):** "Explain TRAPPIST-1 e like I'm a student." Point out it quotes the real numbers and says what's uncertain.
5. **Compare (30 s):** Add TRAPPIST-1 e, Proxima Cen b, K2-18 b. Show the true-scale spheres next to Earth. "Ask Astra to compare."
6. **Close (15 s):** "Real NASA data, transparent science, grounded AI, and it's open source under MIT."

## Likely judge questions
- **Is the data real?** Yes: NASA Exoplanet Archive `pscomppars` table via its TAP API; snapshot plus a live refresh button.
- **How do you stop the AI hallucinating?** Each question carries the planet's real data, and the system prompt forbids inventing numbers and claiming life.
- **How is habitability calculated?** Kopparapu 2014 habitable zone, PHL Earth Similarity Index and PHL catalog size criteria. All cited, with unit tests.
- **Why are distances not to scale?** Real scales span a factor of millions; we compress them (log or square root) and say so on screen. The Compare view uses true sizes.
- **What would you add next?** Streaming AI replies, discovery timeline, the full four-parameter ESI, shareable planet links.
