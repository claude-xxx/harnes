# core-beliefs / backend

> `backend/` 配下を編集するときに読むファイル。

## 確立された原則

- **TDD: 新しいエンドポイント・ユーティリティを実装する前にテストを書く（FL-007）。**
  - API 契約テストは `tests/api.test.ts` に追加。Zod スキーマで実レスポンスを `parse()` して検証する。
  - `npm run test:run` で Vitest が走り、pre-commit hook で強制される。
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
- **ユーザー入力の相対パスを fs に渡す前に必ず `src/lib/safePath.ts` の `resolveWithinContent(CONTENT_DIR, userPath)` を経由する。**（Phase 3-A 確立）
  - traversal 判定ロジックを 1 箇所に集約することで、エンドポイントが増えてもルールの差分が出ないようにする。独自の path 正規化を handler 内に書かない。
  - `resolveWithinContent` が拒否するもの: 空文字 / null byte / 絶対パス / UNC パス (`\\server\share`, `//server/share`) / `..` 親参照 / symlink による CONTENT_DIR 脱出。
  - 再帰走査（例: `walkContent`）の内部でも同関数を通し、シンボリックリンクで外に出るエントリは静かにスキップする。
  - エラーハンドリングの標準パターン: `InvalidPathError` → 400 `{ error: 'invalid path' }`、`ENOENT` → 404 `{ error: 'not found' }`、それ以外の I/O エラー → 500。新しい読み取りエンドポイントはこのパターンを踏襲する。

## 検討中（昇格候補）

- **「`app.get()` 直書きの禁止」を ESLint で機械化する**（Phase 2-D 候補）。`no-restricted-syntax` で `OpenAPIHono` 以外のメソッド呼び出しを止めるか、`openapi()` 以外でハンドラを登録するパターンを検出する。今は core-belief とコードレビューに頼っているが、安定したら昇格させる。
- **「`readFile` / `readdir` の第 1 引数が `resolveWithinContent` の戻り値であること」を ESLint で機械化する**。現状は core-belief + レビューに頼っているが、handler が増えてきたら昇格候補。
- **`walkContent` を `{relPath, absPath}[]` も返す形に拡張する**。現在 `/api/search` ハンドラは `walkContent` → `collectFilePaths` → 各パスに `resolveWithinContent` を再呼出ししており、symlink stat が二重に走る。ファイル数が増えたときのパフォーマンス改善として、`walkContent` が検証済み absPath も一緒に返す形にリファクタする。現状のファイル数（3 本）では実害なし、ファイルが 20+ 本になったら着手する。

## 関連 failure-log エントリ

- Phase 3-A で path traversal 防御を `src/lib/safePath.ts` に集約し、契約テストで traversal 2+ パターンを押さえたため、FL エントリは起票せず先に潰した扱い（exec-plan `phase3a-be-multifile.md` の実装ステップ 14 参照）。実際に traversal 関連の事故が発生したらそのとき新規 FL を起票する。
