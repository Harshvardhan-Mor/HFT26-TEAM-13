// React hook that talks to Astra (POST /api/chat) and streams the reply word by word.
// Owned by the "AI astronomer" area: App.jsx only calls send() and reset().
import { useCallback, useEffect, useRef, useState } from 'react';

const CLIENT_TIMEOUT_MS = 30000; // safety net in the browser if the server never answers

export default function useAstra() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const abortRef = useRef(null);
  const messagesRef = useRef(messages); // latest messages, readable outside render
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /** Start a fresh conversation (e.g. when the user switches planets). */
  const reset = useCallback(() => {
    const pending = abortRef.current;
    abortRef.current = null; // so the aborted request knows it was cancelled on purpose
    pending?.abort();
    setMessages([]);
    setLoading(false);
  }, []);

  const send = useCallback(async (text, context) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);

    // Earlier turns (minus any half-finished or failed answers) + the new question.
    const history = [...messagesRef.current.filter((m) => !m.error && m.content && !m.streaming), { role: 'user', content: text }];
    setMessages((prev) => [...prev.filter((m) => !m.streaming), { role: 'user', content: text }, { role: 'assistant', content: '', streaming: true }]);
    setLoading(true);

    // Replace the last (assistant) message.
    const update = (fn) => setMessages((prev) => {
      const copy = prev.slice();
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context, language, stream: true }),
        signal: ctrl.signal,
      });

      // Errors come back as JSON with a friendly message.
      if (!res.ok || (res.headers.get('content-type') || '').includes('application/json')) {
        const json = await res.json().catch(() => ({}));
        update(() => ({ role: 'assistant', content: `⚠️ ${json.error || `Astra hit an error (${res.status}).`}`, error: true }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        update((m) => ({ ...m, content: m.content + chunk }));
      }
      update((m) => ({ ...m, streaming: false, content: m.content.trim() || '(no reply)' }));
    } catch (err) {
      if (err.name === 'AbortError' && abortRef.current !== ctrl) return; // replaced by a newer question
      update(() => ({
        role: 'assistant',
        error: true,
        content: err.name === 'AbortError'
          ? '⚠️ Astra took too long to answer. Try again, or ask a shorter question.'
          : `⚠️ Could not reach the AI server: ${err.message}. Is \`npm run dev\` still running?`,
      }));
    } finally {
      clearTimeout(timer);
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, [language]);

  return { messages, loading, send, reset, language, setLanguage };
}
