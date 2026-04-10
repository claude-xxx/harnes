import { useEffect, useRef, useState } from 'react';
import { searchContent } from '../api';
import type { SearchHit } from '../types';

/**
 * サイドバー上部の検索欄 + 検索結果リスト。
 *
 * 1 ファイル 1 コンポーネント (FL-005)。
 * LoadedSearch + derive パターン (react-hooks/set-state-in-effect 回避)。
 * スタイリングは Tailwind CSS ユーティリティクラスのみ。
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

  const trimmed = query.trim();
  const search: SearchState =
    trimmed === ''
      ? { status: 'idle' }
      : loaded && loaded.query === trimmed
        ? loaded.status === 'success'
          ? { status: 'success', hits: loaded.hits }
          : { status: 'error', message: loaded.message }
        : { status: 'loading' };

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
    <div className="mb-3">
      <input
        type="search"
        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-gray-50 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:bg-white"
        placeholder="Search…"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Search content"
      />
      {search.status === 'loading' && <p className="text-xs text-gray-500 mt-2">Searching…</p>}
      {search.status === 'error' && (
        <p className="text-xs text-red-600 mt-2">Search failed: {search.message}</p>
      )}
      {search.status === 'success' && search.hits.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">No results</p>
      )}
      {search.status === 'success' && search.hits.length > 0 && (
        <ul className="list-none p-0 mt-2">
          {search.hits.map((hit) => (
            <li key={hit.path}>
              <button
                type="button"
                className="block w-full text-left p-2 border-none bg-transparent rounded cursor-pointer font-sans hover:bg-gray-100"
                onClick={() => onSelect(hit.path)}
              >
                <span className="block text-sm font-semibold text-gray-800">{hit.title}</span>
                <span className="block text-xs text-gray-500 mt-px">{hit.path}</span>
                {hit.matches.length > 0 && (
                  <span className="block text-xs text-gray-500 mt-1 truncate">
                    {hit.matches[0]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
