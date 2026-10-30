// Galaxy view: every host star placed by its real sky position (RA/Dec)
// and distance from Earth (log-compressed). Click a star to open its system.
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Label from './Label.jsx';
import * as THREE from 'three';
import { skyPosition, starColor } from '../lib/visual.js';
import { StarGlow } from './PlanetBody.jsx';
import CameraFlyIn from './CameraFlyIn.jsx';

// Soft round dot texture so stars aren't drawn as squares.
function makeDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d').createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  const ctx = c.getContext('2d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function StarField({ systems, selected, onSelect, habitableOnly }) {
  const [hover, setHover] = useState(null);
  const dot = useMemo(makeDot, []);

  const list = useMemo(
    () => [...systems.values()].filter((s) => s.star.ra != null && s.star.dec != null && s.star.sy_dist != null && (!habitableOnly || s.hasHz)),
    [systems, habitableOnly],
  );

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(list.length * 3);
    const colors = new Float32Array(list.length * 3);
    const c = new THREE.Color();
    list.forEach((s, i) => {
      positions.set(skyPosition(s.star.ra, s.star.dec, s.star.sy_dist), i * 3);
      c.set(s.hasHz ? '#3ddc97' : starColor(s.star.st_teff));
      colors.set([c.r, c.g, c.b], i * 3);
    });
    return { positions, colors };
  }, [list]);

  const sel = selected ? systems.get(selected) : null;
  const selPos = sel && sel.star.sy_dist != null ? skyPosition(sel.star.ra, sel.star.dec, sel.star.sy_dist) : null;
  const hov = hover != null ? list[hover] : null;

  return (
    <>
      <points
        key={list.length}
        onPointerMove={(e) => { e.stopPropagation(); setHover(e.index); }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect(list[e.index].hostname); }}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.6} map={dot} vertexColors sizeAttenuation transparent depthWrite={false} alphaTest={0.05} />
      </points>

      {/* Our Sun at the centre */}
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#ffd36b" />
        <StarGlow color="#ffd36b" size={4} />
        <Label text="Sun · you are here" position={[0, 1.1, 0]} color="#ffd36b" />
      </mesh>

      {hov && (
        <Label
          position={skyPosition(hov.star.ra, hov.star.dec, hov.star.sy_dist).map((v, i) => (i === 1 ? v + 1 : v))}
          text={`${hov.hostname} · ${hov.planets.length} planet${hov.planets.length > 1 ? 's' : ''} · ${(hov.star.sy_dist * 3.26156).toFixed(0)} ly`}
          color="#ffffff"
        />
      )}

      {selPos && (
        <mesh position={selPos}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
          <Label text={sel.hostname} position={[0, 1.4, 0]} color="#ffffff" border="#7c9cff" />
        </mesh>
      )}
    </>
  );
}

export default function GalaxyView(props) {
  return (
    <Canvas
      camera={{ position: [0, 25, 55], fov: 55 }}
      onCreated={({ raycaster }) => { raycaster.params.Points.threshold = 0.4; }}
    >
      <color attach="background" args={['#04060d']} />
      <Stars radius={200} depth={60} count={4000} factor={3} fade />
      <gridHelper args={[80, 16, '#1b2540', '#111a2e']} />
      <StarField {...props} />
      <OrbitControls enableDamping makeDefault autoRotate autoRotateSpeed={0.25} maxDistance={160} />
      <CameraFlyIn trigger="galaxy" from={[0, 90, 150]} to={[0, 25, 55]} duration={2.4} />
    </Canvas>
  );
}
