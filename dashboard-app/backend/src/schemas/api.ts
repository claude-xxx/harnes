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
