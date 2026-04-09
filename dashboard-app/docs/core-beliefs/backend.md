# core-beliefs / backend

> `backend/` 配下を編集するときに読むファイル。

## 確立された原則

- **API は Zod スキーマを source of truth とする。**
  - 新しいエンドポイントを追加するときは、まず `src/schemas/api.ts`（または `src/schemas/<resource>.ts`）に Zod スキーマを書く。
  - **JSON / 構造化レスポンスを返すハンドラ** は **必ず `@hono/zod-openapi` の `createRoute` + `app.openapi()` 経由**で定義する。生の `app.get()` で JSON ハンドラを直書きしない（OpenAPI spec が静かにドリフトする原因）。
  - **例外（carve-out）**: 以下のような **API 契約を持たないユーティリティハンドラ** は素の `app.get()` で登録してよい。これらは JSON スキーマの対象ではないため:
    - `app.doc('/api/openapi.json', ...)`（spec 配信そのもの。`@hono/zod-openapi` の専用 API）
    - `app.get('/api/doc', swaggerUI(...))`（Swagger UI、HTML を返すだけ）
    - 静的ファイル配信、リダイレクト、ヘルスチェックの単純 200 など（ただし health check は本プロジェクトでは契約に乗せている）
    - 上記以外で carve-out が必要になったら **このリストを拡張する形で明示**する。暗黙の例外は禁止。
  - 契約テスト（`tests/api.test.ts` 系）は **同じ Zod スキーマで実レスポンスを `parse()`** して検証する。スキーマの import 元はハンドラと同一であること。
  - これにより「ドキュメント・型・実装・テスト」が単一スキーマから派生する状態を維持する。
  - OpenAPI spec は `GET /api/openapi.json`、Swagger UI は `GET /api/doc` で配信。
- **ESM (`"type": "module"`) を必須とする。** `npm init -y` が生成する commonjs は採用しない。新規パッケージを切る場合も同様。
- **API レスポンスの Content-Type は明示する。** Markdown を返すなら `text/markdown; charset=utf-8`。`c.body()` のオプションで指定する。
- **ファイルシステムアクセスは `backend/content/` 以下に限定する。** content 以外のディレクトリを fs で読まない（path traversal の温床）。

## 検討中（昇格候補）

- **「`app.get()` 直書きの禁止」を ESLint で機械化する**（Phase 2-D 候補）。`no-restricted-syntax` で `OpenAPIHono` 以外のメソッド呼び出しを止めるか、`openapi()` 以外でハンドラを登録するパターンを検出する。今は core-belief とコードレビューに頼っているが、安定したら昇格させる。

## 関連 failure-log エントリ

- `FL-002`（path traversal の予防）はまだ存在しないが、複数ファイル対応 API を作る Phase 3 で必須になる予定。
