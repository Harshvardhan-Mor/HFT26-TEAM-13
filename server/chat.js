// "Astra", the virtual astronomer: calls an open-weight LLM through Featherless
// (OpenAI-compatible API, https://featherless.ai/docs/api-reference).
// The API key stays on the server and is never sent to the browser.
//
// Two modes:
//   chatHandler(body)      -> waits for the full answer, returns { status, body } (JSON)
//   chatStream(body, res)  -> streams the answer to the browser as plain text, word by word

const DEFAULT_BASE_URL = 'https://api.featherless.ai/v1';
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const TIMEOUT_MS = 20000; // give up if Featherless is silent for this long

const LANGUAGES = { en: 'English', hi: 'Hindi (Devanagari script)', te: 'Telugu (Telugu script)' };

const SYSTEM_PROMPT = `You are "Astra", a friendly virtual astronomer inside an exoplanet explorer app.
Rules:
- Use ONLY the numbers in the DATA block for facts about specific planets. Never invent values.
- If a value is missing or marked estimated, say so plainly.
- Habitability scores are indicators, not evidence of life. Never claim a planet is habitable or has life.
- Explain in simple language for students; compare to Earth and our Solar System where helpful.
- When mentioning distance, use distance_light_years from DATA (e.g. "about 40 light years away"). Never call a star "close to our Sun" unless it is under 10 light years away.
- Equilibrium temperature ignores the atmosphere: Earth's is about 255 K, yet its surface averages 288 K. Never conclude a planet is too cold or too hot from equilibrium temperature alone.
- If a value is not in DATA, say it has not been measured. You may only derive it from DATA values (e.g. density from mass and radius) if you show the calculation and call it an estimate.
- Keep answers under 180 words unless the user asks for more. Use short paragraphs or bullet points.
- If asked about something outside the data, you may use general astronomy knowledge, but say it is general knowledge.`;

/** Friendly messages for the errors people actually hit. */
function friendlyError(status, detail = '') {
  if (status === 401) return 'Astra’s API key was rejected. Check FEATHERLESS_API_KEY in .env (no quotes, no spaces).';
  if (status === 403) return 'This model isn’t available on your Featherless plan. Pick another one in FEATHERLESS_MODEL (run `npm run test-models`).';
  if (status === 404) return 'Featherless doesn’t recognise that model name. Check FEATHERLESS_MODEL (run `npm run test-models` to list valid ones).';
  if (status === 429) return 'Astra is busy right now (too many requests at once). Wait a few seconds and try again.';
  if (status === 408) return 'Astra took too long to answer. Try again, or ask a shorter question.';
  if (status >= 500) return 'Featherless is having trouble right now. Try again in a moment.';
  return detail || `Astra hit an error (${status}).`;
}

function buildRequest(body, env, stream) {
  const { messages = [], context = null, language = 'en' } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) return { error: { status: 400, message: 'messages must be a non-empty array' } };
  if (!env.FEATHERLESS_API_KEY) return { error: { status: 500, message: 'Astra isn’t set up yet: FEATHERLESS_API_KEY is missing. Copy .env.example to .env, add your key, and restart `npm run dev`.' } };

  // Keep the request small: last 10 turns, plain text only.
  const history = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 4000),
  }));
  const lang = LANGUAGES[language] ? `\n- Reply in ${LANGUAGES[language]}. Keep planet names and numbers as they are.` : '';
  const dataBlock = context ? `DATA (from NASA Exoplanet Archive + app calculations):\n${JSON.stringify(context).slice(0, 12000)}` : 'DATA: none selected.';

  return {
    url: `${env.FEATHERLESS_BASE_URL || DEFAULT_BASE_URL}/chat/completions`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.FEATHERLESS_API_KEY}` },
      body: JSON.stringify({
        model: env.FEATHERLESS_MODEL || DEFAULT_MODEL,
        messages: [{ role: 'system', content: `${SYSTEM_PROMPT}${lang}\n\n${dataBlock}` }, ...history],
        temperature: 0.4,
        max_tokens: 600,
        stream,
      }),
    },
  };
}

/** fetch() that aborts if no response arrives within TIMEOUT_MS. */
async function fetchWithTimeout(url, init) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return { res: await fetch(url, { ...init, signal: ctrl.signal }), ctrl, timer };
  } catch (err) {
    clearTimeout(timer);
    throw err.name === 'AbortError' ? Object.assign(new Error('timeout'), { status: 408 }) : err;
  }
}

/** Non-streaming: returns the whole answer at once. */
export async function chatHandler(body, env = process.env) {
  const req = buildRequest(body, env, false);
  if (req.error) return { status: req.error.status, body: { error: req.error.message } };
  try {
    const { res, timer } = await fetchWithTimeout(req.url, req.init);
    clearTimeout(timer);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { status: res.status, body: { error: friendlyError(res.status, json?.error?.message) } };
    return { status: 200, body: { reply: json.choices?.[0]?.message?.content?.trim() || '(no reply)' } };
  } catch (err) {
    return { status: err.status || 502, body: { error: err.status ? friendlyError(err.status) : `Could not reach Featherless: ${err.message}` } };
  }
}

/**
 * Streaming: forwards the answer to the browser as plain text chunks.
 * Featherless sends Server-Sent Events ("data: {...}" lines, ending with "data: [DONE]").
 * Errors before the first word are sent as JSON with an error status;
 * errors mid-answer are appended to the text.
 */
export async function chatStream(body, res, env = process.env) {
  const sendJson = (status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  const req = buildRequest(body, env, true);
  if (req.error) return sendJson(req.error.status, { error: req.error.message });

  let upstream, ctrl, timer;
  try {
    ({ res: upstream, ctrl, timer } = await fetchWithTimeout(req.url, req.init));
  } catch (err) {
    return sendJson(err.status || 502, { error: err.status ? friendlyError(err.status) : `Could not reach Featherless: ${err.message}` });
  }
  if (!upstream.ok) {
    clearTimeout(timer);
    const json = await upstream.json().catch(() => ({}));
    return sendJson(upstream.status, { error: friendlyError(upstream.status, json?.error?.message) });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const resetTimer = () => { clearTimeout(timer); timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS); };

  try {
    resetTimer();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      resetTimer();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep any half-received line for the next chunk
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const piece = JSON.parse(data).choices?.[0]?.delta?.content;
          if (piece) res.write(piece);
        } catch { /* ignore keep-alive or malformed lines */ }
      }
    }
  } catch (err) {
    res.write(`\n\n⚠️ ${err.name === 'AbortError' ? friendlyError(408) : 'The connection to Astra dropped. Try again.'}`);
  } finally {
    clearTimeout(timer);
    res.end();
  }
}
