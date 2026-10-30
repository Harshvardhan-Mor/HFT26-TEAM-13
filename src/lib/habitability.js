// Habitability indicators. Every number here comes from a published, cited method,
// and every result says whether its inputs were measured or estimated.
// These are INDICATORS for comparison, not claims that a planet is habitable or has life.

const T_SUN = 5772; // K, IAU nominal solar effective temperature

// ---------------------------------------------------------------------------
// 1. Habitable zone: Kopparapu et al. (2014), ApJL 787, L29
//    Seff = SeffSun + a·T + b·T² + c·T³ + d·T⁴, with T = Teff − 5780 K
//    Distance (AU) = sqrt(L / Seff). Valid for 2600 K ≤ Teff ≤ 7200 K.
//    Coefficients copied from the authors' hzcalc.py (1 Earth-mass case).
// ---------------------------------------------------------------------------
const HZ_COEFFS = {
  recentVenus:       [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15], // optimistic inner
  runawayGreenhouse: [1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15], // conservative inner
  maximumGreenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16], // conservative outer
  earlyMars:         [0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16], // optimistic outer
};
export const HZ_TEFF_RANGE = [2600, 7200];

export function seff(limit, teff) {
  const [s0, a, b, c, d] = HZ_COEFFS[limit];
  const t = teff - 5780;
  return s0 + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4;
}

/** Stellar luminosity in solar units. Prefer the archive value, else Stefan–Boltzmann. */
export function starLuminosity(p) {
  if (p.st_lum != null) return { value: 10 ** p.st_lum, estimated: false };
  if (p.st_rad != null && p.st_teff != null) {
    return { value: p.st_rad ** 2 * (p.st_teff / T_SUN) ** 4, estimated: true };
  }
  return { value: null, estimated: true };
}

/** Habitable zone for a host star: Seff limits and distances in AU. */
export function habitableZone(p) {
  if (p.st_teff == null) return null;
  const L = starLuminosity(p).value;
  // Formula is only calibrated inside this range, so clamp and flag.
  const teff = Math.min(Math.max(p.st_teff, HZ_TEFF_RANGE[0]), HZ_TEFF_RANGE[1]);
  const outOfRange = teff !== p.st_teff;
  const s = Object.fromEntries(Object.keys(HZ_COEFFS).map((k) => [k, seff(k, teff)]));
  const au = L == null ? null : Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.sqrt(L / v)]));
  return { seff: s, au, outOfRange };
}

// ---------------------------------------------------------------------------
// 2. Planet inputs (measured where possible, estimated otherwise)
// ---------------------------------------------------------------------------

/** Semi-major axis in AU; falls back to Kepler's third law: a³ = M★·P². */
export function semiMajorAxis(p) {
  if (p.pl_orbsmax != null) return { value: p.pl_orbsmax, estimated: false };
  if (p.pl_orbper != null) {
    const mStar = p.st_mass ?? 1;
    return { value: Math.cbrt(mStar * (p.pl_orbper / 365.25) ** 2), estimated: true };
  }
  return { value: null, estimated: true };
}

/** Insolation relative to Earth; falls back to S = L / a². */
export function insolation(p) {
  if (p.pl_insol != null) return { value: p.pl_insol, estimated: false };
  const L = starLuminosity(p).value;
  const a = semiMajorAxis(p).value;
  if (L != null && a) return { value: L / a ** 2, estimated: true };
  return { value: null, estimated: true };
}

/**
 * Radius (Earth radii) from mass (Earth masses) using the probabilistic mass-radius
 * relation of Chen & Kipping (2017), ApJ 834:17, Table 1 (mean relation, continuous):
 *   Terran     M < 2.04 M⊕        R = 1.008 · M^0.279
 *   Neptunian  2.04 M⊕ – 0.414 MJ R ∝ M^0.589
 *   Jovian     > 0.414 MJ         R ∝ M^-0.044
 * Real planets scatter widely around this, so results are always flagged "estimated".
 */
const MJ_IN_ME = 317.83;
const T1 = 2.04, T2 = 0.414 * MJ_IN_ME;
const R_T1 = 1.008 * T1 ** 0.279;
const R_T2 = R_T1 * (T2 / T1) ** 0.589;
export function radiusFromMass(m) {
  if (m < T1) return 1.008 * m ** 0.279;
  if (m < T2) return R_T1 * (m / T1) ** 0.589;
  return R_T2 * (m / T2) ** -0.044;
}

export function planetRadius(p) {
  if (p.pl_rade != null) return { value: p.pl_rade, estimated: false };
  if (p.pl_bmasse != null) return { value: radiusFromMass(p.pl_bmasse), estimated: true };
  return { value: null, estimated: true };
}

/** Equilibrium temperature (K); fallback assumes zero albedo: T = 278.6 K · S^(1/4). */
export function equilibriumTemp(p) {
  if (p.pl_eqt != null) return { value: p.pl_eqt, estimated: false };
  const S = insolation(p).value;
  if (S != null) return { value: 278.6 * S ** 0.25, estimated: true };
  return { value: null, estimated: true };
}

