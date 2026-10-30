import { useCallback, useEffect, useMemo, useState } from 'react';
import GalaxyView from './components/GalaxyView.jsx';
import SystemView from './components/SystemView.jsx';
import CompareView from './components/CompareView.jsx';
import Sidebar from './components/Sidebar.jsx';
import PlanetPanel from './components/PlanetPanel.jsx';
import AstronomerChat from './components/AstronomerChat.jsx';
import IntroScreen from './components/IntroScreen.jsx';
import TourCard from './components/TourCard.jsx';
import { LabelScale } from './components/Label.jsx';
import { loadSnapshot, loadLive, planetContext } from './lib/data.js';
import { NASA_ACKNOWLEDGEMENT } from './lib/nasa.js';
import { TOUR_STOPS } from './lib/tour.js';

const VIEWS = { galaxy: '🌌 Galaxy', system: '🪐 System', compare: '⚖️ Compare' };
const MOBILE_QUERY = '(max-width: 900px)';

// Session storage can throw in private windows; never let that break the app.
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } },
};

function useIsMobile() {
  const [m, setM] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

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

  // UI chrome
  const isMobile = useIsMobile();
  const [intro, setIntro] = useState(() => store.get('introSeen') !== '1');
  const [tour, setTour] = useState(null); // index into the available tour stops, or null
  const [autoplay, setAutoplay] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const [rightOpen, setRightOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);
  const [presenter, setPresenter] = useState(false);

  useEffect(() => { loadSnapshot().then((d) => { setData(d); setStatus(''); }); }, []);
  useEffect(() => { setLeftOpen(!isMobile); setRightOpen(!isMobile); }, [isMobile]);

  const system = host && data ? data.systems.get(host) : null;
  const planet = system ? system.planets.find((p) => p.pl_name === planetName) ?? system.planets[0] : null;
  const comparePlanets = useMemo(() => compare.map((n) => data?.planets.find((p) => p.pl_name === n)).filter(Boolean), [compare, data]);

  const stats = useMemo(() => data && {
    planets: data.planets.length,
    systems: data.systems.size,
    habitable: data.planets.filter((p) => p.hab.sample).length,
  }, [data]);

  // Only tour stops whose planet exists in the loaded dataset.
  const stops = useMemo(() => (data ? TOUR_STOPS.map((s) => ({ ...s, p: data.planets.find((p) => p.pl_name === s.planet) })).filter((s) => s.p) : []), [data]);

  // Default animation speed: the innermost planet completes an orbit in about 6 seconds.
  useEffect(() => {
    if (!system) return;
    const minP = Math.min(...system.planets.map((p) => p.pl_orbper ?? Infinity));
    setSpeed(Number.isFinite(minP) ? minP / 6 : 1);
  }, [system]);

  // Each tour step jumps to that planet's system.
  useEffect(() => {
    if (tour == null || !stops[tour]) return;
    const p = stops[tour].p;
    setHost(p.hostname); setPlanetName(p.pl_name); setView('system'); setPanelTab('details');
  }, [tour, stops]);

  const selectHost = (h) => {
    setHost(h); setPlanetName(null); setView('system'); setPanelTab('details'); setTour(null);
    if (isMobile) setLeftOpen(false);
  };
  const selectPlanet = (n) => { setPlanetName(n); setPanelTab('details'); if (isMobile) setRightOpen(true); };

  const closeIntro = () => { setIntro(false); store.set('introSeen', '1'); };
  const startTour = () => { closeIntro(); setTour(0); if (isMobile) { setLeftOpen(false); setRightOpen(false); } };
  const nextStop = useCallback(() => setTour((t) => (t == null ? null : t + 1 < stops.length ? t + 1 : null)), [stops.length]);
  const prevStop = useCallback(() => setTour((t) => (t > 0 ? t - 1 : t)), []);
  const exitTour = useCallback(() => { setTour(null); setAutoplay(false); }, []);

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
    setRightOpen(true);
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

  if (!data) return <div className="loading"><div className="spinner" />🛰️ {status}</div>;

  const cls = ['app', presenter && 'presenter', leftOpen ? 'left-open' : 'left-closed', rightOpen ? 'right-open' : 'right-closed'].filter(Boolean).join(' ');
  const stop = tour != null ? stops[tour] : null;

  return (
    <LabelScale.Provider value={presenter ? 1.35 : 1}>
      <div className={cls}>
        {intro && <IntroScreen stats={stats} sample={data.meta.sample} onStart={closeIntro} onTour={startTour} />}

        <header>
          <button className="icon-btn" onClick={() => setLeftOpen(!leftOpen)} title="Show or hide the star list" aria-label="Toggle star list">☰</button>
          <button className="brand" onClick={() => setIntro(true)} title="Back to the welcome screen">
            <span className="logo">🪐</span><b>Exoplanet Explorer</b><span className="muted count"> · {data.planets.length.toLocaleString()} worlds</span>
          </button>
          <nav>{Object.entries(VIEWS).map(([k, label]) => (
            <button key={k} className={view === k ? 'active' : ''} onClick={() => { setView(k); if (k !== 'system') setTour(null); }}>
              {label}{k === 'compare' && compare.length ? ` (${compare.length})` : ''}
            </button>
          ))}</nav>
          <div className="source">
            <button className={tour != null ? 'active' : ''} onClick={() => (tour != null ? exitTour() : startTour())} title="Guided tour of remarkable planets">🎬 Tour</button>
            <button className={presenter ? 'active' : ''} onClick={() => setPresenter(!presenter)} title="Bigger text for projectors">🖥️ Presenter</button>
            <span className={`badge ${data.meta.sample ? 'warn' : 'ok'}`} title={data.meta.source}>
              {data.meta.sample ? 'Offline sample' : `NASA data · ${data.meta.fetchedAt ? new Date(data.meta.fetchedAt).toLocaleDateString() : ''}`}
            </span>
            <button onClick={refreshLive} title="Download the latest data from NASA Exoplanet Archive">↻ Live</button>
            <button className="icon-btn" onClick={() => setRightOpen(!rightOpen)} title="Show or hide the details panel" aria-label="Toggle details panel">ⓘ</button>
          </div>
        </header>
        {status && <div className="status">{status}</div>}

        <main>
          {isMobile && (leftOpen || rightOpen) && <div className="scrim" onClick={() => { setLeftOpen(false); setRightOpen(false); }} />}

          <div className="drawer left">
            <Sidebar systems={data.systems} selected={host} onSelect={selectHost} habitableOnly={habitableOnly} setHabitableOnly={setHabitableOnly} />
          </div>

          <section className="stage">
            {view === 'galaxy' && <GalaxyView systems={data.systems} selected={host} onSelect={selectHost} habitableOnly={habitableOnly} />}
            {view === 'system' && <SystemView system={system} selectedPlanet={planet?.pl_name} onSelectPlanet={selectPlanet} speed={speed} />}
            {view === 'compare' && <CompareView planets={comparePlanets} onRemove={(n) => setCompare(compare.filter((x) => x !== n))} onAskAi={askCompare} />}

            {stop && view === 'system' && (
              <TourCard stop={stop} planet={stop.p} index={tour} total={stops.length} autoplay={autoplay} setAutoplay={setAutoplay}
                onPrev={prevStop} onNext={nextStop} onExit={exitTour}
                onAsk={() => sendChat(`Tell me about ${stop.p.pl_name}. Why is it famous, and what do we know about whether it could be habitable?`)} />
            )}

            {!stop && view !== 'compare' && (
              <div className="legend">
                {view === 'galaxy' && <>Stars at their real sky positions; distance is log-scaled. <span className="dot g" /> hosts a potentially habitable planet. Drag to rotate · scroll to zoom · click a star.</>}
                {view === 'system' && system && (
                  <>
                    <span>Real orbit shapes and periods; distances compressed. <span className="dot g" /> habitable zone. Surfaces are artistic impressions.</span>
                    <label className="speed">Speed: 1 s = {speed < 1 ? speed.toFixed(2) : Math.round(speed).toLocaleString()} days
                      <input type="range" min={-2} max={4} step={0.05} value={Math.log10(speed)} onChange={(e) => setSpeed(10 ** Number(e.target.value))} />
                    </label>
                  </>
                )}
              </div>
            )}
          </section>

          <div className="drawer right">
            <aside className="panel">
              <div className="tabs">
                <button className={panelTab === 'details' ? 'active' : ''} onClick={() => setPanelTab('details')}>Details</button>
                <button className={panelTab === 'chat' ? 'active' : ''} onClick={() => setPanelTab('chat')}>✨ Ask Astra</button>
                {isMobile && <button className="icon-btn" onClick={() => setRightOpen(false)} aria-label="Close panel">✕</button>}
              </div>
              {panelTab === 'details'
                ? <PlanetPanel system={system} planet={planet} onSelectPlanet={setPlanetName} onCompare={(p) => setCompare([...compare, p.pl_name])} compareNames={compare} onAsk={sendChat} />
                : <AstronomerChat messages={messages} loading={chatLoading} onSend={(t) => sendChat(t)} contextLabel={planet?.pl_name} />}
            </aside>
          </div>
        </main>

        <footer className="muted small">{NASA_ACKNOWLEDGEMENT} Habitability values are indicators, not evidence of life. Open source under the MIT License.</footer>
      </div>
    </LabelScale.Provider>
  );
}
