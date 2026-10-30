// Welcome screen shown on first load. Stats are computed from the loaded data.
export default function IntroScreen({ stats, sample, onStart, onTour }) {
  return (
    <div className="intro" role="dialog" aria-label="Welcome">
      <div className="intro-sky" aria-hidden="true" />
      <div className="intro-planet" aria-hidden="true"><div className="intro-ring" /></div>
      <div className="intro-content">
        <p className="eyebrow">NASA Exoplanet Archive · AI virtual astronomer</p>
        <h1>Exoplanet Explorer</h1>
        <p className="tagline">Fly through every known world beyond our Solar System, see which ones might be habitable, and ask an AI astronomer what makes them special.</p>
        <div className="intro-stats">
          <div><b>{stats.planets.toLocaleString()}</b><span>confirmed planets</span></div>
          <div><b>{stats.systems.toLocaleString()}</b><span>star systems</span></div>
          <div><b>{stats.habitable.toLocaleString()}</b><span>in habitable zones*</span></div>
        </div>
        <div className="intro-actions">
          <button className="primary big-btn" onClick={onStart}>🚀 Start exploring</button>
          <button className="big-btn" onClick={onTour}>🎬 Take the guided tour</button>
        </div>
        <p className="intro-note">
          {sample ? 'Showing the offline sample. Run `npm run fetch-data` for the full NASA dataset. ' : ''}
          *Meets PHL-style size and habitable-zone criteria: an indicator, not evidence of life.
        </p>
      </div>
    </div>
  );
}
