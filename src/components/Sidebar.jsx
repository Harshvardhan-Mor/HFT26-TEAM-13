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

export default function Sidebar({ systems, selected, onSelect, habitableOnly, setHabitableOnly }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('esi');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...systems.values()]
      .filter((s) => !habitableOnly || s.hasHz)
      .filter((s) => !q || s.hostname.toLowerCase().includes(q) || s.planets.some((p) => p.pl_name.toLowerCase().includes(q)))
      .sort(SORTS[sort].fn);
  }, [systems, query, sort, habitableOnly]);

  return (
    <aside className="sidebar">
      <input className="search" placeholder="Search a star or planet… e.g. TRAPPIST" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filters">
        <label className="toggle">
          <input type="checkbox" checked={habitableOnly} onChange={(e) => setHabitableOnly(e.target.checked)} />
          Potentially habitable only
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="count">{results.length.toLocaleString()} systems{results.length > LIMIT ? ` · showing first ${LIMIT}` : ''}</div>
      <ul className="system-list">
        {results.slice(0, LIMIT).map((s) => (
          <li key={s.hostname} className={s.hostname === selected ? 'active' : ''} onClick={() => onSelect(s.hostname)}>
            <div className="row1">
              <span className="name">{s.hostname}</span>
              {s.hasHz && <span className="badge hz" title="Has a planet meeting PHL-style habitable-zone criteria">HZ</span>}
            </div>
            <div className="row2">
              {s.planets.length} planet{s.planets.length > 1 ? 's' : ''} · {s.star.sy_dist ? `${fmt(s.star.sy_dist * 3.26156, 3)} ly` : 'distance ?'} · ESI {s.bestEsi ? s.bestEsi.toFixed(2) : '—'}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
