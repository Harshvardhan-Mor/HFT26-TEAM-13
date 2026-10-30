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

export default function AstronomerChat({ messages, loading, onSend, contextLabel }) {
  const [input, setInput] = useState('');
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const submit = (text) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    onSend(t);
    setInput('');
  };

  return (
    <div className="chat">
      <div className="chat-context">Talking about: <b>{contextLabel || 'nothing selected'}</b></div>
      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-intro">
            <p>👩‍🚀 Hi, I’m <b>Astra</b>, your virtual astronomer. I answer using the NASA data for the planet you’ve selected.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => submit(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error ? 'error' : ''}`}><Text text={m.content} /></div>
        ))}
        {loading && <div className="msg assistant typing">Astra is thinking…</div>}
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
