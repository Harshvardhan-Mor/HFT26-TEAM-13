// System view: the host star, every known planet on its orbit (real eccentricity,
// compressed distances), the habitable zone ring, and orbits animated using real periods.
// Graphics: bloom glow, animated star surface, orbit trails, hover highlight,
// and a camera that follows the planet you click (drag to break free, click the star to zoom out).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Trail } from '@react-three/drei';
import Label from './Label.jsx';
import * as THREE from 'three';
import { semiMajorAxis } from '../lib/habitability.js';
import { orbitScale, planetSize, starColor } from '../lib/visual.js';
import { fmt } from '../lib/format.js';
import PlanetBody, { StarGlow } from './PlanetBody.jsx';
import CameraFlyIn from './CameraFlyIn.jsx';
import Bloom from './Bloom.jsx';
import './graphics.css';

function ellipsePoints(a, e, n = 128) {
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e; // star sits at one focus
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return new THREE.Vector3(a * Math.cos(t) - c, 0, b * Math.sin(t));
  });
}

/** Granulated star surface: a noisy canvas texture, brighter in the middle. */
function useStarTexture(color) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * 512, y = Math.random() * 256, r = 1 + Math.random() * 5;
      ctx.globalAlpha = 0.08 + Math.random() * 0.18;
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [color]);
}

function Star({ star, size, onClick }) {
  const color = starColor(star.st_teff);
  const map = useStarTexture(color);
  const body = useRef();
  const glow = useRef();
  useFrame(({ clock }) => {
    body.current.rotation.y += 0.0015;
    // Gentle "breathing" of the corona.
    const s = 1 + Math.sin(clock.elapsedTime * 1.3) * 0.04 + Math.sin(clock.elapsedTime * 3.1) * 0.015;
    glow.current.scale.setScalar(s);
  });
  return (
    <group>
      <mesh ref={body} onClick={onClick}>
        <sphereGeometry args={[size, 64, 64]} />
        <meshBasicMaterial map={map} color={new THREE.Color(color).multiplyScalar(1.6)} />
      </mesh>
      <group ref={glow}><StarGlow color={color} size={size * 7} /></group>
      <StarGlow color={color} size={size * 16} />
    </group>
  );
}

