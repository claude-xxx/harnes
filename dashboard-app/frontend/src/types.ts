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

/**
 * /api/harness/* の型。BE 側の Zod スキーマ
 * (HarnessFailureLogSchema / HarnessExecPlansSchema / HarnessCoreBeliefsSchema)
 * と同期していること。
 */
export type HarnessFailureLog = {
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  totalValid: number;
  totalInvalid: number;
};

export type HarnessFailureLogTimelineEntry = {
  date: string;
  count: number;
};

export type HarnessFailureLogTimeline = {
  entries: HarnessFailureLogTimelineEntry[];
};

export type HarnessExecPlanEntry = {
  file: string;
  title: string;
  status: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

export type HarnessExecPlans = {
  active: HarnessExecPlanEntry[];
  completed: HarnessExecPlanEntry[];
};

export type HarnessCoreBeliefEntry = {
  file: string;
  category: string;
  established: number;
  candidates: number;
};

export type HarnessCoreBeliefs = {
  entries: HarnessCoreBeliefEntry[];
};
