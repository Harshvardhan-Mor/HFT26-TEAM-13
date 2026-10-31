# 🪐 Exoplanet Explorer — Team Sector Zero (HFT26-TEAM-13)

> **Official Public Starter Repository for CBIT Hacktoberfest '26**  
> *Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad*

---

## 📋 Team Information

| Attribute | Details |
| :--- | :--- |
| **Team Name** | **Sector Zero** |
| **Team Number** | `TEAM-13` (`HFT26-TEAM-13`) |
| **Registration ID** | `HFEST26-4THNSV3P` |
| **Problem Track** | **An AI-Powered 3D Exoplanet Explorer** |
| **Domain** | `SpaceTech & AI` (Intermediate) |
| **Team Leader** | Harshvardhan Mor (morharshvardhan@gmail.com) |
| **Institution** | CBIT Hyderabad |

### 👥 Team Members

| # | Name | Email | Institution |
| :--- | :--- | :--- | :--- |
| 1 | Hasini M | hasinim216@gmail.com | CBIT Hyderabad |
| 2 | Podduturi Manith | pmanith0210@gmail.com | CBIT Hyderabad |
| 3 | Nikhil Darapureddi | srinikhildarapureddiofficial@gmail.com | CBIT Hyderabad |

---

## 🎯 Problem Statement

### **An AI-Powered 3D Exoplanet Explorer**
*Domain:* **SpaceTech & AI**

Exoplanets are planets outside our solar system, but traditional scientific data can make it difficult to understand their properties and potential habitability. The challenge: build an interactive 3D platform to explore known exoplanets, visualise their planetary systems, and use AI to understand and compare their characteristics, using real data from NASA's Exoplanet Archive.

| Requirement | How we meet it |
| :--- | :--- |
| 1. Interactive 3D visualisation | Galaxy, System and Compare views (WebGL via Three.js) |
| 2. Planetary properties | Radius, mass, period, distance, temperature, eccentricity and star data in the Details panel |
| 3. Real NASA data | `pscomppars` table from the NASA Exoplanet Archive TAP API (snapshot + live refresh) |
| 4. AI explanations and comparisons | **Astra**, a virtual astronomer on Featherless, grounded in each planet's real data |
| 5. Habitability indicators | Earth Similarity Index, Kopparapu 2014 habitable zone, PHL size criteria, with formulas shown |
| 6. Simple interface | Search, filters, one-click compare, suggested questions |

---

An open-source, interactive 3D platform for exploring every confirmed exoplanet using real data from the **NASA Exoplanet Archive**, with transparent **habitability indicators** and **Astra**, an AI virtual astronomer.