function Planet({ planet, a, e, simDays, selected, onSelect, registerRef }) {
  const ref = useRef();
  const spin = useRef();
  const [hover, setHover] = useState(false);
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e;
  // Starting angle derived from the name, so every load (and every demo) looks the same.
  const phase = useMemo(() => {
    let h = 2166136261; // FNV-1a, then a final mix so near-identical names spread out
    for (const ch of planet.pl_name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
    return ((h >>> 0) / 4294967296) * Math.PI * 2;
  }, [planet.pl_name]);
  const size = planetSize(planet.hab.radius.value);

  useEffect(() => { registerRef(planet.pl_name, ref.current); return () => registerRef(planet.pl_name, null); }, [planet.pl_name, registerRef]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame(() => {
    // Uniform angular motion: a simplification of Kepler's second law, period is real.
    const t = phase + (planet.pl_orbper ? (simDays.current / planet.pl_orbper) * Math.PI * 2 : 0);
    ref.current.position.set(a * Math.cos(t) - c, 0, b * Math.sin(t));
    spin.current.rotation.y += 0.004;
    const target = hover || selected ? 1.18 : 1;
    spin.current.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
  });

  const short = planet.pl_name.replace(planet.hostname, '').trim() || planet.pl_name;
  return (
    <Trail width={size * 1.2} length={5} decay={1.2} color={selected ? '#cfd8ff' : '#7c9cff'} attenuation={(w) => w * w}>
      <group ref={ref}>
        <group
          ref={spin}
          onPointerOver={(ev) => { ev.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
        >
          <PlanetBody planet={planet} radius={size} onClick={(ev) => { ev.stopPropagation(); onSelect(planet.pl_name); }} />
        </group>
        {selected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 1.5, size * 1.65, 64]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
        <Label
          position={[0, size + 0.8, 0]}
          text={hover && !selected ? `${short} · ${fmt(planet.hab.radius.value, 2)}× Earth · ${fmt(planet.pl_orbper, 3)} d` : short}
          color={selected || hover ? '#ffffff' : '#cfd7ea'}
          border={selected ? '#7c9cff' : null}
          scale={0.8}
        />
      </group>
    </Trail>
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

/**
 * Follow-cam: after the user picks a planet, the orbit target glides to it and then rides
 * along its orbit, keeping the same viewing angle. Dragging the view breaks free.
 */
function FollowCam({ follow, planetRefs, overview }) {
  const { camera, controls } = useThree();
  const active = useRef(false);
  const zoomT = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!controls) return;
    active.current = !!follow || overview > 0;
    zoomT.current = 0;
    const stop = () => { active.current = false; };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [follow, overview, controls]);

  useFrame((_, dt) => {
    if (!controls || !active.current) return;
    const obj = follow ? planetRefs.current.get(follow) : null;
    const goal = obj ? obj.getWorldPosition(tmp) : tmp.set(0, 0, 0);
    // Keep the camera's offset from the target, but ease its length towards a close-up.
    offset.copy(camera.position).sub(controls.target);
    zoomT.current = Math.min(zoomT.current + dt / 1.4, 1);
    const want = obj ? 9 : 45;
    const len = THREE.MathUtils.lerp(offset.length(), want, zoomT.current < 1 ? 0.06 : 0.02);
    offset.setLength(len);
    controls.target.lerp(goal, obj ? 0.12 : 0.06);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    if (!obj && zoomT.current >= 1 && controls.target.length() < 0.05) active.current = false;
  });
  return null;
}

function Scene({ system, selectedPlanet, onSelectPlanet, speed, follow, setFollow, overview, setOverview }) {
  const simDays = useRef(0);
  useFrame((_, dt) => { simDays.current += dt * speed; });
  const planetRefs = useRef(new Map());
  const registerRef = useMemo(() => (name, obj) => {
    if (obj) planetRefs.current.set(name, obj); else planetRefs.current.delete(name);
  }, []);

  const star = system.star;
  const hz = star.hab.hz?.au;
  const orbits = system.planets.map((p) => ({ p, au: semiMajorAxis(p).value })).filter((o) => o.au);
  const maxAu = Math.max(...orbits.map((o) => o.au), hz ? hz.earlyMars : 0, 0.05);
  const starSize = 1.2 + Math.min(star.st_rad ?? 1, 10) * 0.6;
  const sc = (au) => orbitScale(au, maxAu);

  const pick = (name) => { onSelectPlanet(name); setFollow(name); };

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} color={starColor(star.st_teff)} />
      <Star star={star} size={starSize} onClick={(ev) => { ev.stopPropagation(); setFollow(null); setOverview((n) => n + 1); }} />

      {hz && (
        <>
          <HzRing inner={sc(hz.recentVenus)} outer={sc(hz.earlyMars)} color="#c6e86b" opacity={0.012} />
          <HzRing inner={sc(hz.runawayGreenhouse)} outer={sc(hz.maximumGreenhouse)} color="#3ddc97" opacity={0.03} />
        </>
      )}

      {orbits.map(({ p, au }) => {
        const a = sc(au);
        const e = Math.min(p.pl_orbeccen ?? 0, 0.95);
        return (
          <group key={p.pl_name}>
            <Line points={ellipsePoints(a, e)} color={p.pl_name === selectedPlanet ? '#ffffff' : '#3a4a6b'} lineWidth={1} transparent opacity={p.pl_name === selectedPlanet ? 0.9 : 0.6} />
            <Planet planet={p} a={a} e={e} simDays={simDays} selected={p.pl_name === selectedPlanet} onSelect={pick} registerRef={registerRef} />
          </group>
        );
      })}
      <FollowCam follow={follow} planetRefs={planetRefs} overview={overview} />
    </>
  );
}

export default function SystemView({ system, selectedPlanet, onSelectPlanet, speed }) {
  const [follow, setFollow] = useState(null);
  const [overview, setOverview] = useState(0);
  // New system: start from the overview fly-in, not following anything.
  useEffect(() => { setFollow(null); }, [system?.hostname]);

  if (!system) return <div className="empty">Select a star system from the list or the galaxy map.</div>;
  return (
    <div className="scene-wrap fade-in" key={system.hostname}>
      <Canvas camera={{ position: [0, 28, 38], fov: 50 }} gl={{ antialias: true }}>
        <color attach="background" args={['#03050b']} />
        <fog attach="fog" args={['#03050b', 90, 220]} />
        <Stars radius={150} depth={50} count={3500} factor={3} fade speed={0.6} />
        <Scene system={system} selectedPlanet={selectedPlanet} onSelectPlanet={onSelectPlanet} speed={speed}
          follow={follow} setFollow={setFollow} overview={overview} setOverview={setOverview} />
        <OrbitControls enableDamping makeDefault maxDistance={140} minDistance={3} />
        <CameraFlyIn trigger={system.hostname} from={[0, 70, 110]} to={[0, 26, 40]} />
        <Bloom strength={0.8} radius={0.5} threshold={0.82} />
      </Canvas>
      {follow && <div className="follow-chip">Following <b>{follow}</b> · drag to look around · click the star to zoom out</div>}
    </div>
  );
}
