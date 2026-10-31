// Left sidebar: search and filter star systems.
import { useMemo, useState } from 'react';
import { fmt } from '../lib/format.js';

const SORTS = {
  esi: { label: 'Most Earth-like', fn: (a, b) => b.bestEsi - a.bestEsi },
  near: { label: 'Nearest', fn: (a, b) => (a.star.sy_dist ?? 1e9) - (b.star.sy_dist ?? 1e9) },
  planets: { label: 'Most planets', fn: (a, b) => b.planets.length - a.planets.length },
  name: { label: 'Name', fn: (a, b) => a.hostname.localeCompare(b.hostname) },
};

const LIMIT = 200;

function matchesPlanetSize(planet, size) {
  if (!size) return true;

  const radius = Number(planet.pl_rade);

  // If the radius is missing, we cannot classify the planet.
  if (!Number.isFinite(radius)) return false;

  if (size === 'earth') return radius <= 1.6;
  if (size === 'super-earth') return radius > 1.6 && radius <= 2.5;
  if (size === 'neptune') return radius > 2.5 && radius <= 6;
  if (size === 'giant') return radius > 6;

  return true;
}

export default function Sidebar({
  systems,
  selected,
  onSelect,
  habitableOnly,
  setHabitableOnly,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('esi');

  // New filters
  const [discoveryMethod, setDiscoveryMethod] = useState('');
  const [planetSize, setPlanetSize] = useState('');

  // Find all discovery methods present in the actual dataset.
  const discoveryMethods = useMemo(() => {
    const counts = new Map();

    for (const system of systems.values()) {
      for (const planet of system.planets) {
        const method = planet.discoverymethod;

        if (method) {
          counts.set(method, (counts.get(method) || 0) + 1);
        }
      }
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [systems]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...systems.values()]
      .filter((s) => !habitableOnly || s.hasHz)

      .filter(
        (s) =>
          !q ||
          s.hostname.toLowerCase().includes(q) ||
          s.planets.some((p) => p.pl_name.toLowerCase().includes(q))
      )

      // Keep the system if at least one planet matches
      // BOTH of the new planet filters.
      .filter((s) =>
        s.planets.some((planet) => {
          const methodMatches =
            !discoveryMethod ||
            planet.discoverymethod === discoveryMethod;

          const sizeMatches = matchesPlanetSize(planet, planetSize);

          return methodMatches && sizeMatches;
        })
      )

      .sort(SORTS[sort].fn);
  }, [
    systems,
    query,
    sort,
    habitableOnly,
    discoveryMethod,
    planetSize,
  ]);

  function clearFilters() {
    setQuery('');
    setHabitableOnly(false);
    setDiscoveryMethod('');
    setPlanetSize('');
    setSort('esi');
  }

  return (
    <aside className="sidebar">
      <input
        className="search"
        placeholder="Search a star or planet… e.g. TRAPPIST"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="filters">
        <label className="toggle">
          <input
            type="checkbox"
            checked={habitableOnly}
            onChange={(e) => setHabitableOnly(e.target.checked)}
          />
          Potentially habitable only
        </label>

        {/* Discovery method filter */}
        <select
          value={discoveryMethod}
          onChange={(e) => setDiscoveryMethod(e.target.value)}
        >
          <option value="">All discovery methods</option>

          {discoveryMethods.map(([method, count]) => (
            <option key={method} value={method}>
              {method} ({count})
            </option>
          ))}
        </select>

        {/* Planet size filter */}
        <select
          value={planetSize}
          onChange={(e) => setPlanetSize(e.target.value)}
        >
          <option value="">All planet sizes</option>
          <option value="earth">Earth-size (≤ 1.6 R⊕)</option>
          <option value="super-earth">Super-Earth (1.6–2.5 R⊕)</option>
          <option value="neptune">Neptune-like (2.5–6 R⊕)</option>
          <option value="giant">Gas giant (&gt; 6 R⊕)</option>
        </select>

        {/* Existing sorting */}
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="clear-filters"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="count">
        {results.length.toLocaleString()} systems
        {results.length > LIMIT ? ` · showing first ${LIMIT}` : ''}
      </div>

      <ul className="system-list">
        {results.slice(0, LIMIT).map((s) => (
          <li
            key={s.hostname}
            className={s.hostname === selected ? 'active' : ''}
            onClick={() => onSelect(s.hostname)}
          >
            <div className="row1">
              <span className="name">{s.hostname}</span>

              {s.hasHz && (
                <span
                  className="badge hz"
                  title="Has a planet meeting PHL-style habitable-zone criteria"
                >
                  HZ
                </span>
              )}
            </div>

            <div className="row2">
              {s.planets.length} planet{s.planets.length > 1 ? 's' : ''}
              {' · '}
              {s.star.sy_dist
                ? `${fmt(s.star.sy_dist * 3.26156, 3)} ly`
                : 'distance ?'}
              {' · '}
              ESI {s.bestEsi ? s.bestEsi.toFixed(2) : '—'}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}