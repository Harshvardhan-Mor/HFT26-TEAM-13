// A text label drawn inside the 3D scene (canvas texture on a sprite).
// Stays the same size on screen and needs no DOM nodes or web fonts,
// which avoids React-DOM overlay bugs and works offline.
import { createContext, useContext, useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Global label size multiplier (bigger in presenter mode). */
export const LabelScale = createContext(1);

export default function Label({ text, position = [0, 0, 0], color = '#cfd7ea', border = null, scale = 1 }) {
  const { texture, aspect } = useMemo(() => {
    const lines = String(text).split('\n');
    const font = '600 40px "Space Grotesk", system-ui, sans-serif';
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = font;
    const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 32;
    const h = lines.length * 50 + 16;
    c.width = w; c.height = h;
    ctx.font = font;
    ctx.fillStyle = 'rgba(5,8,18,0.72)';
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, w / 2, 8 + 25 + i * 50));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { texture: t, aspect: w / h };
  }, [text, color, border]);

  useEffect(() => () => texture.dispose(), [texture]);

  const global = useContext(LabelScale);
  const hgt = 0.045 * scale * global * (texture.image.height / 66);
  return (
    <sprite position={position} scale={[hgt * aspect, hgt, 1]} renderOrder={10}>
      <spriteMaterial map={texture} sizeAttenuation={false} depthTest={false} transparent />
    </sprite>
  );
}
