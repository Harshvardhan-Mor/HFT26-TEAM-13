// Loads planet data in this order:
//   1. public/data/exoplanets.json  (snapshot made by `npm run fetch-data`)
//   2. src/data/sample.json         (small offline sample, always available)
// The "Refresh from NASA" button calls /api/nasa for live data.
import sample from '../data/sample.json';
import { habitabilityReport, planetRadius, semiMajorAxis } from './habitability.js';

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

/** Compact, grounded context for the AI (keeps prompts small and factual). */
export function planetContext(p) {
  if (!p) return null;
  const h = p.hab;
  const r = (x, d = 3) => (x == null ? null : Number(x.toPrecision(d)));
  return {
    name: p.pl_name,
    host_star: { name: p.hostname, temp_K: p.st_teff, radius_sun: p.st_rad, mass_sun: p.st_mass, spectral_type: p.st_spectype, distance_parsec: p.sy_dist, distance_light_years: r(p.sy_dist && p.sy_dist * 3.26156) },
    radius_earth: p.pl_rade, radius_estimated_from_mass: p.pl_rade == null ? r(planetRadius(p).value) : undefined,
    mass_earth: p.pl_bmasse, orbital_period_days: p.pl_orbper, semi_major_axis_AU: r(semiMajorAxis(p).value),
    eccentricity: p.pl_orbeccen, discovered: `${p.disc_year ?? '?'} by ${p.discoverymethod ?? '?'} (${p.disc_facility ?? '?'})`,
    planets_in_system: p.sy_pnum,
    habitability_indicators: {
      earth_similarity_index: r(h.esi.value), esi_uses_estimates: h.esi.estimated,
      insolation_earth: r(h.insolation.value), equilibrium_temp_K: r(h.eqTemp.value),
      zone: h.zone.label, size_class: h.sizeClass, phl_style_sample: h.sample,
    },
  };
}
