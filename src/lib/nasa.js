// Shared NASA Exoplanet Archive helpers.
// Used by the browser, the dev server, the Vercel function and scripts/fetch-nasa.mjs,
// so it must not import anything browser- or Node-specific.
//
// Table: pscomppars ("Planetary Systems Composite Parameters"): one row per
// confirmed planet, combining the best available values from several papers.
// Column docs: https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html

export const NASA_TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';

// Every column we use, with its unit (verified against the archive's column docs).
export const COLUMNS = {
  pl_name: 'Planet name',
  hostname: 'Host star name',
  sy_dist: 'Distance from Earth [parsec]',
  sy_pnum: 'Number of planets in system',
  sy_snum: 'Number of stars in system',
  pl_rade: 'Planet radius [Earth radii]',
  pl_bmasse: 'Planet mass or M·sin(i) [Earth masses]',
  pl_dens: 'Planet density [g/cm³]',
  pl_orbper: 'Orbital period [days]',
  pl_orbsmax: 'Semi-major axis [AU]',
  pl_orbeccen: 'Orbital eccentricity',
  pl_eqt: 'Equilibrium temperature [K]',
  pl_insol: 'Insolation flux [Earth = 1]',
  st_teff: 'Star effective temperature [K]',
  st_rad: 'Star radius [Solar radii]',
  st_mass: 'Star mass [Solar masses]',
  st_lum: 'Star luminosity [log10(Solar)]',
  st_spectype: 'Spectral type',
  discoverymethod: 'Discovery method',
  disc_year: 'Discovery year',
  disc_facility: 'Discovery facility',
  ra: 'Right ascension [deg]',
  dec: 'Declination [deg]',
};

const TEXT_COLUMNS = new Set(['pl_name', 'hostname', 'st_spectype', 'discoverymethod', 'disc_facility']);

export function buildQuery() {
  return `select ${Object.keys(COLUMNS).join(',')} from pscomppars`;
}

export function buildQueryUrl() {
  return `${NASA_TAP_URL}?query=${encodeURIComponent(buildQuery())}&format=json`;
}

/** Turn raw archive rows into clean objects (numbers or null, trimmed strings). */
export function normalizeRows(rows) {
  return rows
    .map((row) => {
      const out = {};
      for (const key of Object.keys(COLUMNS)) {
        const v = row[key];
        if (TEXT_COLUMNS.has(key)) {
          out[key] = v == null || v === '' ? null : String(v).trim();
        } else {
          const n = v == null || v === '' ? NaN : Number(v);
          out[key] = Number.isFinite(n) ? n : null;
        }
      }
      return out;
    })
    .filter((p) => p.pl_name && p.hostname);
}

export const NASA_ACKNOWLEDGEMENT =
  'This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program.';
