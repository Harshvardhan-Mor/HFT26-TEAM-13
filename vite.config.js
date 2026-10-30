import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { chatHandler } from './server/chat.js';
import { nasaHandler } from './server/nasa.js';

// In development, serve /api/* from the same handlers Vercel uses in production,
// so there is only one copy of the server logic.
function localApi() {
  const send = (res, { status, body }) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/nasa', async (_req, res) => send(res, await nasaHandler()));
      server.middlewares.use('/api/chat', (req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', async () => {
          let body = {};
          try { body = JSON.parse(raw || '{}'); } catch { return send(res, { status: 400, body: { error: 'Invalid JSON' } }); }
          send(res, await chatHandler(body));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env (including non-VITE_ keys) into process.env for the server handlers only.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), localApi()] };
});
