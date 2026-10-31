// Builds the compact, grounded data block sent to Astra with every question.
// Kept free of JSON imports so Node scripts (scripts/test-models.mjs) can use it too.
import { planetRadius, semiMajorAxis } from './habitability.js';

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
