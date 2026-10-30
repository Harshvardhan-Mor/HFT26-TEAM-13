import { useEffect, useMemo, useState } from 'react';
import GalaxyView from './components/GalaxyView.jsx';
import SystemView from './components/SystemView.jsx';
import CompareView from './components/CompareView.jsx';
import Sidebar from './components/Sidebar.jsx';
import PlanetPanel from './components/PlanetPanel.jsx';
import AstronomerChat from './components/AstronomerChat.jsx';
import { loadSnapshot, loadLive, planetContext } from './lib/data.js';
import { NASA_ACKNOWLEDGEMENT } from './lib/nasa.js';

const VIEWS = { galaxy: '🌌 Galaxy', system: '🪐 System', compare: '⚖️ Compare' };

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Loading NASA data…');
  const [view, setView] = useState('galaxy');
  const [host, setHost] = useState(null);
  const [planetName, setPlanetName] = useState(null);
  const [compare, setCompare] = useState([]);
  const [habitableOnly, setHabitableOnly] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [panelTab, setPanelTab] = useState('details');
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { loadSnapshot().then((d) => { setData(d); setStatus(''); }); }, []);

  const system = host && data ? data.systems.get(host) : null;
  const planet = system ? system.planets.find((p) => p.pl_name === planetName) ?? system.planets[0] : null;
  const comparePlanets = useMemo(() => compare.map((n) => data?.planets.find((p) => p.pl_name === n)).filter(Boolean), [compare, data]);

  // Default animation speed: the innermost planet completes an orbit in about 6 seconds.
  useEffect(() => {
    if (!system) return;
    const minP = Math.min(...system.planets.map((p) => p.pl_orbper ?? Infinity));
    setSpeed(Number.isFinite(minP) ? minP / 6 : 1);
  }, [system]);

  const selectHost = (h) => { setHost(h); setPlanetName(null); setView('system'); setPanelTab('details'); };

  const refreshLive = async () => {
    setStatus('Fetching live data from NASA Exoplanet Archive…');
    try { setData(await loadLive()); setStatus(''); }
    catch (e) { setStatus(`Live refresh failed (${e.message}). Still using the saved snapshot.`); }
  };

  const sendChat = async (text, overrideContext) => {
    const context = overrideContext ?? (planet ? { selected_planet: planetContext(planet), other_planets_in_system: system.planets.filter((p) => p !== planet).map((p) => planetContext(p)) } : null);
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setPanelTab('chat');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.filter((m) => !m.error), context }) });
      const json = await res.json();
      setMessages([...next, json.reply ? { role: 'assistant', content: json.reply } : { role: 'assistant', content: `⚠️ ${json.error || 'Something went wrong.'}`, error: true }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ Could not reach the AI server: ${e.message}`, error: true }]);
    } finally { setChatLoading(false); }
  };

  const askCompare = () => sendChat(
    `Compare ${comparePlanets.map((p) => p.pl_name).join(', ')} with each other and with Earth. Which is most Earth-like and why? Mention key uncertainties.`,
    { comparing: comparePlanets.map((p) => planetContext(p)), earth_reference: { radius_earth: 1, mass_earth: 1, insolation_earth: 1, equilibrium_temp_K: 255, earth_similarity_index: 1 } },
  );

  if (!data) return <div className="loading">🛰️ {status}</div>;

  return (
    <div className="app">
      <header>
        <div className="brand">🪐 <b>Exoplanet Explorer</b> <span className="muted">· {data.planets.length.toLocaleString()} worlds</span></div>
        <nav>{Object.entries(VIEWS).map(([k, label]) => (
          <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{label}{k === 'compare' && compare.length ? ` (${compare.length})` : ''}</button>
        ))}</nav>
        <div className="source">
          <span className={`badge ${data.meta.sample ? 'warn' : 'ok'}`} title={data.meta.source}>
            {data.meta.sample ? 'Offline sample data' : `NASA data · ${data.meta.fetchedAt ? new Date(data.meta.fetchedAt).toLocaleDateString() : ''}`}
          </span>
          <button onClick={refreshLive} title="Download the latest data from NASA Exoplanet Archive">↻ Live NASA</button>
        </div>
      </header>
      {status && <div className="status">{status}</div>}

      <main>
        <Sidebar systems={data.systems} selected={host} onSelect={selectHost} habitableOnly={habitableOnly} setHabitableOnly={setHabitableOnly} />

        <section className="stage">
          {view === 'galaxy' && <GalaxyView systems={data.systems} selected={host} onSelect={selectHost} habitableOnly={habitableOnly} />}
          {view === 'system' && <SystemView system={system} selectedPlanet={planet?.pl_name} onSelectPlanet={(n) => { setPlanetName(n); setPanelTab('details'); }} speed={speed} />}
          {view === 'compare' && <CompareView planets={comparePlanets} onRemove={(n) => setCompare(compare.filter((x) => x !== n))} onAskAi={askCompare} />}

          <div className="legend">
            {view === 'galaxy' && <>Stars placed by real sky position; distance is log-scaled. <span className="dot g" /> has a potentially habitable planet. Drag to rotate, scroll to zoom, click a star.</>}
            {view === 'system' && system && (
              <>
                Orbits use real shapes and periods; distances are compressed. <span className="dot g" /> habitable zone.
                <label className="speed">Speed: 1 s = {speed < 1 ? speed.toFixed(2) : Math.round(speed).toLocaleString()} days
                  <input type="range" min={-2} max={4} step={0.05} value={Math.log10(speed)} onChange={(e) => setSpeed(10 ** Number(e.target.value))} />
                </label>
              </>
            )}
          </div>
        </section>

        <aside className="panel">
          <div className="tabs">
            <button className={panelTab === 'details' ? 'active' : ''} onClick={() => setPanelTab('details')}>Details</button>
            <button className={panelTab === 'chat' ? 'active' : ''} onClick={() => setPanelTab('chat')}>✨ Ask Astra</button>
          </div>
          {panelTab === 'details'
            ? <PlanetPanel system={system} planet={planet} onSelectPlanet={setPlanetName} onCompare={(p) => setCompare([...compare, p.pl_name])} compareNames={compare} onAsk={sendChat} />
            : <AstronomerChat messages={messages} loading={chatLoading} onSend={(t) => sendChat(t)} contextLabel={planet?.pl_name} />}
        </aside>
      </main>

      <footer className="muted small">{NASA_ACKNOWLEDGEMENT} Habitability values are indicators, not evidence of life. Open source under the MIT License.</footer>
    </div>
  );
}
