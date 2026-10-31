// Procedural planet surfaces and star glow.
// Planet surfaces are ARTISTIC IMPRESSIONS chosen from each planet's size and
// temperature class. No exoplanet surface has actually been imaged.
//
// Textures use 3D fractal noise sampled on the sphere itself, so there is no seam
// at the date line and no pinching at the poles. Each planet's look is seeded by its
// name, so it is the same on every load.
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Seeded 3D value noise
// ---------------------------------------------------------------------------
function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeNoise(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256).map((_, i) => i);
  let s = seed || 1;
  const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0) / 4294967296;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const val = new Float32Array(256).map(() => rnd());
  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const v = (x, y, z) => val[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];

  function noise(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const fx = fade(x - X), fy = fade(y - Y), fz = fade(z - Z);
    return lerp(
      lerp(lerp(v(X, Y, Z), v(X + 1, Y, Z), fx), lerp(v(X, Y + 1, Z), v(X + 1, Y + 1, Z), fx), fy),
      lerp(lerp(v(X, Y, Z + 1), v(X + 1, Y, Z + 1), fx), lerp(v(X, Y + 1, Z + 1), v(X + 1, Y + 1, Z + 1), fx), fy),
      fz,
    );
  }
  /** Fractal Brownian motion, 0..1. */
  function fbm(x, y, z, octaves = 5) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { sum += amp * noise(x * freq, y * freq, z * freq); norm += amp; amp *= 0.5; freq *= 2.03; }
    return sum / norm;
  }
  /** Ridged noise: sharp creases (mountain ridges, cracks), 0..1. */
  function ridged(x, y, z, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { const n = 1 - Math.abs(noise(x * freq, y * freq, z * freq) * 2 - 1); sum += amp * n * n; norm += amp; amp *= 0.5; freq *= 2.1; }
    return sum / norm;
  }
  return { noise, fbm, ridged, rnd };
}

// ---------------------------------------------------------------------------
// Planet classes and palettes
// ---------------------------------------------------------------------------

/** Planet look class from radius (Earth radii) and equilibrium temperature (K). */
export function planetKind(p) {
  const R = p.hab?.radius?.value ?? 1;
  const T = p.hab?.eqTemp?.value ?? 250;
  if (p.pl_name === 'Earth') return 'earth';
  if (R > 6) return T > 1000 ? 'hotJupiter' : 'gasGiant';
  if (R > 2.5) return 'iceGiant';
  if (T > 700) return 'lava';
  if (T > 320) return 'desert';
  if (T > 180) return 'temperate';
  return 'icy';
}

export const ATMOSPHERE = {
  hotJupiter: '#ff9a5a', gasGiant: '#f3dcb0', iceGiant: '#8fd3ff', temperate: '#7fc4ff',
  earth: '#7fc4ff', desert: '#f0b47a', lava: '#ff5a2a', icy: '#cfe9ff',
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
/** Sample a colour ramp [[pos, '#hex'], ...] at t. */
function ramp(stops, t) {
  t = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
      return mix(hex(c0), hex(c1), (t - p0) / (p1 - p0 || 1));
    }
  }
  return hex(stops[stops.length - 1][1]);
}

const BANDS = {
  hotJupiter: [[0, '#3a160c'], [0.25, '#8c3517'], [0.45, '#d9733a'], [0.6, '#f2b27a'], [0.8, '#a8471f'], [1, '#5a2412']],
  gasGiant:   [[0, '#7a5a3c'], [0.2, '#c9a77c'], [0.4, '#efdfc0'], [0.55, '#b48a60'], [0.75, '#e8d4b0'], [1, '#8c6a48']],
  iceGiant:   [[0, '#2c6a94'], [0.3, '#4f9fcb'], [0.5, '#86c8e6'], [0.7, '#5aa9d4'], [1, '#2f73a0']],
};

// ---------------------------------------------------------------------------
// Texture generation
// ---------------------------------------------------------------------------
const W = 512, H = 256;
const cache = new Map();

function canvasTex(px, srgb = true) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * All maps for one planet: { map, bumpMap, roughnessMap, emissiveMap, clouds }.
 * Missing entries are null. Cached per planet name.
 */
