// Downloads a snapshot of every confirmed exoplanet from the NASA Exoplanet Archive
// into public/data/exoplanets.json, so the app works offline during a demo.
// Run: npm run fetch-data
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchNasaPlanets } from '../server/nasa.js';

const OUT = new URL('../public/data/exoplanets.json', import.meta.url);

console.log('Querying NASA Exoplanet Archive (pscomppars)... this can take 10-30 seconds.');
try {
  const data = await fetchNasaPlanets();
  data.meta.source = 'NASA Exoplanet Archive, pscomppars table (snapshot)';
  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
  await writeFile(OUT, JSON.stringify(data));
  const hosts = new Set(data.planets.map((p) => p.hostname)).size;
  console.log(`Saved ${data.planets.length} planets around ${hosts} stars to public/data/exoplanets.json`);
} catch (err) {
  console.error('Download failed:', err.message);
  console.error('Check your internet connection and try again. The app will use the small offline sample until then.');
  process.exit(1);
}
