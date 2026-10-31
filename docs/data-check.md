# Data check (2026-10-31)

Source: NASA Exoplanet Archive, pscomppars table (snapshot), fetched 2026-10-30T23:42:50.695Z

## Summary
- **6,451 planets** around **4,847 stars**
- Potentially habitable (PHL-style): **32 conservative**, **46 optimistic**
- Habitable-zone status: hot 5423, cold 406, conservative 193, optimistic 100, unknown 329

## How complete is each field?
| Field | Planets with a value | % |
|---|---|---|
| Radius (`pl_rade`) | 6,401 | 99.2% |
| Mass (`pl_bmasse`) | 6,421 | 99.5% |
| Orbital period (`pl_orbper`) | 6,097 | 94.5% |
| Semi-major axis (`pl_orbsmax`) | 5,956 | 92.3% |
| Insolation (`pl_insol`) | 5,855 | 90.8% |
| Equilibrium temp (`pl_eqt`) | 5,911 | 91.6% |
| Star temperature (`st_teff`) | 6,144 | 95.2% |
| Star luminosity (`st_lum`) | 6,125 | 94.9% |
| Distance (`sy_dist`) | 6,423 | 99.6% |

Missing values are estimated in the app (and labelled "estimated"): radius from mass (Chen & Kipping 2017), orbit size from Kepler's third law, starlight from L/a².

## Physically odd values
- V2376 Ori b: radius 87.20586985 R⊕
- HD 100546 b: radius 77.3421 R⊕

## Famous-planet checklist
Open each NASA link, compare the numbers, and tick the last column (✅ match / ❌ mismatch + note).

| Planet | Radius R⊕ | Mass M⊕ | Period d | Distance ly | ESI | Zone | NASA page | Checked |
|---|---|---|---|---|---|---|---|---|
| Proxima Cen b | 1.02 | 1.05 | 11.185 | 4.24 | 0.85 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/Proxima%20Cen) | ☐ |
| TRAPPIST-1 e | 0.92 | 0.692 | 6.101 | 40.5 | 0.85 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1) | ☐ |
| TRAPPIST-1 f | 1.04 | 1.04 | 9.2075 | 40.5 | 0.68 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1) | ☐ |
| TOI-700 d | 1.15 | 1.58 | 37.423 | 102 | 0.93 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/TOI-700) | ☐ |
| Kepler-452 b | 1.63 | 3.29 | 384.84 | 1800 | 0.83 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-452) | ☐ |
| Kepler-186 f | 1.17 | 1.71 | 129.94 | 579 | 0.62 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/Kepler-186) | ☐ |
| K2-18 b | 2.37 | 8.92 | 32.94 | 124 | 0.71 | optimistic | [open](https://exoplanetarchive.ipac.caltech.edu/overview/K2-18) | ☐ |
| LHS 1140 b | 1.73 | 5.6 | 24.737 | 48.9 | 0.66 | conservative | [open](https://exoplanetarchive.ipac.caltech.edu/overview/LHS%201140) | ☐ |
| 51 Peg b | 14.1 | 194 | 4.2308 | 50.4 | 0.066 | hot | [open](https://exoplanetarchive.ipac.caltech.edu/overview/51%20Peg) | ☐ |
| HD 209458 b | 15.6 | 232 | 3.5247 | 158 | 0.06 | hot | [open](https://exoplanetarchive.ipac.caltech.edu/overview/HD%20209458) | ☐ |

Note: the archive's "composite" table picks the best value per parameter from different papers, so small differences from a single paper on the NASA page are normal. Note any difference larger than about 10%.
