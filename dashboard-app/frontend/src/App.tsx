import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchFileTree, fetchContent } from './api';
import type { FileNode } from './types';
import { FileTree } from './components/FileTree';
import { SearchBar } from './components/SearchBar';
import { HarnessDashboard } from './components/HarnessDashboard';

type View = 'docs' | 'harness';

type TreeState =
  | { status: 'loading' }
  | { status: 'success'; tree: FileNode[] }
  | { status: 'error'; message: string };

type ContentState =
  | { status: 'loading' }
  | { status: 'success'; markdown: string }
  | { status: 'error'; message: string };

const INITIAL_PATH = 'welcome.md';

type LoadedContent =
  | { path: string; status: 'success'; markdown: string }
  | { path: string; status: 'error'; message: string };

function App() {
  const [view, setView] = useState<View>('docs');
  const [tree, setTree] = useState<TreeState>({ status: 'loading' });
  const [selectedPath, setSelectedPath] = useState<string>(INITIAL_PATH);
  const [loaded, setLoaded] = useState<LoadedContent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const content: ContentState =
    loaded && loaded.path === selectedPath
      ? loaded.status === 'success'
        ? { status: 'success', markdown: loaded.markdown }
        : { status: 'error', message: loaded.message }
      : { status: 'loading' };

  const showTree = searchQuery.trim() === '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchFileTree();
        if (!cancelled) {
          setTree({ status: 'success', tree: data.root });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setTree({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await fetchContent(selectedPath);
        if (!cancelled) {
          setLoaded({ path: selectedPath, status: 'success', markdown: text });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setLoaded({ path: selectedPath, status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPath]);

  const handleSearchQueryChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const navButtonClass = (target: View): string => {
    const base =
      'px-3 py-1.5 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-400';
    return view === target
      ? `${base} bg-blue-600 text-white`
      : `${base} bg-gray-100 text-gray-700 hover:bg-gray-200`;
  };

  return (
    <div className="mx-auto max-w-5xl min-h-screen px-6 py-8 font-sans text-gray-800">
      <header className="border-b border-gray-300 pb-4 mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold m-0">Claude Code Dashboard</h1>
        <nav aria-label="画面切り替え" data-testid="main-nav">
          <ul className="flex gap-2 list-none m-0 p-0">
            <li>
              <button
                type="button"
                className={navButtonClass('docs')}
                aria-current={view === 'docs' ? 'page' : undefined}
                onClick={() => setView('docs')}
              >
                Docs
              </button>
            </li>
            <li>
              <button
                type="button"
                className={navButtonClass('harness')}
                aria-current={view === 'harness' ? 'page' : undefined}
                onClick={() => setView('harness')}
              >
                Harness
              </button>
            </li>
          </ul>
        </nav>
      </header>
      {view === 'docs' && (
        <div className="flex gap-8 items-start">
          <aside
            className="w-64 shrink-0 border-r border-gray-300 pr-4 sticky top-8"
            data-testid="sidebar"
          >
            <SearchBar onSelect={setSelectedPath} onQueryChange={handleSearchQueryChange} />
            {showTree && tree.status === 'loading' && (
              <p className="text-sm text-gray-500">Loading tree…</p>
            )}
            {showTree && tree.status === 'error' && (
              <p className="text-red-600 text-sm" data-testid="tree-error">
                Failed to load tree: {tree.message}
              </p>
            )}
            {showTree && tree.status === 'success' && (
              <FileTree nodes={tree.tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
            )}
          </aside>
          <main className="flex-1 min-w-0">
            {content.status === 'loading' && (
              <p data-testid="loading" className="text-gray-500">
                Loading…
              </p>
            )}
            {content.status === 'error' && (
              <p data-testid="error" className="text-red-600">
                Failed to load content: {content.message}
              </p>
            )}
            {content.status === 'success' && (
              <article data-testid="content" className="prose prose-gray max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
              </article>
            )}
          </main>
        </div>
      )}
      {view === 'harness' && (
        <main className="flex-1 min-w-0">
          <HarnessDashboard />
        </main>
      )}
    </div>
  );
}

export default App;
