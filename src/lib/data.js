// Loads planet data in this order:
//   1. public/data/exoplanets.json  (snapshot made by `npm run fetch-data`)
//   2. src/data/sample.json         (small offline sample, always available)
// The "Refresh from NASA" button calls /api/nasa for live data.
import sample from '../data/sample.json';
import { habitabilityReport, semiMajorAxis } from './habitability.js';

export async function loadSnapshot() {
  try {
    const res = await fetch('/data/exoplanets.json');
    if (res.ok && res.headers.get('content-type')?.includes('json')) return prepare(await res.json());
  } catch { /* fall through */ }
  return prepare(sample);
}

export async function loadLive() {
  const res = await fetch('/api/nasa');
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Live fetch failed');
  return prepare(json);
}

/** Adds computed habitability and groups planets into systems by host star. */
export function prepare({ meta, planets }) {
  const enriched = planets.map((p) => ({ ...p, hab: habitabilityReport(p) }));
  const systems = new Map();
  for (const p of enriched) {
    if (!systems.has(p.hostname)) systems.set(p.hostname, { hostname: p.hostname, planets: [], star: p });
    systems.get(p.hostname).planets.push(p);
  }
  for (const s of systems.values()) {
    s.planets.sort((a, b) => (semiMajorAxis(a).value ?? 0) - (semiMajorAxis(b).value ?? 0));
    s.bestEsi = Math.max(...s.planets.map((p) => p.hab.esi.value ?? 0));
    s.hasHz = s.planets.some((p) => p.hab.sample);
  }
  return { meta, planets: enriched, systems };
}

// Re-exported so existing imports keep working.
export { planetContext } from './context.js';
