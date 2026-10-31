// "Astra", the AI virtual astronomer. Each question is sent with the selected
// planet's real data (see planetContext in lib/data.js) so answers stay grounded.
import { useEffect, useRef, useState } from 'react';

const SUGGESTIONS = [
  'Could this planet support liquid water?',
  'How does this planet compare to Earth?',
  'How was this planet discovered?',
  'What would the sky look like from here?',
];

/** Minimal, safe formatting: **bold** and line breaks only (no HTML injection). */
function Text({ text }) {
  return text.split('\n').map((line, i) => (
    <p key={i}>{line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith('**') ? <b key={j}>{part.slice(2, -2)}</b> : part))}</p>
  ));
}

const LANGS = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' };

export default function AstronomerChat({ messages, loading, onSend, onReset, language, setLanguage, contextLabel }) {
  const [input, setInput] = useState('');
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, loading]);
  const last = messages[messages.length - 1];
  const thinking = loading && (!last || last.role !== 'assistant' || !last.content);

  const submit = (text) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    onSend(t);
    setInput('');
  };

  return (
    <div className="chat">
      <div className="chat-context">
        <span>Talking about: <b>{contextLabel || 'nothing selected'}</b></span>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Answer language">
          {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {messages.length > 0 && <button className="small-btn" onClick={onReset}>New chat</button>}
      </div>
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-intro">
            <p>👩‍🚀 Hi, I’m <b>Astra</b>, your virtual astronomer. I answer using the NASA data for the planet you’ve selected.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => submit(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.filter((m) => m.content).map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error ? 'error' : ''} ${m.streaming ? 'streaming' : ''}`}><Text text={m.content} /></div>
        ))}
        {thinking && <div className="msg assistant typing">Astra is thinking…</div>}
        <div ref={end} />
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this world…" />
        <button className="primary" disabled={loading || !input.trim()}>Send</button>
      </form>
      <p className="muted small">AI answers can be wrong. Numbers come from the NASA Exoplanet Archive.</p>
    </div>
  );
}
