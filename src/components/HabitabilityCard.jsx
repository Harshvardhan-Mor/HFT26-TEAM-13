// Habitability dashboard for one planet. Shows HOW each indicator is computed
// so judges and users can see it is transparent, not a black-box score.
import { fmt } from '../lib/format.js';
import { zoneColors } from '../lib/visual.js';

// Insolation on a log axis from 0.01× to 100× Earth.
const LOG_MIN = -2, LOG_MAX = 2;
const pos = (s) => `${((Math.log10(Math.min(Math.max(s, 10 ** LOG_MIN), 10 ** LOG_MAX)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100}%`;

function InsolationBar({ hab }) {
  const s = hab.hz?.seff;
  const S = hab.insolation.value;
  return (
    <div className="insol">
      <div className="insol-track">
        {/* Higher flux = closer to the star. Axis runs cold (left) → hot (right). */}
        {s && <div className="band opt" style={{ left: pos(s.earlyMars), width: `calc(${pos(s.recentVenus)} - ${pos(s.earlyMars)})` }} />}
        {s && <div className="band cons" style={{ left: pos(s.maximumGreenhouse), width: `calc(${pos(s.runawayGreenhouse)} - ${pos(s.maximumGreenhouse)})` }} />}
        <div className="marker earth" style={{ left: pos(1) }} title="Earth" />
        {S != null && <div className="marker planet" style={{ left: pos(S), background: zoneColors[hab.zone.key] }} />}
      </div>
      <div className="insol-axis"><span>Cold · 0.01×</span><span>Earth 1×</span><span>Hot · 100×</span></div>
    </div>
  );
}

export default function HabitabilityCard({ planet }) {
  const h = planet.hab;
  const esi = h.esi.value;
  return (
    <section className="card hab">
      <h3>Habitability indicators</h3>

      <div className="esi">
        <div className="esi-ring" style={{ '--v': esi ?? 0 }}>
          <span>{esi == null ? '—' : esi.toFixed(2)}</span>
        </div>
        <div>
          <strong>Earth Similarity Index</strong>
          <p className="muted">0 = nothing like Earth, 1 = identical in size and starlight received.{h.esi.estimated ? ' Uses estimated inputs.' : ''}</p>
        </div>
      </div>

      <div className="zone" style={{ borderColor: zoneColors[h.zone.key] }}>
        <strong style={{ color: zoneColors[h.zone.key] }}>{h.zone.label}</strong>
        {h.sample && <span className="badge hz">PHL-style {h.sample} sample</span>}
      </div>

      <InsolationBar hab={h} />
      <p className="muted small">Starlight received: <b>{fmt(h.insolation.value)}× Earth</b>{h.insolation.estimated ? ' (estimated from L/a²)' : ''}. Dark green = conservative habitable zone, light green = optimistic (Kopparapu et al. 2014).{h.hz?.outOfRange ? ' Star temperature is outside the model’s 2600–7200 K range, so treat this as rough.' : ''}</p>

      <ul className="factors">
        {h.factors.map((f) => (
          <li key={f.label} className={f.verdict}>
            <span className="dot" />
            <div><b>{f.label}</b><br /><span className="muted">{f.detail}</span></div>
          </li>
        ))}
      </ul>

      <details className="method">
        <summary>How is this calculated?</summary>
        <ul>
          <li><b>ESI</b> = 1 − √(½[((S−1)/(S+1))² + ((R−1)/(R+1))²]), with S = starlight and R = radius in Earth units (Planetary Habitability Laboratory).</li>
          <li><b>Habitable zone</b> limits use the Kopparapu et al. (2014) polynomial in star temperature, compared against the planet’s insolation.</li>
          <li><b>Missing values</b>: radius from mass via Chen &amp; Kipping (2017); insolation = L/a²; temperature = 278.6 K × S^¼ (zero albedo). These are marked “estimated”.</li>
        </ul>
      </details>
      <p className="caveat">{h.caveat}</p>
    </section>
  );
}
