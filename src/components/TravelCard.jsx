export default function TravelCard({ distancePc }) {
  const pc = Number(distancePc);

  if (!Number.isFinite(pc) || pc <= 0) return null;

  // Convert parsecs to light-years.
  const lightYears = pc * 3.26156;

  // One light-year in kilometres.
  const kmPerLightYear = 9.4607e12;

  // Light speed.
  const lightSpeedYears = lightYears;

  // Hypothetical light sail travelling at 20% of light speed.
  const starshotYears = lightYears / 0.2;

  // Voyager 1 travelling at approximately 17 km/s.
  const secondsPerYear = 365.25 * 24 * 60 * 60;
  const voyagerKmPerYear = 17 * secondsPerYear;
  const voyagerYears =
    (lightYears * kmPerLightYear) / voyagerKmPerYear;

  // Car travelling continuously at 100 km/h.
  const carYears =
    (lightYears * kmPerLightYear) / 100 / 24 / 365.25;

  const formatYears = (years) => {
    if (years < 100) {
      return `${years.toFixed(1)} years`;
    }

    if (years < 1_000_000) {
      return `${Math.round(years).toLocaleString()} years`;
    }

    return `${(years / 1_000_000).toFixed(1)} million years`;
  };

  return (
    <section className="travel-card">
      <h3>🚀 How long to get there?</h3>

      <p className="travel-distance">
        Distance: <strong>{lightYears.toFixed(2)} light years</strong>
      </p>

      <div className="travel-grid">
        <div className="travel-option">
          <span>💡 Light speed</span>
          <strong>{formatYears(lightSpeedYears)}</strong>
        </div>

        <div className="travel-option">
          <span>🚀 20% light speed</span>
          <strong>{formatYears(starshotYears)}</strong>
        </div>

        <div className="travel-option">
          <span>🛰️ Voyager 1</span>
          <strong>{formatYears(voyagerYears)}</strong>
        </div>

        <div className="travel-option">
          <span>🚗 Car at 100 km/h</span>
          <strong>{formatYears(carYears)}</strong>
        </div>
      </div>
    </section>
  );
}