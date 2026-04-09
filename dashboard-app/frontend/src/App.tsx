import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; markdown: string }
  | { status: 'error'; message: string };

function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/content');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        if (!cancelled) {
          setState({ status: 'success', markdown: text });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setState({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Code Dashboard</h1>
        <p className="subtitle">Phase 1 — first vertical slice</p>
      </header>
      <main className="app-main">
        {state.status === 'loading' && <p data-testid="loading">Loading…</p>}
        {state.status === 'error' && (
          <p data-testid="error" className="error">
            Failed to load content: {state.message}
          </p>
        )}
        {state.status === 'success' && (
          <article data-testid="content" className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.markdown}</ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}

export default App;
