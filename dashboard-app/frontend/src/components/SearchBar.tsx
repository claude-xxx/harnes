import { useEffect, useRef, useState } from 'react';
import { searchContent } from '../api';
import type { SearchHit } from '../types';

/**
 * サイドバー上部の検索欄 + 検索結果リスト。
 *
 * - 入力ありの間はツリーの代わりに検索結果を表示（App 側で切り替え）
 * - 300ms debounce 後に `GET /api/search?q=...` を叩く
 * - 結果クリックで `onSelect(path)` → 右ペインに本文表示
 * - 検索欄クリアでツリーに戻る（`onQueryChange('')` → App 側で切り替え）
 *
 * 1 ファイル 1 コンポーネント (FL-005)。
 * useEffect 内の同期 setState を避け、loaded result + derive パターンを使う
 * (core-beliefs/frontend.md: react-hooks/set-state-in-effect)。
 */

type SearchBarProps = {
  onSelect: (path: string) => void;
  onQueryChange: (query: string) => void;
};

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; hits: SearchHit[] }
  | { status: 'error'; message: string };

type LoadedSearch =
  | { query: string; status: 'success'; hits: SearchHit[] }
  | { query: string; status: 'error'; message: string };

const DEBOUNCE_MS = 300;

export function SearchBar({ onSelect, onQueryChange }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState<LoadedSearch | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive display state (no sync setState in effect)
  const trimmed = query.trim();
  const search: SearchState =
    trimmed === ''
      ? { status: 'idle' }
      : loaded && loaded.query === trimmed
        ? loaded.status === 'success'
          ? { status: 'success', hits: loaded.hits }
          : { status: 'error', message: loaded.message }
        : { status: 'loading' };

  // Debounced search effect
  useEffect(() => {
    if (trimmed === '') return;

    let cancelled = false;

    debounceRef.current = setTimeout(() => {
      (async () => {
        try {
          const result = await searchContent(trimmed);
          if (!cancelled) {
            setLoaded({ query: trimmed, status: 'success', hits: result.hits });
          }
        } catch (err) {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'unknown error';
            setLoaded({ query: trimmed, status: 'error', message });
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed]);

  const handleChange = (value: string) => {
    setQuery(value);
    onQueryChange(value);
  };

  return (
    <div className="search-bar">
      <input
        type="search"
        className="search-input"
        placeholder="Search…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Search content"
      />
      {search.status === 'loading' && <p className="search-status">Searching…</p>}
      {search.status === 'error' && (
        <p className="search-status error">Search failed: {search.message}</p>
      )}
      {search.status === 'success' && search.hits.length === 0 && (
        <p className="search-status">No results</p>
      )}
      {search.status === 'success' && search.hits.length > 0 && (
        <ul className="search-results">
          {search.hits.map((hit) => (
            <li key={hit.path}>
              <button type="button" className="search-hit" onClick={() => onSelect(hit.path)}>
                <span className="search-hit-title">{hit.title}</span>
                <span className="search-hit-path">{hit.path}</span>
                {hit.matches.length > 0 && (
                  <span className="search-hit-snippet">{hit.matches[0]}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