export function planetMaps(name, kind) {
  const key = `${name}|${kind}`;
  if (cache.has(key)) return cache.get(key);
  const seed = hashSeed(name);
  const N = makeNoise(seed);
  const rnd = N.rnd;
  const color = new Uint8ClampedArray(W * H * 4);
  const bump = new Uint8ClampedArray(W * H * 4);
  const rough = new Uint8ClampedArray(W * H * 4);
  const emit = kind === 'lava' ? new Uint8ClampedArray(W * H * 4) : null;
  const cloud = kind === 'temperate' || kind === 'earth' ? new Uint8ClampedArray(W * H * 4) : null;
  const gas = kind in BANDS;

  // Per-planet variety
  const sea = kind === 'earth' ? 0.52 : 0.42 + rnd() * 0.2;      // ocean coverage
  const off = [rnd() * 50, rnd() * 50, rnd() * 50];              // noise offset
  const storms = gas ? Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ({
    lon: rnd() * Math.PI * 2, lat: (rnd() - 0.5) * 1.2, w: 0.18 + rnd() * 0.22, h: 0.07 + rnd() * 0.06,
  })) : [];

  for (let j = 0; j < H; j++) {
    const lat = (0.5 - (j + 0.5) / H) * Math.PI;       // +pi/2 (north) .. -pi/2
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W) * Math.PI * 2;
      const x = cl * Math.cos(lon), y = sl, z = cl * Math.sin(lon);
      const o = (j * W + i) * 4;
      let rgb, height = 0.5, r = 0.9;

      if (gas) {
        // Bands along latitude, bent by turbulence; storms as soft ovals.
        const turb = N.fbm(x * 3 + off[0], y * 3 + off[1], z * 3 + off[2], 4) - 0.5;
        const band = 0.5 + 0.5 * Math.sin(sl * (kind === 'iceGiant' ? 7 : 13) + turb * 3.2 + off[0]);
        const fine = N.fbm(x * 6, y * 40, z * 6, 3);
        rgb = ramp(BANDS[kind], clamp01(band * 0.85 + fine * 0.3 - 0.05));
        for (const s of storms) {
          let dl = Math.abs(lon - s.lon); dl = Math.min(dl, Math.PI * 2 - dl);
          const d = (dl / s.w) ** 2 + ((lat - s.lat) / s.h) ** 2;
          if (d < 1) rgb = mix(rgb, kind === 'hotJupiter' ? [255, 190, 120] : kind === 'iceGiant' ? [30, 70, 120] : [190, 90, 60], (1 - d) * 0.8);
        }
        r = 0.7;
      } else {
        const h = N.fbm(x * 2.2 + off[0], y * 2.2 + off[1], z * 2.2 + off[2], 6);
        const ridge = N.ridged(x * 4 + off[1], y * 4 + off[2], z * 4 + off[0], 4);
        const polar = Math.abs(sl);
        height = h;
        if (kind === 'temperate' || kind === 'earth') {
          if (h < sea) { // ocean: deep to shallow
            rgb = ramp([[0, '#0a1e46'], [0.75, '#123f7a'], [1, '#2f78a8']], h / sea);
            r = 0.5; height = sea;
          } else {
            const t = (h - sea) / (1 - sea);
            rgb = ramp([[0, '#c2b280'], [0.08, '#3f6f2e'], [0.45, '#5b7f3a'], [0.7, '#7a6a48'], [1, '#d8d4cc']], t + ridge * 0.15);
            if (polar > 0.55) rgb = mix(rgb, [150, 140, 90], smooth(0.55, 0.75, polar) * 0.5); // tundra
            r = 0.92;
          }
          const ice = smooth(0.78, 0.9, polar + (h - 0.5) * 0.25);
          rgb = mix(rgb, [240, 246, 250], ice);
          if (ice > 0.5) { r = 0.6; height = Math.max(height, sea + 0.02); }
        } else if (kind === 'desert') {
          rgb = ramp([[0, '#5a3a22'], [0.35, '#9a643a'], [0.6, '#c99460'], [0.85, '#e2bd8a'], [1, '#f1dcb6']], h * 0.8 + ridge * 0.35);
          const crater = N.fbm(x * 9 + 7, y * 9, z * 9, 3);
          if (crater > 0.66) rgb = mix(rgb, [70, 45, 30], smooth(0.66, 0.74, crater) * 0.6);
          r = 0.95; height = h * 0.7 + ridge * 0.3;
        } else if (kind === 'lava') {
          const crack = smooth(0.82, 0.95, ridge);
          rgb = mix(ramp([[0, '#120a08'], [0.6, '#2a1712'], [1, '#4a2a1e']], h), [255, 120, 30], crack * 0.9);
          const e = crack;
          emit[o] = 255 * e; emit[o + 1] = 110 * e; emit[o + 2] = 20 * e; emit[o + 3] = 255;
          r = 0.8; height = h - crack * 0.3;
        } else { // icy
          rgb = ramp([[0, '#9fb8cf'], [0.5, '#d6e4ef'], [1, '#f7fbff']], h);
          const line = smooth(0.86, 0.97, ridge);
          rgb = mix(rgb, [150, 95, 70], line * 0.55); // Europa-like lineae
          r = 0.45; height = h - line * 0.2;
        }
      }

      color[o] = rgb[0]; color[o + 1] = rgb[1]; color[o + 2] = rgb[2]; color[o + 3] = 255;
      const b = clamp01(height) * 255; bump[o] = bump[o + 1] = bump[o + 2] = b; bump[o + 3] = 255;
      rough[o] = rough[o + 1] = rough[o + 2] = r * 255; rough[o + 3] = 255;

      if (cloud) {
        const c = N.fbm(x * 3 + 31, y * 6 + 17, z * 3 + 11, 5);
        const a = smooth(0.5, 0.72, c) * 0.9;
        cloud[o] = cloud[o + 1] = cloud[o + 2] = 255; cloud[o + 3] = a * 255;
      }
    }
  }

  const maps = {
    map: canvasTex(color),
    bumpMap: gas ? null : canvasTex(bump, false),
    roughnessMap: canvasTex(rough, false),
    emissiveMap: emit ? canvasTex(emit) : null,
    clouds: cloud ? canvasTex(cloud) : null,
  };
  cache.set(key, maps);
  return maps;
}

/** Backwards-compatible: just the colour map. */
export function planetTexture(name, kind) {
  return planetMaps(name, kind).map;
}

let glow;
/** Soft radial glow used behind stars (additively blended sprite). */
export function glowTexture() {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  glow = new THREE.CanvasTexture(c);
  return glow;
}
