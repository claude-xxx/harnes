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
  | { type: 'file'; name: string; path: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

const FileSchema = z
  .object({
    type: z.literal('file'),
    name: z.string(),
    path: z.string(),
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
