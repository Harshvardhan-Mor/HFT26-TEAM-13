// Procedural textures for planets and star glow.
// Planet surfaces are ARTISTIC IMPRESSIONS chosen from the planet's size and
// temperature class. No exoplanet surface has actually been imaged.
import * as THREE from 'three';

/** Deterministic pseudo-random generator so a planet always looks the same. */
function rng(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

const PALETTES = {
  hotJupiter: ['#5a2412', '#a8471f', '#e08a4a', '#f2c08a', '#8a3517'],
  gasGiant:   ['#8a6a48', '#c9a77c', '#e8d4b0', '#a4805a', '#f3e6cf'],
  iceGiant:   ['#3d7fa8', '#5aa7cf', '#86c8e6', '#4b93bd', '#a9dcef'],
  lava:       ['#1a0e0b', '#2b1610', '#3a1d14'],
  desert:     ['#9a6a3f', '#c08b5a', '#d8a978', '#7d5534'],
  temperate:  ['#1f4f7a', '#2d6a8f', '#3f7f5a', '#7a8a4a', '#d9e4ea'],
  icy:        ['#cfe0ee', '#e8f1f8', '#a9c3d8', '#ffffff'],
  earth:      ['#1d4f8f', '#2a64a8', '#3e7d3f', '#8a7a4a', '#f4f8fb'],
};

export const ATMOSPHERE = {
  hotJupiter: '#ff9a5a', gasGiant: '#f3dcb0', iceGiant: '#8fd3ff', temperate: '#8fd0ff',
  earth: '#8fd0ff', desert: '#f0c08a', lava: '#ff5a2a', icy: '#dff1ff',
};

const cache = new Map();

export function planetTexture(name, kind) {
  const key = `${name}|${kind}`;
  if (cache.has(key)) return cache.get(key);
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const r = rng(name);
  const pal = PALETTES[kind];
  const pick = () => pal[Math.floor(r() * pal.length)];

  if (kind === 'hotJupiter' || kind === 'gasGiant' || kind === 'iceGiant') {
    // Horizontal cloud bands with gentle wobble.
    let y = 0;
    while (y < H) {
      const h = 4 + r() * (kind === 'iceGiant' ? 30 : 18);
      ctx.fillStyle = pick();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x / 40 + r() * 0.5) * 2);
      ctx.lineTo(W, y + h); ctx.lineTo(0, y + h); ctx.closePath(); ctx.fill();
      y += h;
    }
    if (kind !== 'iceGiant' && r() > 0.4) { // a storm spot
      ctx.globalAlpha = 0.85; ctx.fillStyle = pal[1];
      ctx.beginPath(); ctx.ellipse(W * r(), H * (0.3 + r() * 0.4), 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    // Rocky worlds: base colour plus blotches (continents, craters, ice).
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, W, H);
    const blobs = kind === 'lava' ? 0 : 140;
    for (let i = 0; i < blobs; i++) {
      ctx.globalAlpha = 0.25 + r() * 0.5;
      ctx.fillStyle = pick();
      ctx.beginPath();
      ctx.ellipse(r() * W, r() * H, 6 + r() * 40, 4 + r() * 22, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    if (kind === 'lava') { // glowing cracks
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = r() > 0.5 ? '#ff6a1a' : '#ffb347';
        ctx.beginPath(); let x = r() * W, yy = r() * H; ctx.moveTo(x, yy);
        for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; yy += (r() - 0.5) * 24; ctx.lineTo(x, yy); }
        ctx.stroke();
      }
    }
    if (kind === 'temperate' || kind === 'earth' || kind === 'icy') { // polar caps
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#f4f8fb';
      ctx.fillRect(0, 0, W, 14 + r() * 10); ctx.fillRect(0, H - 14 - r() * 10, W, 24);
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
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
