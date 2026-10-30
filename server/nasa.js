// Fetches live data from the NASA Exoplanet Archive on the server side
// (avoids browser CORS issues). Used by the dev server and by api/nasa.js on Vercel.
import { buildQueryUrl, normalizeRows } from '../src/lib/nasa.js';

export async function fetchNasaPlanets() {
  const res = await fetch(buildQueryUrl(), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`NASA Exoplanet Archive responded ${res.status}`);
  const rows = await res.json();
  const planets = normalizeRows(rows);
  return {
    meta: {
      source: 'NASA Exoplanet Archive, pscomppars table (live)',
      url: 'https://exoplanetarchive.ipac.caltech.edu/',
      fetchedAt: new Date().toISOString(),
      count: planets.length,
    },
    planets,
  };
}

export async function nasaHandler() {
  try {
    return { status: 200, body: await fetchNasaPlanets() };
  } catch (err) {
    return { status: 502, body: { error: err.message } };
  }
}
