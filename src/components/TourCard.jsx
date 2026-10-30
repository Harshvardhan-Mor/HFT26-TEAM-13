// Caption card for the guided tour. Live numbers come from the NASA data.
import { useEffect } from 'react';
import { fmt } from '../lib/format.js';

export default function TourCard({ stop, planet, index, total, autoplay, setAutoplay, onPrev, onNext, onExit, onAsk }) {
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(onNext, 12000);
    return () => clearTimeout(t);
  }, [autoplay, index, onNext]);

  useEffect(() => {
    const key = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onNext, onPrev, onExit]);

  const h = planet.hab;
  return (
    <div className="tour-card" role="region" aria-label="Guided tour">
      <div className="tour-top">
        <span className="tour-step">Stop {index + 1} of {total}</span>
        <button className="x" onClick={onExit} aria-label="Exit tour">✕</button>
      </div>
      <h3>{stop.title}</h3>
      <p className="tour-planet">{planet.pl_name}</p>
      <p>{stop.text}</p>
      <div className="tour-facts">
        <span>📏 {h.radius.value != null ? `${fmt(h.radius.value, 2)}× Earth${h.radius.estimated ? ' (est.)' : ''}` : 'size unknown'}</span>
        <span>🛰️ {planet.sy_dist ? `${fmt(planet.sy_dist * 3.26156, 3)} light years` : 'distance unknown'}</span>
        <span>🌍 ESI {h.esi.value != null ? h.esi.value.toFixed(2) : '—'}</span>
      </div>
      <div className="tour-actions">
        <button onClick={onPrev} disabled={index === 0}>◀ Back</button>
        <label className="toggle small"><input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} /> Auto-play</label>
        <button onClick={onAsk}>✨ Ask Astra</button>
        <button className="primary" onClick={onNext}>{index === total - 1 ? 'Finish' : 'Next ▶'}</button>
      </div>
    </div>
  );
}
