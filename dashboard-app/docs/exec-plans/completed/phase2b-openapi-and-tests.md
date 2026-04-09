# Phase 2-B: API 契約とテストループ（OpenAPI + Vitest）

- **状態**: completed
- **開始**: 2026-04-10
- **完了**: 2026-04-10
- **目的**: BE の API を **Zod スキーマを正（source of truth）** とする `@hono/zod-openapi` 流儀に書き換え、同じスキーマを使った **契約テスト** を Vitest で1本通す。Phase 2-B 完了時点で「ドキュメント・型・実装・テスト」が単一の Zod スキーマから派生する状態を作る。

> **1セッション1機能、1PR1目的を死守する。**
> Phase 2-A（静的検証）の成果物には触らない。テストは BE 側のみ、FE テストは別 exec-plan に分離。

---

## スコープ

### やる
- `@hono/zod-openapi` + `@hono/swagger-ui` を BE に導入
- 既存の `/api/health` と `/api/content` を `OpenAPIHono` + `createRoute` で書き直す
- Zod スキーマを `src/schemas/` に分離（再利用とテストからの import を可能にする）
- `/api/openapi.json` で OpenAPI 3.1 spec を配信
- `/api/doc` で Swagger UI を配信
- Vitest を BE に導入し、`app.fetch` を直接叩く **契約テスト** を1本書く
  - Zod スキーマで実レスポンスを `parse()` し、契約逸脱を検出する
- `core-beliefs/backend.md` に「API は Zod スキーマ駆動」原則を追記

### やらない（後続フェーズ）
- FE 側のテスト（Phase 2 後半 or 別フェーズ）
- Pre-commit hook で test を走らせる（Phase 2-C）
- カスタム lint で「ハンドラ直書きの禁止」を機械化（Phase 2-D で検討）
- OpenAPI spec の lint（Spectral 等）
- OpenAPI spec を fixture としてスナップショット化する e2e
- 認証・エラーフォーマット統一

---

## 設計判断

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| OpenAPI ライブラリ | **`@hono/zod-openapi`**（公式 middleware） | `OpenAPIHono` + `createRoute` のスキーマ駆動 API。`hono-openapi`（rhinobase）も候補だが、公式 middleware の方がエコシステム保証が強い。 |
| Swagger UI | **`@hono/swagger-ui`** | 同じく公式。`/api/doc` にマウント。 |
| OpenAPI spec endpoint | **`/api/openapi.json`** | Vite proxy を活かして FE 側からも閲覧可能に。`/api` プレフィックスで統一。 |
| Swagger UI endpoint | **`/api/doc`** | 同上。 |
| Zod のバージョン | **Zod v4**（`@hono/zod-openapi` が要求するもの） | 既存の Zod 依存はないので最新でよい。 |
| `text/markdown` レスポンス | `responses[200].content['text/markdown'].schema = z.string()` | 既存の `/api/content` の挙動を維持しつつ OpenAPI に記述。 |
| スキーマの置き場所 | `src/schemas/api.ts` | 単一ファイル。テストからも import される。バラけたら `src/schemas/<resource>.ts` に分割。 |
| ルートの置き場所 | `src/routes/<resource>.ts` か、当面は `src/index.ts` 内 | **当面は index.ts 内**。routes が3本超えたら分離。**過剰設計禁止**。 |
| テストランナー | **Vitest**（v3 系） | TS/ESM ネイティブで設定がほぼゼロ。 |
| テストの叩き方 | **`app.fetch(new Request(...))` を直接呼ぶ** | サーバ起動不要、ポート競合なし、Windows での `taskkill` 問題を回避。 |
| 契約テストの責務 | **「Zod スキーマ通りのレスポンスを返している」** ことのみ確認。ビジネスロジックの細部は別テストで。 |
| `test` を `check` に組み込むか | **組み込まない**。`check` は loop ①（決定的・速い静的検証）専用。`test` は loop ②（動的検証）として独立。 | summary.md の「3 つのフィードバックループ」を区別して持つ思想に従う。Pre-commit hook で結合するのは Phase 2-C。 |

---

## ディレクトリ構成（このフェーズで作るもの）

```
backend/
├── src/
│   ├── index.ts            ← OpenAPIHono に書き換え
│   ├── schemas/
│   │   └── api.ts          ← Zod スキーマ（新規）
│   └── routes/             ← 当面は空。3本超えたら作る。
├── tests/
│   └── api.test.ts         ← Vitest 契約テスト（新規）
├── vitest.config.ts        ← 新規
└── package.json            ← test script 追加
```

---

## やること（順番）

1. **依存追加**
   - `npm install @hono/zod-openapi @hono/swagger-ui zod`
   - `npm install -D vitest`
2. **スキーマ定義**
   - `src/schemas/api.ts` に `HealthSchema`, `ErrorSchema`, `ContentMarkdownSchema` を定義
3. **ルート書き換え**
   - `src/index.ts` を `OpenAPIHono` に置換
   - `createRoute` で `healthRoute`, `contentRoute` を定義
   - `app.openapi(healthRoute, handler)` / `app.openapi(contentRoute, handler)` で配線
   - `app.doc('/api/openapi.json', { openapi: '3.1.0', info: {...} })`
   - `app.get('/api/doc', swaggerUI({ url: '/api/openapi.json' }))`
4. **Vitest 設定**
   - `vitest.config.ts`（最小、`test.environment: 'node'`、`include: ['tests/**/*.test.ts']`）
   - `package.json` に `test`（watch）と `test:run`（CI 用 1-shot）を追加
