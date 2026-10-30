// The "virtual astronomer": calls an open-weight LLM through Featherless
// (OpenAI-compatible API, https://featherless.ai/docs/api-reference).
// The API key stays on the server and is never sent to the browser.

const FEATHERLESS_URL = 'https://api.featherless.ai/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

const SYSTEM_PROMPT = `You are "Astra", a friendly virtual astronomer inside an exoplanet explorer app.
Rules:
- Use ONLY the numbers in the DATA block for facts about specific planets. Never invent values.
- If a value is missing or marked estimated, say so plainly.
- Habitability scores are indicators, not evidence of life. Never claim a planet is habitable or has life.
- Explain in simple language for students; compare to Earth and our Solar System where helpful.
- Keep answers under 180 words unless the user asks for more. Use short paragraphs or bullet points.
- If asked about something outside the data, you may use general astronomy knowledge, but say it is general knowledge.`;

export async function chatHandler(body, env = process.env) {
  const apiKey = env.FEATHERLESS_API_KEY;
  if (!apiKey) {
    return { status: 500, body: { error: 'FEATHERLESS_API_KEY is not set. Copy .env.example to .env and add your key.' } };
  }

  const { messages = [], context = null } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: 'messages must be a non-empty array' } };
  }

  // Keep the request small: last 10 turns, plain text only.
  const history = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content).slice(0, 4000),
  }));

  const dataBlock = context ? `DATA (from NASA Exoplanet Archive + app calculations):\n${JSON.stringify(context).slice(0, 12000)}` : 'DATA: none selected.';

  try {
    const res = await fetch(FEATHERLESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: env.FEATHERLESS_MODEL || DEFAULT_MODEL,
        messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${dataBlock}` }, ...history],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: res.status, body: { error: json?.error?.message || `Featherless responded ${res.status}` } };
    }
    return { status: 200, body: { reply: json.choices?.[0]?.message?.content?.trim() || '(no reply)' } };
  } catch (err) {
    return { status: 502, body: { error: `Could not reach Featherless: ${err.message}` } };
  }
}
