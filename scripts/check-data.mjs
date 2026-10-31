// Data health check: how complete is the NASA snapshot, and do famous planets look right?
//
//   node scripts/check-data.mjs
//
// Writes docs/data-check.md with summary stats and a checklist of famous planets,
// each with a link to its official NASA Exoplanet Archive page for manual comparison.
import { readFile, writeFile } from 'node:fs/promises';
import { habitabilityReport } from '../src/lib/habitability.js';

const load = async (rel) => JSON.parse(await readFile(new URL(rel, import.meta.url), 'utf8'));
let data;
try { data = await load('../public/data/exoplanets.json'); }
catch { data = await load('../src/data/sample.json'); console.warn('⚠️  No NASA snapshot found, checking the offline sample. Run `npm run fetch-data` first.'); }

const planets = data.planets.map((p) => ({ ...p, hab: habitabilityReport(p) }));
const n = planets.length;
const pct = (k) => `${((100 * k) / n).toFixed(1)}%`;
const has = (field) => planets.filter((p) => p[field] != null).length;
const hosts = new Set(planets.map((p) => p.hostname)).size;

const fields = [
  ['pl_rade', 'Radius'], ['pl_bmasse', 'Mass'], ['pl_orbper', 'Orbital period'], ['pl_orbsmax', 'Semi-major axis'],
  ['pl_insol', 'Insolation'], ['pl_eqt', 'Equilibrium temp'], ['st_teff', 'Star temperature'], ['st_lum', 'Star luminosity'], ['sy_dist', 'Distance'],
];
const zones = {};
for (const p of planets) zones[p.hab.zone.key] = (zones[p.hab.zone.key] || 0) + 1;
const cons = planets.filter((p) => p.hab.sample === 'conservative').length;
const opt = planets.filter((p) => p.hab.sample === 'optimistic').length;

// Sanity checks: values that are physically odd usually mean a data or unit problem.
const odd = [
  ...planets.filter((p) => p.pl_rade != null && (p.pl_rade <= 0 || p.pl_rade > 40)).map((p) => `${p.pl_name}: radius ${p.pl_rade} R⊕`),
  ...planets.filter((p) => p.pl_orbper != null && p.pl_orbper <= 0).map((p) => `${p.pl_name}: period ${p.pl_orbper} d`),
  ...planets.filter((p) => p.sy_dist != null && (p.sy_dist <= 0 || p.sy_dist > 30000)).map((p) => `${p.pl_name}: distance ${p.sy_dist} pc`),
  ...planets.filter((p) => p.pl_orbeccen != null && (p.pl_orbeccen < 0 || p.pl_orbeccen >= 1)).map((p) => `${p.pl_name}: eccentricity ${p.pl_orbeccen}`),
];

const FAMOUS = ['Proxima Cen b', 'TRAPPIST-1 e', 'TRAPPIST-1 f', 'TOI-700 d', 'Kepler-452 b', 'Kepler-186 f', 'K2-18 b', 'LHS 1140 b', '51 Peg b', 'HD 209458 b'];
const f = (v, d = 3) => (v == null ? '—' : Number(v.toPrecision(d)));
const link = (host) => `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(host)}`;

let md = `# Data check (${new Date().toISOString().slice(0, 10)})

Source: ${data.meta?.source ?? 'unknown'}${data.meta?.fetchedAt ? `, fetched ${data.meta.fetchedAt}` : ''}

## Summary
- **${n.toLocaleString()} planets** around **${hosts.toLocaleString()} stars**
- Potentially habitable (PHL-style): **${cons} conservative**, **${opt} optimistic**
- Habitable-zone status: ${Object.entries(zones).map(([k, v]) => `${k} ${v}`).join(', ')}

## How complete is each field?
| Field | Planets with a value | % |
|---|---|---|
${fields.map(([k, label]) => `| ${label} (\`${k}\`) | ${has(k).toLocaleString()} | ${pct(has(k))} |`).join('\n')}

Missing values are estimated in the app (and labelled "estimated"): radius from mass (Chen & Kipping 2017), orbit size from Kepler's third law, starlight from L/a².

## Physically odd values
${odd.length ? odd.slice(0, 30).map((o) => `- ${o}`).join('\n') : 'None found ✅'}

## Famous-planet checklist
Open each NASA link, compare the numbers, and tick the last column (✅ match / ❌ mismatch + note).

| Planet | Radius R⊕ | Mass M⊕ | Period d | Distance ly | ESI | Zone | NASA page | Checked |
|---|---|---|---|---|---|---|---|---|
${FAMOUS.map((name) => {
  const p = planets.find((x) => x.pl_name === name);
  if (!p) return `| ${name} | not in data | | | | | | | |`;
  return `| ${name} | ${f(p.pl_rade)} | ${f(p.pl_bmasse)} | ${f(p.pl_orbper, 5)} | ${f(p.sy_dist && p.sy_dist * 3.26156)} | ${f(p.hab.esi.value, 2)} | ${p.hab.zone.key} | [open](${link(p.hostname)}) | ☐ |`;
}).join('\n')}

Note: the archive's "composite" table picks the best value per parameter from different papers, so small differences from a single paper on the NASA page are normal. Note any difference larger than about 10%.
`;
await writeFile(new URL('../docs/data-check.md', import.meta.url), md);
console.log(md.split('## Famous')[0]);
console.log('Saved docs/data-check.md. Open it and work through the famous-planet checklist.');
