// Compare view: up to 3 planets next to Earth at TRUE relative size,
// plus a side-by-side table of properties and habitability indicators.
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Label from './Label.jsx';
import { useRef } from 'react';
import PlanetBody from './PlanetBody.jsx';
import Bloom from './Bloom.jsx';
import './graphics.css';
import { fmt } from '../lib/format.js';

const EARTH = { pl_name: 'Earth', hab: { radius: { value: 1 }, eqTemp: { value: 255 } } };

function Body({ planet, x, r }) {
  const ref = useRef();
  useFrame((_, dt) => { ref.current.rotation.y += dt * 0.3; });
  return (
    <group position={[x, 0, 0]}>
      <group ref={ref}><PlanetBody planet={planet} radius={r} /></group>
      <Label position={[0, -r - 0.9, 0]} text={`${planet.pl_name}\n${fmt(planet.hab.radius.value, 2)} × Earth${planet.hab.radius.estimated ? ' (est.)' : ''}`} />
    </group>
  );
}

export default function CompareView({ planets, onRemove, onAskAi }) {
  const bodies = [EARTH, ...planets];
  // Normalise so the largest body has radius 3 scene units; sizes stay proportional.
  const maxR = Math.max(...bodies.map((b) => b.hab.radius.value ?? 1));
  const k = 3 / maxR;
  let x = 0;
  const placed = bodies.map((b) => {
    const r = Math.max((b.hab.radius.value ?? 1) * k, 0.05);
    const pos = x + r;
    x += 2 * r + 1.5;
    return { b, r, pos };
  });
  const offset = x / 2;

  const rows = [
    ['Radius (Earth = 1)', (p) => fmt(p.hab.radius.value, 2) + (p.hab.radius.estimated ? ' est.' : '')],
    ['Mass (Earth = 1)', (p) => fmt(p.pl_bmasse, 3)],
    ['Orbital period (days)', (p) => fmt(p.pl_orbper, 4)],
    ['Insolation (Earth = 1)', (p) => fmt(p.hab.insolation.value, 3)],
    ['Equilibrium temp (K)', (p) => fmt(p.hab.eqTemp.value, 3)],
    ['Earth Similarity Index', (p) => fmt(p.hab.esi.value, 2)],
    ['Zone', (p) => p.hab.zone.label],
    ['Distance (light years)', (p) => fmt(p.sy_dist && p.sy_dist * 3.26156, 4)],
    ['Host star', (p) => `${p.hostname} (${p.st_spectype ?? fmt(p.st_teff, 4) + ' K'})`],
  ];

  if (planets.length === 0) {
    return <div className="empty">Add planets with the “+ Compare” button in the details panel (up to 3).</div>;
  }

  return (
    <div className="compare fade-in">
      <div className="compare-canvas">
        <Canvas camera={{ position: [0, 2, 14], fov: 45 }}>
          <color attach="background" args={['#04060d']} />
          <Stars radius={100} count={1500} factor={2} fade />
          <ambientLight intensity={0.12} />
          <directionalLight position={[-8, 4, 5]} intensity={3} color="#fff4e6" />
          {placed.map(({ b, r, pos }) => <Body key={b.pl_name} planet={b} x={pos - offset} r={r} />)}
          <OrbitControls enableDamping makeDefault />
          <Bloom strength={0.5} radius={0.4} threshold={0.75} />
        </Canvas>
        <p className="hint">Sizes are to scale relative to each other.</p>
      </div>
      <div className="compare-table">
        <table>
          <thead>
            <tr><th />{planets.map((p) => <th key={p.pl_name}>{p.pl_name} <button className="x" onClick={() => onRemove(p.pl_name)} title="Remove">×</button></th>)}</tr>
          </thead>
          <tbody>
            {rows.map(([label, get]) => (
              <tr key={label}><td>{label}</td>{planets.map((p) => <td key={p.pl_name}>{get(p)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <button className="primary" onClick={onAskAi}>✨ Ask Astra to compare these worlds</button>
      </div>
    </div>
  );
}
