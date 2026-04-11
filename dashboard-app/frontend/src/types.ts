/**
 * BE API の契約を反映した型定義。
 *
 * ここは `backend/src/schemas/api.ts` の Zod スキーマと形が一致している必要があります。
 * FE は BE package を直接 import していないため、型は手書きで同期しています。
 * BE 側の Zod が single source of truth なので、BE を触った際はこのファイルも
 * 更新してください（契約テストは BE 側でカバー済み）。
 *
 * 自動生成の仕組み（Zod → TS 型、OpenAPI → TS 型）は 3-B ではスコープ外。
 * 将来必要になったら別フェーズで独立して議論します。
 */

export type FileNode =
  | { type: 'file'; name: string; path: string; modifiedAt: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

export type FileTree = {
  root: FileNode[];
};

export type SearchHit = {
  path: string;
  title: string;
  matches: string[];
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
};