// ---------------------------------------------------------------------------
// 3. Earth Similarity Index, simplified form used by the PHL for exoplanets
//    (Schulze-Makuch et al. 2011, Astrobiology 11:1041; PHL):
//    ESI = 1 − sqrt( ½·[((S−1)/(S+1))² + ((R−1)/(R+1))²] )   with S, R in Earth units
// ---------------------------------------------------------------------------
export function earthSimilarity(p) {
  const S = insolation(p);
  const R = planetRadius(p);
  if (S.value == null || R.value == null) return { value: null, estimated: true };
  const fs = (S.value - 1) / (S.value + 1);
  const fr = (R.value - 1) / (R.value + 1);
  return { value: 1 - Math.sqrt(0.5 * (fs ** 2 + fr ** 2)), estimated: S.estimated || R.estimated };
}

// ---------------------------------------------------------------------------
// 4. Classification
// ---------------------------------------------------------------------------

/** Where the planet sits relative to the Kopparapu limits, using insolation directly. */
export function zoneStatus(p) {
  const hz = habitableZone(p);
  const S = insolation(p).value;
  if (!hz || S == null) return { key: 'unknown', label: 'Unknown (missing star or orbit data)' };
  const { recentVenus, runawayGreenhouse, maximumGreenhouse, earlyMars } = hz.seff;
  if (S <= runawayGreenhouse && S >= maximumGreenhouse) return { key: 'conservative', label: 'Inside conservative habitable zone' };
  if (S <= recentVenus && S >= earlyMars) return { key: 'optimistic', label: 'Inside optimistic habitable zone' };
  if (S > recentVenus) return { key: 'hot', label: 'Too hot: inside the inner edge' };
  return { key: 'cold', label: 'Too cold: beyond the outer edge' };
}

/** Rough size class. The 1.6 R⊕ rocky cut-off follows the PHL Habitable Worlds Catalog. */
export function sizeClass(p) {
  const R = planetRadius(p).value;
  if (R == null) return 'Unknown size';
  if (R < 0.5) return 'Sub-Earth';
  if (R <= 1.6) return 'Earth-size (likely rocky)';
  if (R <= 2.5) return 'Super-Earth / mini-Neptune';
  if (R <= 6) return 'Neptune-like';
  return 'Gas giant';
}

/**
 * PHL Habitable Worlds Catalog-style sample (https://phl.upr.edu/hwc):
 * conservative: 0.5 < R ≤ 1.6 R⊕ or 0.1 < M ≤ 3 M⊕; optimistic: R ≤ 2.5 R⊕ or M ≤ 10 M⊕,
 * and in the optimistic habitable zone. This is an approximation of their method.
 */
export function phlSample(p) {
  const zone = zoneStatus(p).key;
  if (zone !== 'conservative' && zone !== 'optimistic') return null;
  const R = p.pl_rade;
  const M = p.pl_bmasse;
  const inRange = (v, lo, hi) => v != null && v > lo && v <= hi;
  if (inRange(R, 0.5, 1.6) || (R == null && inRange(M, 0.1, 3))) return 'conservative';
  if (inRange(R, 1.6, 2.5) || (R == null && inRange(M, 3, 10))) return 'optimistic';
  return null;
}

/** Full, transparent report used by the dashboard and passed to the AI astronomer. */
export function habitabilityReport(p) {
  const S = insolation(p);
  const R = planetRadius(p);
  const T = equilibriumTemp(p);
  const esi = earthSimilarity(p);
  const zone = zoneStatus(p);
  const hz = habitableZone(p);
  const sample = phlSample(p);

  const factors = [];
  const add = (label, verdict, detail) => factors.push({ label, verdict, detail });

  add('Habitable zone', zone.key === 'conservative' ? 'good' : zone.key === 'optimistic' ? 'ok' : zone.key === 'unknown' ? 'unknown' : 'bad', zone.label);
  add('Size', R.value == null ? 'unknown' : R.value <= 1.6 && R.value > 0.5 ? 'good' : R.value <= 2.5 ? 'ok' : 'bad', sizeClass(p));
  if (T.value != null) {
    add('Equilibrium temperature', T.value >= 180 && T.value <= 310 ? 'good' : T.value >= 150 && T.value <= 350 ? 'ok' : 'bad',
      `${Math.round(T.value)} K${T.estimated ? ' (estimated, zero albedo)' : ''}. Earth's is about 255 K; surface temperature also depends on the atmosphere.`);
  }
  if (p.pl_orbeccen != null) {
    add('Orbit shape', p.pl_orbeccen < 0.2 ? 'good' : p.pl_orbeccen < 0.4 ? 'ok' : 'bad',
      `Eccentricity ${p.pl_orbeccen.toFixed(2)}${p.pl_orbeccen >= 0.2 ? ': large seasonal swings in heating' : ': fairly circular'}`);
  }
  if (p.st_teff != null && p.st_teff < 3900) {
    add('Host star', 'ok', 'Red dwarf (M-type): planets in its habitable zone are likely tidally locked and exposed to strong flares.');
  }

  return {
    esi, insolation: S, radius: R, eqTemp: T, zone, hz, sample,
    sizeClass: sizeClass(p),
    factors,
    caveat: 'Indicators only. No exoplanet is known to be habitable; atmospheres, water and surface conditions are mostly unmeasured.',
  };
}
