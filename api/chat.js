// Vercel serverless function: POST /api/chat
import { chatHandler } from '../server/chat.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { status, body } = await chatHandler(req.body);
  res.status(status).json(body);
}
