// Vercel serverless function: POST /api/chat
// Send { stream: true } to get the answer word by word as plain text.
import { chatHandler, chatStream } from '../server/chat.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  if (req.body?.stream) return chatStream(req.body, res);
  const { status, body } = await chatHandler(req.body);
  res.status(status).json(body);
}
