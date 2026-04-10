import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchFileTree, fetchContent } from './api';
import type { FileNode } from './types';
import { FileTree } from './components/FileTree';
import { SearchBar } from './components/SearchBar';
import './App.css';

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

  // ツリー取得（マウント時 1 回のみ）
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

  // 本文取得（selectedPath が変わるたびに）
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Code Dashboard</h1>
      </header>
      <div className="app-layout">
        <aside className="app-sidebar" data-testid="sidebar">
          <SearchBar onSelect={setSelectedPath} onQueryChange={handleSearchQueryChange} />
          {showTree && tree.status === 'loading' && <p>Loading tree…</p>}
          {showTree && tree.status === 'error' && (
            <p className="error" data-testid="tree-error">
              Failed to load tree: {tree.message}
            </p>
          )}
          {showTree && tree.status === 'success' && (
            <FileTree nodes={tree.tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
          )}
        </aside>
        <main className="app-main">
          {content.status === 'loading' && <p data-testid="loading">Loading…</p>}
          {content.status === 'error' && (
            <p data-testid="error" className="error">
              Failed to load content: {content.message}
            </p>
          )}
          {content.status === 'success' && (
            <article data-testid="content" className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