![License: MIT](https://img.shields.io/badge/license-MIT-green)

**🔗 Live demo: https://hft-26-team-13.vercel.app**

## Features

| | |
|---|---|
| 🌌 **Galaxy view** | Every host star placed at its real position in the sky (RA/Dec) and distance from Earth (log-scaled). Green stars host a potentially habitable planet. |
| 🪐 **System view** | Star, planets and orbits with real eccentricity and real orbital periods (sped up), plus the conservative and optimistic habitable zones. |
| ⚖️ **Compare** | Up to 3 planets next to Earth at true relative size, with a side-by-side property table. |
| 🌱 **Habitability dashboard** | Earth Similarity Index, habitable-zone position, size class, temperature, orbit shape and star type, each showing *how* it is calculated. |
| ✨ **Astra, the AI astronomer** | Explains and compares planets using the selected planet's real data, so answers are grounded in the archive instead of made up. |
| 🛰️ **Real NASA data** | `pscomppars` table via the archive's TAP API. Saved as an offline snapshot, with a **↻ Live** button to refresh from NASA. |
| 🎬 **Scroll-story intro and guided tour** | A welcome story with a 3D planet that moves as you scroll, a discovery counter from 1992 to today, and a step-by-step tour of famous worlds. |
| ⏳ **Discovery timeline** | Press ▶ in the Galaxy view to replay 30+ years of discoveries, year by year. |
| 🎥 **Follow-cam and visuals** | Click a planet to fly to it and ride along its orbit. Glowing stars, orbit trails and detailed planet surfaces (artistic impressions). |
| 🔎 **Filters and travel time** | Filter by discovery method and planet size, and see how long a trip there would take. |
| 🗣️ **Three languages** | Astra answers in English, Hindi or Telugu. |
| 🖥️ **Presenter mode** | Large text and controls for projectors and classrooms. |

## Quick start

You need **Node.js 20.19+ or 22.12+** (the current LTS from [nodejs.org](https://nodejs.org/) is fine). Check with `node -v`. Older versions fail with `does not provide an export named 'styleText'`.

```bash
git clone https://github.com/Harshvardhan-Mor/HFT26-TEAM-13.git
cd HFT26-TEAM-13
npm install
npm run fetch-data          # downloads all confirmed exoplanets from NASA (~10-30 s)
cp .env.example .env        # then paste your Featherless API key into .env
npm run dev                 # open http://localhost:5173
```

On Windows PowerShell, use `copy .env.example .env` instead of `cp`.

Without `npm run fetch-data`, the app runs on a small **offline sample** of 15 well-known planets (labelled "Offline sample" in the header). Without an API key, everything works except the AI chat.

```bash
npm test        # checks the habitability science against known values
npm run build   # production build into dist/
```

## Deploy (free)

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new). Vercel detects Vite automatically.
3. Add `FEATHERLESS_API_KEY` (and optionally `FEATHERLESS_MODEL`) under **Settings → Environment Variables**.

The `api/` folder becomes serverless functions (`/api/chat`, `/api/nasa`), so your key is never exposed to the browser.

## The science

All formulas live in [`src/lib/habitability.js`](src/lib/habitability.js) and are covered by tests.

- **Habitable zone:** Kopparapu et al. (2014), *ApJL* 787, L29. Stellar flux limits `Seff = SeffSun + aT + bT² + cT³ + dT⁴` with `T = Teff − 5780 K`. Conservative zone = runaway greenhouse to maximum greenhouse; optimistic = recent Venus to early Mars. Valid for star temperatures 2600–7200 K (the app flags stars outside that range).
- **Earth Similarity Index:** the simplified form used by the [Planetary Habitability Laboratory](https://phl.upr.edu/projects/earth-similarity-index-esi): `ESI = 1 − √(½[((S−1)/(S+1))² + ((R−1)/(R+1))²])`, from Schulze-Makuch et al. (2011), *Astrobiology* 11, 1041.
- **Habitable-planet sample:** follows the [PHL Habitable Worlds Catalog](https://phl.upr.edu/hwc) criteria: conservative 0.5 < R ≤ 1.6 R⊕ (or 0.1 < M ≤ 3 M⊕); optimistic R ≤ 2.5 R⊕ (or M ≤ 10 M⊕), inside the optimistic habitable zone.
- **Estimates for missing data:** radius from mass via the Chen & Kipping (2017, *ApJ* 834, 17) mass-radius relation, semi-major axis from Kepler's third law, insolation = L/a², equilibrium temperature = 278.6 K × S^¼ (zero albedo). Estimated values are always labelled.

> These are indicators for comparison, not claims that a planet is habitable or has life.

## Project structure

```
api/            Vercel serverless functions (thin wrappers)
server/         Server logic: Featherless chat + NASA fetch (shared by dev server and Vercel)
scripts/        fetch-nasa.mjs: downloads the data snapshot
src/lib/        Science, data loading and scales (no UI code; easy to test)
src/components/ React + react-three-fiber UI
src/data/       Small offline sample dataset
tests/          node:test unit tests
docs/           Architecture notes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces connect.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the module ownership map and good first issues.

## Credits and acknowledgements

This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.

Built with [React](https://react.dev), [Three.js](https://threejs.org), [react-three-fiber](https://github.com/pmndrs/react-three-fiber), [drei](https://github.com/pmndrs/drei) and [Vite](https://vite.dev) (all MIT licensed). AI via [Featherless](https://featherless.ai) open-weight models. Inspired by NASA's [Eyes on Exoplanets](https://eyes.nasa.gov/apps/exo/).

Built during CBIT Hacktoberfest '26 by Team Sector Zero, with AI pair-programming assistance from Claude (Anthropic).

## License

[MIT](LICENSE)

---

# Hackathon information

## 🛠️ Contribution & Submission Workflow

All teams must follow the official fork-and-pull-request workflow:

1. **Fork this Repository**:
   - One team member should click the **Fork** button at the top right to fork this upstream repository to your personal/team GitHub account.
2. **Add Collaborators**:
   - In your forked repository, navigate to **Settings > Collaborators** and invite all your registered team members.
3. **Clone & Develop Locally**:
   ```bash
   git clone https://github.com/<your-username>/HFT26-TEAM-13.git
   cd HFT26-TEAM-13
   git checkout -b feature/prototype
   ```
4. **Commit & Push Regularly**:
   - Make atomic, descriptive commits throughout the hackathon.
   ```bash
   git add .
   git commit -m "feat: implement core solution architecture"
   git push origin feature/prototype
   ```
5. **Open Pull Request (PR) for Final Submission**:
   - When ready for evaluation, open a **Pull Request** from your fork's `main` branch back to this upstream repository's `main` branch.
   - **PR Title Format**: `[SUBMISSION] TEAM-13 - Sector Zero - An AI-Powered 3D Exoplanet Explorer`
   - **PR Description Checklist**:
     - 📌 Solution Overview & Approach
     - 🏗️ Architecture & Tech Stack Details
     - 🚀 Local Setup & Installation Instructions
     - 🎥 Demo Video Link / Live Deployment URL
     - 📸 Key Screenshots & Visuals

---

## 📁 Recommended Project Structure

```
.
├── src/                  # Source code (Frontend / Backend / ML)
├── docs/                 # Documentation, architecture diagrams, slides
├── tests/                # Test suites & verification scripts
├── README.md             # Your project documentation & presentation
└── LICENSE               # Open-source license (MIT recommended)
```

---

## ⚠️ Important Rules & Code of Conduct
* **Upstream Protection**: Do not push directly to this repository's main branch. All evaluation will be conducted on your submitted Pull Request.
* **Original Work**: All code submitted must be developed during the hackathon timeline. Open-source libraries and frameworks are welcomed with proper attribution.
* **Code Freeze**: Final Pull Requests must be submitted before the designated hackathon submission deadline.
