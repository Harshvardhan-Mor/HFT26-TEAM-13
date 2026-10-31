// Galaxy view: every host star placed by its real sky position (RA/Dec)
// and distance from Earth (log-compressed). Click a star to open its system.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Label from './Label.jsx';
import * as THREE from 'three';
import { skyPosition, starColor } from '../lib/visual.js';
import { StarGlow } from './PlanetBody.jsx';
import CameraFlyIn from './CameraFlyIn.jsx';
import './GalaxyView.css';
import './graphics.css';
import Bloom from './Bloom.jsx';

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

/** Year each system's first planet was discovered (null if unknown). */
const firstYear = (s) => {
  const ys = s.planets.map((p) => p.disc_year).filter(Boolean);
  return ys.length ? Math.min(...ys) : null;
};

/**
 * Smoothly moves the camera to look at `fly.pos`, then calls fly.done().
 * Used when a star is clicked, so the user "travels" to it before the system opens.
 */
function FlyTo({ fly }) {
  const { camera, controls } = useThree();
  const anim = useRef(null);
  useEffect(() => {
    if (!fly || !controls) return;
    const target = new THREE.Vector3(...fly.pos);
    // End 8 units from the star, on the side the camera is already looking from.
    const dir = camera.position.clone().sub(target).normalize();
    anim.current = {
      t: 0,
      fromPos: camera.position.clone(), toPos: target.clone().add(dir.multiplyScalar(8)),
      fromTarget: controls.target.clone(), toTarget: target,
    };
    controls.autoRotate = false;
  }, [fly, camera, controls]);
  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(a.t + dt / 1.1, 1);
    const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2; // ease in-out
    camera.position.lerpVectors(a.fromPos, a.toPos, k);
    controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
    controls.update();
    if (a.t >= 1) { anim.current = null; fly.done(); }
  });
  return null;
}

function StarField({ systems, selected, onSelect, habitableOnly, year, onFly }) {
  const [hover, setHover] = useState(null);
  const dot = useMemo(makeDot, []);

  const list = useMemo(
    () => [...systems.values()].filter((s) => s.star.ra != null && s.star.dec != null && s.star.sy_dist != null
      && (!habitableOnly || s.hasHz)
      && (year == null || (firstYear(s) ?? Infinity) <= year)),
    [systems, habitableOnly, year],
  );

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(list.length * 3);
    const colors = new Float32Array(list.length * 3);
    const c = new THREE.Color();
    list.forEach((s, i) => {
      positions.set(skyPosition(s.star.ra, s.star.dec, s.star.sy_dist), i * 3);
      // Gold = discovered in the year currently shown on the timeline.
      c.set(year != null && firstYear(s) === year ? '#ffd36b' : s.hasHz ? '#3ddc97' : starColor(s.star.st_teff));
      colors.set([c.r, c.g, c.b], i * 3);
    });
    return { positions, colors };
  }, [list, year]);

  const sel = selected ? systems.get(selected) : null;
  const selPos = sel && sel.star.sy_dist != null ? skyPosition(sel.star.ra, sel.star.dec, sel.star.sy_dist) : null;
  const hov = hover != null ? list[hover] : null;

  return (
    <>
      <points
        key={`${list.length}-${year}`}
        onPointerMove={(e) => { e.stopPropagation(); setHover(e.index); }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          const s = list[e.index];
          onFly({ pos: skyPosition(s.star.ra, s.star.dec, s.star.sy_dist), done: () => onSelect(s.hostname) });
        }}
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

/** Timeline slider: replay 30+ years of discoveries. */
function Timeline({ years, year, setYear, count }) {
  const [playing, setPlaying] = useState(false);
  const [min, max] = years;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setYear((y) => {
        const next = (y ?? min - 1) + 1;
        if (next >= max) { setPlaying(false); return max; }
        return next;
      });
    }, 450);
    return () => clearInterval(id);
  }, [playing, min, max, setYear]);

  const play = () => { if (year == null || year >= max) setYear(min); setPlaying(!playing); };
  return (
    <div className="timeline" role="group" aria-label="Discovery timeline">
      <button className="tl-play" onClick={play} aria-label={playing ? 'Pause' : 'Play discovery timeline'}>{playing ? '⏸' : '▶'}</button>
      <div className="tl-main">
        <div className="tl-text">
          {year == null
            ? <><b>All years</b> · press ▶ to replay {max - min + 1} years of discoveries</>
            : <><b>{year}</b> · {count.toLocaleString()} systems known · <span className="tl-gold">●</span> new this year</>}
        </div>
        <input type="range" min={min} max={max} value={year ?? max}
          onChange={(e) => { setPlaying(false); setYear(Number(e.target.value)); }} aria-label="Discovery year" />
      </div>
      {year != null && <button className="tl-all" onClick={() => { setPlaying(false); setYear(null); }}>All</button>}
    </div>
  );
}

export default function GalaxyView(props) {
  const [year, setYear] = useState(null);
  const [fly, setFly] = useState(null);
  const years = useMemo(() => {
    const ys = [...props.systems.values()].map(firstYear).filter(Boolean);
    return [Math.min(...ys), Math.max(...ys)];
  }, [props.systems]);
  const count = useMemo(
    () => (year == null ? 0 : [...props.systems.values()].filter((s) => (firstYear(s) ?? Infinity) <= year).length),
    [props.systems, year],
  );

  return (
    <div className="galaxy-wrap fade-in">
    <Timeline years={years} year={year} setYear={setYear} count={count} />
    <Canvas
      camera={{ position: [0, 25, 55], fov: 55 }}
      onCreated={({ raycaster }) => { raycaster.params.Points.threshold = 0.4; }}
    >
      <color attach="background" args={['#04060d']} />
      <Stars radius={200} depth={60} count={4000} factor={3} fade />
      <gridHelper args={[80, 16, '#1b2540', '#111a2e']} />
      <StarField {...props} year={year} onFly={setFly} />
      <FlyTo fly={fly} />
      <OrbitControls enableDamping makeDefault autoRotate autoRotateSpeed={0.25} maxDistance={160} />
      <CameraFlyIn trigger="galaxy" from={[0, 90, 150]} to={[0, 25, 55]} duration={2.4} />
      <Bloom strength={0.55} radius={0.45} threshold={0.72} />
    </Canvas>
    </div>
  );
}
