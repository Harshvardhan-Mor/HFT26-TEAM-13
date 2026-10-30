// System view: the host star, every known planet on its orbit (real eccentricity,
// compressed distances), the habitable zone ring, and orbits animated using real periods.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import Label from './Label.jsx';
import * as THREE from 'three';
import { semiMajorAxis } from '../lib/habitability.js';
import { orbitScale, planetSize, planetColor, starColor } from '../lib/visual.js';

function ellipsePoints(a, e, n = 128) {
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e; // star sits at one focus
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return new THREE.Vector3(a * Math.cos(t) - c, 0, b * Math.sin(t));
  });
}

function Planet({ planet, a, e, simDays, selected, onSelect }) {
  const ref = useRef();
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e;
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const size = planetSize(planet.hab.radius.value);

  useFrame(() => {
    // Uniform angular motion: a simplification of Kepler's second law, period is real.
    const t = phase + (planet.pl_orbper ? (simDays.current / planet.pl_orbper) * Math.PI * 2 : 0);
    ref.current.position.set(a * Math.cos(t) - c, 0, b * Math.sin(t));
    ref.current.rotation.y += 0.01;
  });

  return (
    <group ref={ref}>
      <mesh onClick={(ev) => { ev.stopPropagation(); onSelect(planet.pl_name); }}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={planetColor(planet)} roughness={0.8} metalness={0.1} />
      </mesh>
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 1.6, 48]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
      <Label
        position={[0, size + 0.7, 0]}
        text={planet.pl_name.replace(planet.hostname, '').trim() || planet.pl_name}
        color={selected ? '#ffffff' : '#cfd7ea'}
        border={selected ? '#7c9cff' : null}
        scale={0.8}
      />
    </group>
  );
}

function HzRing({ inner, outer, color, opacity }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[inner, outer, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function Scene({ system, selectedPlanet, onSelectPlanet, speed }) {
  const simDays = useRef(0);
  useFrame((_, dt) => { simDays.current += dt * speed; });

  const star = system.star;
  const hz = star.hab.hz?.au;
  const orbits = system.planets.map((p) => ({ p, au: semiMajorAxis(p).value })).filter((o) => o.au);
  const maxAu = Math.max(...orbits.map((o) => o.au), hz ? hz.earlyMars : 0, 0.05);
  const starSize = 1.2 + Math.min(star.st_rad ?? 1, 10) * 0.6;
  const sc = (au) => orbitScale(au, maxAu);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} color={starColor(star.st_teff)} />
      <mesh>
        <sphereGeometry args={[starSize, 48, 48]} />
        <meshBasicMaterial color={starColor(star.st_teff)} />
      </mesh>
      <mesh>
        <sphereGeometry args={[starSize * 1.25, 48, 48]} />
        <meshBasicMaterial color={starColor(star.st_teff)} transparent opacity={0.15} />
      </mesh>

      {hz && (
        <>
          <HzRing inner={sc(hz.recentVenus)} outer={sc(hz.earlyMars)} color="#c6e86b" opacity={0.07} />
          <HzRing inner={sc(hz.runawayGreenhouse)} outer={sc(hz.maximumGreenhouse)} color="#3ddc97" opacity={0.16} />
        </>
      )}

      {orbits.map(({ p, au }) => {
        const a = sc(au);
        const e = Math.min(p.pl_orbeccen ?? 0, 0.95);
        return (
          <group key={p.pl_name}>
            <Line points={ellipsePoints(a, e)} color={p.pl_name === selectedPlanet ? '#ffffff' : '#3a4a6b'} lineWidth={1} />
            <Planet planet={p} a={a} e={e} simDays={simDays} selected={p.pl_name === selectedPlanet} onSelect={onSelectPlanet} />
          </group>
        );
      })}
    </>
  );
}

export default function SystemView({ system, selectedPlanet, onSelectPlanet, speed }) {
  if (!system) return <div className="empty">Select a star system from the list or the galaxy map.</div>;
  return (
    <Canvas camera={{ position: [0, 28, 38], fov: 50 }}>
      <color attach="background" args={['#04060d']} />
      <Stars radius={150} depth={50} count={3000} factor={3} fade />
      <Scene system={system} selectedPlanet={selectedPlanet} onSelectPlanet={onSelectPlanet} speed={speed} />
      <OrbitControls enableDamping makeDefault />
    </Canvas>
  );
}
