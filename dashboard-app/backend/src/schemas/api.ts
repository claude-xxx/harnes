import { z } from '@hono/zod-openapi';

/**
 * API レスポンス契約の Zod スキーマ。
 *
 * このファイルが BE API の **唯一の真実（source of truth）** です。
 * - ハンドラはこのスキーマに準拠したレスポンスを返す
 * - OpenAPI spec はこのスキーマから自動生成される
 * - 契約テスト（tests/api.test.ts）はこのスキーマで実レスポンスを parse して検証する
 *
 * 新しい API を追加するときは、まずここにスキーマを書いてからルートを作ること。
 * （core-beliefs/backend.md 参照）
 */

export const HealthSchema = z
  .object({
    status: z.literal('ok').openapi({ example: 'ok' }),
  })
  .openapi('Health');

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'failed to read content' }),
  })
  .openapi('Error');

/**
 * `/api/content` のレスポンス本文（プレーンな Markdown 文字列）。
 * Content-Type は `text/markdown; charset=utf-8`。
 */
export const ContentMarkdownSchema = z.string().openapi('ContentMarkdown', {
  description: 'Raw Markdown text of the requested content file.',
  example: '# Welcome\n\nThis is a sample.\n',
});

/**
 * `/api/content` のクエリパラメータ。
 * `path` は `backend/content/` からの forward-slash 相対パス。
 * 絶対パス・`..`・URL エンコード済みの traversal は src/lib/safePath.ts で拒否する。
 */
export const ContentQuerySchema = z
  .object({
    path: z
      .string()
      .min(1)
      .openapi({
        param: { name: 'path', in: 'query' },
        example: 'welcome.md',
      }),
  })
  .openapi('ContentQuery');

/**
 * `/api/files` が返すツリーノード。
 *
 * `path` は常に `backend/content/` からの forward-slash 相対パス
 * （OS 依存のパス区切りを API 越しに漏らさない）。
 *
 * `z.lazy` を使っているのは `directory.children` で自己再帰するため。
 * 明示的な `FileNode` type を与えることで TS が型を決定できるようにしている。
 */
export type FileNode =
  | { type: 'file'; name: string; path: string; modifiedAt: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

const FileSchema = z
  .object({
    type: z.literal('file'),
    name: z.string(),
    path: z.string(),
    modifiedAt: z.string().datetime().openapi({ example: '2026-04-10T14:30:00.000Z' }),
  })
  .openapi('FileEntry');

export const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.union([
    FileSchema,
    z
      .object({
        type: z.literal('directory'),
        name: z.string(),
        path: z.string(),
        children: z.array(FileNodeSchema),
      })
      .openapi('DirectoryEntry'),
  ]),
);

export const FileTreeSchema = z
  .object({
    root: z.array(FileNodeSchema),
  })
  .openapi('FileTree');

/**
 * `/api/search` のクエリパラメータ。
 */
export const SearchQuerySchema = z
  .object({
    q: z
      .string()
      .min(1)
      .openapi({
        param: { name: 'q', in: 'query' },
        example: 'help',
      }),
  })
  .openapi('SearchQuery');

export const SearchHitSchema = z
  .object({
    path: z.string().openapi({ example: 'commands/help.md' }),
    title: z.string().openapi({ example: '/help — ヘルプを表示する' }),
    matches: z
      .array(z.string())
      .openapi({ example: ['Claude Code の `/help` はセッション中に使える…'] }),
  })
  .openapi('SearchHit');

export const SearchResultSchema = z
  .object({
    query: z.string(),
    hits: z.array(SearchHitSchema),
  })
  .openapi('SearchResult');

/**
 * `/api/harness/failure-log` のレスポンス。
 *
 * 集計のみを返す（レコード全件リストは返さない、exec-plan 非スコープ）。
 * `byStatus` / `byCategory` は動的なキー集合のため `z.record(z.number())` を使う。
 */
export const HarnessFailureLogSchema = z
  .object({
    byStatus: z.record(z.string(), z.number().int().nonnegative()).openapi({
      example: { open: 2, promoted: 3 },
    }),
    byCategory: z.record(z.string(), z.number().int().nonnegative()).openapi({
      example: { frontend: 1, backend: 0, infra: 0, tooling: 1, process: 3 },
    }),
    totalValid: z.number().int().nonnegative().openapi({ example: 5 }),
    totalInvalid: z.number().int().nonnegative().openapi({ example: 0 }),
  })
  .openapi('HarnessFailureLog');

/**
 * `/api/harness/failure-log/timeline` のレスポンス。
 *
 * 日付別 failure 件数を昇順で返す。
 */
export const HarnessFailureLogTimelineEntrySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .openapi({ example: '2026-04-09' }),
    count: z.number().int().nonnegative().openapi({ example: 3 }),
  })
  .openapi('HarnessFailureLogTimelineEntry');

export const HarnessFailureLogTimelineSchema = z
  .object({
    entries: z.array(HarnessFailureLogTimelineEntrySchema),
  })
  .openapi('HarnessFailureLogTimeline');

export const HarnessExecPlanEntrySchema = z
  .object({
    file: z.string().openapi({ example: 'harness-dashboard.md' }),
    title: z.string().openapi({ example: 'ハーネス観測ダッシュボード' }),
    status: z.string().nullable().openapi({ example: 'planned' }),
    createdAt: z.string().nullable().openapi({ example: '2026-04-12' }),
    completedAt: z.string().nullable().openapi({ example: null }),
  })
  .openapi('HarnessExecPlanEntry');

export const HarnessExecPlansSchema = z
  .object({
    active: z.array(HarnessExecPlanEntrySchema),
    completed: z.array(HarnessExecPlanEntrySchema),
  })
  .openapi('HarnessExecPlans');

export const HarnessCoreBeliefEntrySchema = z
  .object({
    file: z.string().openapi({ example: 'frontend.md' }),
    category: z.string().openapi({ example: 'frontend' }),
    established: z.number().int().nonnegative().openapi({ example: 7 }),
    candidates: z.number().int().nonnegative().openapi({ example: 1 }),
  })
  .openapi('HarnessCoreBeliefEntry');

export const HarnessCoreBeliefsSchema = z
  .object({
    entries: z.array(HarnessCoreBeliefEntrySchema),
  })
  .openapi('HarnessCoreBeliefs');
