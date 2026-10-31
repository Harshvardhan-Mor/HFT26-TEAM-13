<!--
  FINAL SUBMISSION PR: paste everything below the line into the pull request description.
  PR title (exact format required by the organisers):
    [SUBMISSION] TEAM-13 - Sector Zero - An AI-Powered 3D Exoplanet Explorer
  Replace every <!-- TODO --> before submitting.
-->
---

## 🪐 Exoplanet Explorer: Team Sector Zero (TEAM-13)

**Track:** An AI-Powered 3D Exoplanet Explorer (SpaceTech & AI)
**Live demo:** https://hft-26-team-13.vercel.app
**Code:** https://github.com/Harshvardhan-Mor/HFT26-TEAM-13

### 📌 Solution overview and approach
Exoplanet data is usually a spreadsheet of numbers. We turned the **NASA Exoplanet Archive** into a universe you can fly through:

- **🌌 Galaxy view:** every known planet-hosting star at its real position in the sky (RA/Dec) and distance from Earth. Green stars host a potentially habitable planet.
- **🪐 System view:** each star with its planets on orbits using real eccentricities and real orbital periods (sped up), plus the habitable zone drawn as rings.
- **⚖️ Compare:** up to three planets next to Earth at true relative size, with a side-by-side table.
- **🌱 Habitability dashboard:** Earth Similarity Index, habitable-zone position, size class, temperature, orbit shape and star type. Every number shows *how* it was calculated and cites the paper. Estimated values are always labelled.
- **✨ Astra, the AI virtual astronomer:** explains and compares planets in plain language (English, Hindi, Telugu). Every question carries that planet's real NASA numbers, so answers are grounded, not invented.
- **🎬 Scroll-story intro, guided tour, ⏳ discovery timeline, 🖥️ presenter mode, 📱 mobile layout** for classrooms and demos.

**How we keep it honest**
- Real data: the `pscomppars` table via the archive's TAP API (6,451 confirmed planets around 4,847 stars, snapshot of 31 Oct 2026), plus a live-refresh button.
- Published science, with unit tests: Kopparapu et al. 2014 (habitable zone), Schulze-Makuch et al. 2011 / PHL (Earth Similarity Index), PHL Habitable Worlds Catalog criteria, Chen & Kipping 2017 (mass-radius estimates).
- The AI is told to use only the supplied data and never claim a planet is habitable or has life. We tested models with a trap question about data that doesn't exist (see `docs/model-test-results.md`).
- We spot-checked famous planets against NASA's own pages (see `docs/data-check.md`).

### 🏗️ Architecture and tech stack
```
Browser (React + Three.js / react-three-fiber, WebGL)
  ├─ GET  /data/exoplanets.json   ← NASA snapshot (npm run fetch-data)
  ├─ GET  /api/nasa               → NASA Exoplanet Archive TAP API (live refresh)
  └─ POST /api/chat (streaming)   → Featherless LLM (Qwen2.5-7B-Instruct), API key stays on the server
```
| Layer | Tech |
|---|---|
| 3D | Three.js, @react-three/fiber, @react-three/drei (WebGL) |
| UI | React 19, Vite, plain CSS |
| Server | Node.js functions (Vite middleware locally, Vercel serverless in production) |
| AI | Featherless (OpenAI-compatible API), streamed responses |
| Data | NASA Exoplanet Archive, `pscomppars` table |
| Quality | `node:test` unit tests, GitHub Actions CI |

All code is plain JavaScript, open source under the **MIT License**. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### 🚀 Local setup
Requires **Node.js 20.19+**.
```bash
git clone https://github.com/Harshvardhan-Mor/HFT26-TEAM-13.git
cd HFT26-TEAM-13
npm install
npm run fetch-data          # downloads all confirmed exoplanets from NASA
cp .env.example .env        # add a Featherless API key (Windows: copy .env.example .env)
npm run dev                 # http://localhost:5173
npm test                    # science unit tests
```

### 🎥 Demo
- Live: https://hft-26-team-13.vercel.app (works on phones too)

### 📸 Screenshots
**Scroll-story intro**
![Intro](https://raw.githubusercontent.com/Harshvardhan-Mor/HFT26-TEAM-13/main/docs/screenshots/1-intro.jpg)

**Galaxy view:** every host star at its real sky position; green = potentially habitable
![Galaxy](https://raw.githubusercontent.com/Harshvardhan-Mor/HFT26-TEAM-13/main/docs/screenshots/2-galaxy.jpg)

**TRAPPIST-1 system** with habitable-zone rings and the habitability dashboard
![System](https://raw.githubusercontent.com/Harshvardhan-Mor/HFT26-TEAM-13/main/docs/screenshots/3-system-trappist1.jpg)

**Compare:** Earth next to two planets at true relative size
![Compare](https://raw.githubusercontent.com/Harshvardhan-Mor/HFT26-TEAM-13/main/docs/screenshots/4-compare.jpg)

**Astra, the AI astronomer** (intro preview)
![Astra](https://raw.githubusercontent.com/Harshvardhan-Mor/HFT26-TEAM-13/main/docs/screenshots/5-astra.jpg)

### 👥 Team
| Member | Contribution |
|---|---|
| Harshvardhan Mor (lead) | 3D scenes (galaxy, system, compare), visual effects, scroll intro, integration and deployment |
| Hasini M | Data checks against NASA pages, habitability science review, deployment config, submission docs |
| Podduturi Manith | Interface: filters, travel-time card, planet panel, mobile layout |
| Nikhil Darapureddi | Astra AI: Featherless integration, streaming answers, model testing, Hindi and Telugu |

### 🙏 Acknowledgements
This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program. Built with open-source libraries (React, Three.js, react-three-fiber, drei, Vite; all MIT). AI via Featherless open-weight models. Built by **Team Sector Zero**: **Harshvardhan Mor** (team lead), **Hasini M**, **Podduturi Manith** and **Nikhil Darapureddi**, during CBIT Hacktoberfest '26 at Chaitanya Bharathi Institute of Technology, Hyderabad, with AI pair-programming assistance from Claude (Anthropic).
