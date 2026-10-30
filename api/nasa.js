// Vercel serverless function: GET /api/nasa  (live NASA Exoplanet Archive data)
import { nasaHandler } from '../server/nasa.js';

export default async function handler(req, res) {
  const { status, body } = await nasaHandler();
  // Cache for 6 hours at the edge; the archive updates at most daily.
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
  res.status(status).json(body);
}
