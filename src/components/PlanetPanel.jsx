// Right panel: properties of the selected planet + its habitability dashboard.
import HabitabilityCard from './HabitabilityCard.jsx';
import TravelCard from './TravelCard.jsx';
import { fmt } from '../lib/format.js';
import { semiMajorAxis } from '../lib/habitability.js';

function Prop({ label, value, unit, note }) {
  return (
    <div className="prop">
      <span className="muted">{label}</span>
      <b>{value}{value !== '—' && unit ? ` ${unit}` : ''}</b>
      {note && <small className="muted">{note}</small>}
    </div>
  );
}

export default function PlanetPanel({ system, planet, onSelectPlanet, onCompare, compareNames, onAsk }) {
  if (!system) return <div className="panel-empty">Pick a star system to see its planets.</div>;
  const p = planet ?? system.planets[0];
  const a = semiMajorAxis(p);
  const inCompare = compareNames.includes(p.pl_name);

  return (
    <div className="panel-body">
      <div className="chips">
        {system.planets.map((x) => (
          <button key={x.pl_name} className={`chip ${x.pl_name === p.pl_name ? 'active' : ''}`} onClick={() => onSelectPlanet(x.pl_name)}>
            {x.pl_name}
          </button>
        ))}
      </div>

      <h2>{p.pl_name}</h2>
      <p className="muted">
        Orbits {p.hostname}{p.st_spectype ? ` (${p.st_spectype})` : ''} · discovered {p.disc_year ?? '?'} by {p.discoverymethod ?? 'unknown method'}
        {p.disc_facility ? ` · ${p.disc_facility}` : ''}
      </p>

      <div className="actions">
        <button className="primary" onClick={() => onAsk(`Explain ${p.pl_name} to me like I'm a student. What makes it interesting, and could it be habitable?`)}>✨ Ask Astra</button>
        <button onClick={() => onCompare(p)} disabled={inCompare || compareNames.length >= 3}>{inCompare ? '✓ In compare' : '+ Compare'}</button>
      </div>

      <section className="card props">
        <Prop label="Radius" value={fmt(p.pl_rade)} unit="× Earth" note={p.pl_rade == null && p.hab.radius.value ? `≈ ${fmt(p.hab.radius.value, 2)} estimated from mass` : null} />
        <Prop label="Mass" value={fmt(p.pl_bmasse)} unit="× Earth" note={p.discoverymethod === 'Radial Velocity' ? 'may be a minimum (M·sin i)' : null} />
        <Prop label="Orbital period" value={fmt(p.pl_orbper, 4)} unit="days" />
        <Prop label="Distance from star" value={fmt(a.value)} unit="AU" note={a.estimated && a.value ? "estimated via Kepler's 3rd law" : null} />
        <Prop label="Distance from Earth" value={fmt(p.sy_dist && p.sy_dist * 3.26156, 4)} unit="light years" />
        <Prop label="Eccentricity" value={fmt(p.pl_orbeccen, 2)} />
        <Prop label="Equilibrium temp." value={fmt(p.hab.eqTemp.value)} unit="K" note={p.hab.eqTemp.estimated && p.hab.eqTemp.value ? 'estimated' : null} />
        <Prop label="Density" value={fmt(p.pl_dens)} unit="g/cm³" />
        <Prop label="Star temperature" value={fmt(p.st_teff, 4)} unit="K" />
        <Prop label="Star radius" value={fmt(p.st_rad)} unit="× Sun" />
      </section>

      <HabitabilityCard planet={p} />
       <TravelCard distancePc={p.sy_dist} />
    </div>
  );
}
