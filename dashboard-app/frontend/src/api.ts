import type { FileTree, SearchResult } from './types';

/**
 * BE API の薄い fetch wrapper。
 *
 * - 絶対 URL は書かない。常に `/api` 相対パスを使う
 *   (core-beliefs/frontend.md の候補原則)
 * - HTTP エラーは `Error` で throw して呼び出し側に伝える
 * - Zod 等でレスポンスをランタイム検証する仕組みは 3-B では入れない
 *   (TS の型で十分、契約テストは BE 側にある)
 */

export async function fetchFileTree(): Promise<FileTree> {
  const res = await fetch('/api/files');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as FileTree;
}

export async function fetchContent(path: string): Promise<string> {
  // path は BE 側で path traversal 防御済み。FE では URL エンコードのみ行う。
  const res = await fetch(`/api/content?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.text();
}

export async function searchContent(query: string): Promise<SearchResult> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as SearchResult;
}
