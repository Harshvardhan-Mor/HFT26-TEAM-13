// Visual helpers: colors and the (non-linear) scales used in 3D scenes.
// Real distances span huge ranges, so scenes use compressed scales and say so in the UI.

/** Approximate star color from temperature (blackbody-ish lookup). */
export function starColor(teff) {
  if (teff == null) return '#fff4e0';
  const stops = [
    [2500, '#ff7a3d'], [3500, '#ffa95c'], [4500, '#ffd29a'], [5500, '#fff1d6'],
    [6500, '#f4f6ff'], [8000, '#cfdcff'], [12000, '#a9c1ff'],
  ];
  for (let i = stops.length - 1; i >= 0; i--) if (teff >= stops[i][0]) return stops[i][1];
  return stops[0][1];
}

/** Planet color by type and temperature (artistic, not observed). */
export function planetColor(p) {
  const R = p.hab?.radius?.value ?? 1;
  const T = p.hab?.eqTemp?.value ?? 250;
  if (R > 6) return T > 1000 ? '#e0874f' : '#d9b98a';      // gas giants
  if (R > 2.5) return T > 600 ? '#7fa7c9' : '#6fb7d6';     // Neptune-like
  if (T > 700) return '#c2593a';                            // lava world
  if (T > 320) return '#c79a6b';                            // hot rocky
  if (T > 180) return '#5aa3a0';                            // temperate
  return '#b9d3e8';                                         // icy
}

export const zoneColors = {
  conservative: '#3ddc97', optimistic: '#c6e86b', hot: '#ff7a59', cold: '#7fb2ff', unknown: '#8a93a6',
};

/** Galaxy view: place a star by RA/Dec, with log-compressed distance. */
export function skyPosition(ra, dec, distPc) {
  const r = 10 * Math.log10(1 + distPc);
  const a = (ra * Math.PI) / 180;
  const d = (dec * Math.PI) / 180;
  return [r * Math.cos(d) * Math.cos(a), r * Math.sin(d), -r * Math.cos(d) * Math.sin(a)];
}

/** System view: orbit radius (AU) → scene units, square-root compressed. */
export function orbitScale(au, maxAu) {
  return 3 + 22 * Math.sqrt(au / maxAu);
}

/** Planet sphere size from Earth radii (log-compressed so giants don't swallow the scene). */
export function planetSize(rEarth) {
  return 0.25 + 0.45 * Math.log2(1 + (rEarth ?? 1));
}
