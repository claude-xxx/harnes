import type {
  FileTree,
  SearchResult,
  HarnessFailureLog,
  HarnessExecPlans,
  HarnessCoreBeliefs,
} from './types';

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

/* ------------------------------------------------------------------ */
/*                     /api/harness/* wrappers                         */
/* ------------------------------------------------------------------ */

/**
 * 軽量な shape ガード。Zod を依存に入れるよりも、fetch wrapper 層で
 * 期待プロパティが存在することだけ検査する。
 * BE 契約テスト側で schema は担保されており、ここは「想定外の形を返された」
 * ケースで UI がクラッシュしないためのセーフネット（AC-R2）。
 */
function hasOwn(obj: unknown, key: string): boolean {
  return typeof obj === 'object' && obj !== null && key in obj;
}

export async function fetchHarnessFailureLog(): Promise<HarnessFailureLog> {
  const res = await fetch('/api/harness/failure-log');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!hasOwn(json, 'byStatus') || !hasOwn(json, 'byCategory')) {
    throw new Error('invalid response shape');
  }
  return json as HarnessFailureLog;
}

export async function fetchHarnessExecPlans(): Promise<HarnessExecPlans> {
  const res = await fetch('/api/harness/exec-plans');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (
    !hasOwn(json, 'active') ||
    !hasOwn(json, 'completed') ||
    !Array.isArray((json as { active: unknown }).active) ||
    !Array.isArray((json as { completed: unknown }).completed)
  ) {
    throw new Error('invalid response shape');
  }
  return json as HarnessExecPlans;
}

export async function fetchHarnessCoreBeliefs(): Promise<HarnessCoreBeliefs> {
  const res = await fetch('/api/harness/core-beliefs');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!hasOwn(json, 'entries') || !Array.isArray((json as { entries: unknown }).entries)) {
    throw new Error('invalid response shape');
  }
  return json as HarnessCoreBeliefs;
}