5. **契約テストを書く**
   - `tests/api.test.ts`:
     - `GET /api/health` → 200, body を `HealthSchema.parse()` で検証
     - `GET /api/content` → 200, Content-Type が `text/markdown` を含む, body 文字列が `ContentMarkdownSchema.parse()` で検証 (= z.string())
     - `GET /api/openapi.json` → 200, JSON で `paths['/api/health']` / `paths['/api/content']` を含む
6. **静的検証 + テストを通す**
   - `bash scripts/check.sh` が green
   - `cd backend && npm run test:run` が green
7. **ドキュメント更新**
   - `AGENTS.md` の BE コマンド表に `test` / `test:run` を追加、OpenAPI/Swagger UI のエンドポイントを記載
   - `docs/core-beliefs/backend.md` に「API は Zod スキーマ駆動」原則を追加
8. **アーカイブ**
   - 学びを本ファイル末尾に追記し、`completed/` へ移動
   - 失敗があれば `failure-log.jsonl` に新規エントリを append

---

## ハーネス的観点での自戒

- **テストを大量に書かない**。最初の1ファイルで「契約 + プロセスとして動く」ことを示せれば十分。テスト網羅率は別フェーズで上げる。
- **API のロジック改造はしない**。`/api/content` が固定で `welcome.md` を返す挙動はそのまま。複数ファイル対応は Phase 3。
- **エラーフォーマットの統一・認証・CORS** などは触らない。誘惑に負けない。
- **`/api/doc` の見た目を整えない**。Swagger UI のデフォルトでよい。

---

## 既知のリスク / 不確実性

- `@hono/zod-openapi` の `text/markdown` レスポンス対応: JSON 以外のレスポンス記述は通るはずだが、実際に動かしてみないとわからない。失敗したら `responses` から content を外して `description` のみ書くフォールバックを取る。
- Zod v4 と `@hono/zod-openapi` のバージョン整合: install 後に typecheck で確認する。
- Vitest と `tsx` (BE の dev runner) は別系統。混ざっていない。

---

## 学び・遭遇した問題

### 作業ログ

- **app.ts と index.ts の分離**: テストから `app.fetch` を直接叩くために、Hono アプリ本体を `src/app.ts` に切り出し、`src/index.ts` は `serve()` のみを担当する起動エントリにした。これで Vitest はサーバを起動せずに `app.fetch(new Request(...))` を呼べる。**ポート競合ゼロ・Windows の `taskkill` 問題（FL-001）の発生余地ゼロ**。
- **`text/markdown` レスポンスの OpenAPI 記述**: `responses[200].content['text/markdown'].schema = z.string()` で問題なく通った。`@hono/zod-openapi` v1 系は JSON 以外の content type も素直に扱える。フォールバック（content を外す）は不要だった。
- **`tsconfig.json` の二重化**: テストファイルも typecheck したいが、`tsc` の build 出力に含めたくない。`tsconfig.json` を **typecheck 用（`noEmit: true`、`include: src + tests + vitest.config`）** に変更し、`tsconfig.build.json` を新規作成して **build 専用（`noEmit: false`、`rootDir: src`、`include: src のみ`）** とした。`npm run build` は `tsc -p tsconfig.build.json` を呼ぶ。
- **`HealthSchema` の `z.literal('ok')` と `c.json({ status: 'ok' as const }, 200)`**: `as const` を付けないと TS が `string` に広げてしまい、ハンドラの返り値がスキーマと合わずコンパイルエラーになる。これは **Zod スキーマ駆動の利点が型レベルで効いている証拠**。
- **`@hono/zod-openapi` の `z` は再エクスポート**: `import { z } from '@hono/zod-openapi'` で得られる `z` は `.openapi(...)` メタデータ拡張済みの Zod。素の `zod` から import すると `.openapi()` が型エラーになる。スキーマファイルでは前者を使う。

### 仕組み化に値する学び（→ core-beliefs に転記済み）

1. **API は Zod スキーマを source of truth とする**: ハンドラ・OpenAPI spec・テストがすべて単一スキーマから派生する。`backend.md` に黄金原則として追記済み。次フェーズでは「`app.get()` 直書きの禁止」を ESLint で機械化することを昇格候補に登録した。
2. **テストは `app.fetch` を直接叩く**: HTTP サーバを起動しない契約テストの方が、Windows 環境のプロセス管理問題を完全に避けられる。ポート競合ゼロ。これは BE のテスト全般のデフォルト方針として `backend.md` か別ファイルに追記してもよい（次回判断）。

### 完了時の状態

- BE 依存追加: `@hono/zod-openapi`, `@hono/swagger-ui`, `zod`, `vitest`
- 新規ファイル: `src/app.ts`, `src/schemas/api.ts`, `tests/api.test.ts`, `vitest.config.ts`, `tsconfig.build.json`
- 変更ファイル: `src/index.ts`, `tsconfig.json`, `package.json`
- `bash scripts/check.sh` → BE/FE 両方 0 警告 0 エラー
- `npm run test:run`（BE）→ 3 tests passed
- `npm run build`（BE）→ `dist/{app,index}.js` + `dist/schemas/api.js` のみ生成（テストは含まれない）
- `GET /api/openapi.json` が OpenAPI 3.1 spec を返し、`paths['/api/health']` と `paths['/api/content']` を含むことを契約テストで確認
- `GET /api/doc` が Swagger UI を返す（手動確認は次セッションの Phase 2-E で MCP 経由）
