// Compare Featherless models for Astra: speed + answer quality on the same questions.
//
//   npm run test-models                       -> lists chat models your key can use
//   npm run test-models -- MODEL_A MODEL_B    -> asks each model 5 questions, saves a report
//
// Report is written to docs/model-test-results.md so the team can read the answers.
import { readFile, writeFile } from 'node:fs/promises';
import { habitabilityReport } from '../src/lib/habitability.js';
import { planetContext } from '../src/lib/context.js';

try { process.loadEnvFile('.env'); } catch { /* no .env file */ }
const KEY = process.env.FEATHERLESS_API_KEY;
const BASE = process.env.FEATHERLESS_BASE_URL || 'https://api.featherless.ai/v1';
if (!KEY) { console.error('FEATHERLESS_API_KEY is missing. Put it in .env first.'); process.exit(1); }
const headers = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const models = process.argv.slice(2);

if (models.length === 0) {
  // List models available on this key's plan, filtered to well-known instruct families.
  const url = `${BASE}/models?available_on_current_plan=true&per_page=1000`;
  const res = await fetch(url, { headers });
  if (!res.ok) { console.error(`Could not list models (${res.status}). Is the key correct?`); process.exit(1); }
  const { data = [] } = await res.json();
  const wanted = /(llama-3\.[13].*instruct|qwen2\.5-(7|14|32|72)b-instruct|qwen3|mistral-nemo-instruct|gemma-[234].*-it|gpt-oss)/i;
  const picks = data.filter((m) => wanted.test(m.id)).map((m) => m.id).sort();
  console.log(`Your key can use ${data.length} models. Good candidates for Astra:\n`);
  console.log(picks.slice(0, 40).map((id) => `  ${id}`).join('\n') || '  (none matched; run with a model id you know)');
  console.log('\nNext: npm run test-models -- <model-1> <model-2> <model-3>');
  process.exit(0);
}

// Same grounding as the real app: TRAPPIST-1 e from the offline sample data.
const sample = JSON.parse(await readFile(new URL('../src/data/sample.json', import.meta.url), 'utf8'));
const raw = sample.planets.find((p) => p.pl_name === 'TRAPPIST-1 e');
const planet = { ...raw, hab: habitabilityReport(raw) };
const context = { selected_planet: planetContext(planet) };
const SYSTEM = `You are "Astra", a friendly virtual astronomer. Use ONLY the numbers in DATA. Never claim a planet is habitable or has life. Keep answers under 180 words.\n\nDATA:\n${JSON.stringify(context)}`;

// Q5 is a trap: the data has no density, so a good model must say it's unknown.
const QUESTIONS = [
  'Explain TRAPPIST-1 e to a 12-year-old.',
  'How does its size and the starlight it gets compare to Earth?',
  'Could it have liquid water? Be honest about uncertainty.',
  'Is there life on TRAPPIST-1 e?',
  'What is its density?',
];

let report = `# Astra model test (${new Date().toISOString().slice(0, 16)})\n\nPlanet: TRAPPIST-1 e. Check each answer for: correct numbers, honest uncertainty, no claims of life, Q5 should say density is not measured.\n`;
for (const model of models) {
  report += `\n## ${model}\n\n| Q | Time | Answer |\n|---|---|---|\n`;
  let total = 0;
  for (const [i, q] of QUESTIONS.entries()) {
    const t0 = Date.now();
    let answer;
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST', headers,
        body: JSON.stringify({ model, temperature: 0.4, max_tokens: 400, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: q }] }),
        signal: AbortSignal.timeout(60000),
      });
      const json = await res.json().catch(() => ({}));
      answer = res.ok ? json.choices?.[0]?.message?.content?.trim() : `ERROR ${res.status}: ${json?.error?.message ?? ''}`;
    } catch (err) { answer = `ERROR: ${err.message}`; }
    const secs = (Date.now() - t0) / 1000; total += secs;
    console.log(`${model} | Q${i + 1} | ${secs.toFixed(1)}s`);
    report += `| ${i + 1}. ${q} | ${secs.toFixed(1)}s | ${String(answer).replace(/\|/g, '\\|').replace(/\n+/g, ' ')} |\n`;
  }
  report += `\n**Average: ${(total / QUESTIONS.length).toFixed(1)} s per answer**\n`;
}
await writeFile(new URL('../docs/model-test-results.md', import.meta.url), report);
console.log('\nSaved docs/model-test-results.md. Read the answers and pick the best model.');
