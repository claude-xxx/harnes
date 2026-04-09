# Phase 3-A — BE 複数ファイル対応

- **状態**: completed（Phase 3-A 完了）
- **作成**: 2026-04-10
- **依存**: Phase 2 完了（`7a5a29d`）
- **親**: `phase3-overview.md`
- **スコープ**: BE のみ（FE は 3-B で触る、詳細は後述の「§ FE 非干渉の保ち方」）

---

## 目的

`backend/content/` 配下の Markdown を **再帰的に列挙** し、**任意のパスで個別取得** できる API を追加する。Phase 3-B のサイドバーツリー UI、Phase 3-C の検索の土台になる。

---

## 新しい API（Zod スキーマ駆動）

### 1. `GET /api/files` — ツリー列挙

`backend/content/` を再帰的に走査して、ツリー構造で返す。

```ts
// src/schemas/api.ts に追加
export type FileNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'directory'; name: string; path: string; children: FileNode[] };

export const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('file'),
      name: z.string(),
      path: z.string(), // content/ からの相対パス（例: "welcome.md", "commands/help.md"）
    }),
    z.object({
      type: z.literal('directory'),
      name: z.string(),
      path: z.string(),
      children: z.array(FileNodeSchema),
    }),
  ]),
);

export const FileTreeSchema = z.object({
  root: z.array(FileNodeSchema),
}).openapi('FileTree');
```

- `path` は **常に content/ からの forward-slash 相対パス**。OS 依存の区切り文字を漏らさない。
- ディレクトリは `children` が空配列でもよい（空ディレクトリ許容）。
- `.md` 以外のファイルは列挙しない（初期実装）。隠しファイル (`.`) と `node_modules` 的なものも無視。

### 2. `GET /api/content?path=<rel>` — 個別取得

- クエリ `path` を受け取り、`text/markdown; charset=utf-8` で本文を返す。
- `path` は **必須**（詳細は § 既存 `/api/content` の扱い）。
- `ContentQuerySchema` を Zod で定義し `createRoute` の `request.query` に渡す。

```ts
export const ContentQuerySchema = z.object({
  path: z.string().min(1),
});
```

### エラーレスポンス

| 状況 | HTTP | body |
| --- | --- | --- |
| path 未指定・空文字 | 400 | `{ error: 'path is required' }` |
| path traversal 検出 | 400 | `{ error: 'invalid path' }` |
| ファイル存在せず | 404 | `{ error: 'not found' }` |
| I/O エラー | 500 | `{ error: 'failed to read content' }` |

---

## path traversal 防御（最重要）

- `CONTENT_DIR = resolve(__dirname, '..', 'content')` を基準に、**解決後のパスが必ず `CONTENT_DIR` のサブツリーに収まる** ことを検証する。
- 実装方針:
  1. クエリ `path` を受け取ったら即座に `path.posix.normalize` で正規化（あるいは検査）し、先頭の `/`・`\`、絶対パス、Windows ドライブレター、`\\server\share` を拒否。
  2. `resolve(CONTENT_DIR, userPath)` した結果に対し、`resolved.startsWith(CONTENT_DIR + sep)` かつ `resolved !== CONTENT_DIR` をチェック（node の `path.relative` で `..` を含むかでも可）。
  3. `fs.realpath` でシンボリックリンクを解決し、再度 subtree チェック。シンボリックリンクで外に出るのを拒否。
- `/api/files` 側も、**走査中に realpath して CONTENT_DIR の外に出るエントリを無視** する（再帰走査にシンボリックリンクが混ざっても安全）。
- **utility 関数に切り出す**: `src/lib/safePath.ts`（仮）に `resolveWithinContent(userPath: string): Promise<string>` を置き、両エンドポイントで共通利用。traversal 判定を 1 箇所にまとめることで、ルールの差分が出ないようにする。

---

## 既存 `GET /api/content` の扱い（← ユーザーの決めが必要）

`phase3-overview.md` の DoD は (a) 互換維持 / (b) `?path` 必須にして即削除 の 2 択。そして **「3-A 単体では FE は触らない」** とも書いてある。

現状: `frontend/src/App.tsx:18` は `fetch('/api/content')` をパラメータなしで叩いている。

2 択は実際には両立しないので、以下の 3 案から選ぶ:

| 案 | 中身 | メリット | デメリット |
| --- | --- | --- | --- |
| **A1** | `GET /api/content` は**残す**（`welcome.md` を返す既存挙動のまま）。新しい個別取得は `GET /api/files/content?path=...` 等の**別 URL**で作る。3-B で FE 移行後、`/api/content` は別コミットで削除 | FE を一切触らない（3-A の境界がきれい）。DoD「FE を壊さない」を完全に満たす | URL が 2 つに分かれる。`core-beliefs` の「前方互換 hack を入れない」に抵触気味（ただし実質シムではなく「消すのを遅らせる」だけ） |
| **A2** | `GET /api/content?path=...` を**必須パラメータで**導入、同時に `frontend/src/App.tsx` を **1 行だけ** `fetch('/api/content?path=welcome.md')` に変更 | URL を 1 本化。core-beliefs 的にクリーン | 「3-A 単体では FE を触らない」を厳密には破る（ただし 1 行） |
| **A3** | `GET /api/content?path=...` を導入、`path` 未指定時は `welcome.md` にフォールバック | FE 変更不要、URL 1 本 | 明示的に backward-compat シム。core-beliefs 違反に近い。却下推奨 |

**推奨: A2**（URL 一本化、FE は最小の 1 行変更）。理由: overview の「FE は触らない」は「FE のレイアウト・データフローを 3-B 用に書き換えない」の意図と解釈するのが自然で、fetch 先の URL を 1 行変える程度は 3-A のスコープに入れるべき。A1 の「URL 2 本 → 後で片方消す」方が phase を跨いだ未完成状態が長く残る。

**この決定は § 実装ステップに入る前にユーザー確認する**（plan 承認時に合わせて決める）。

---

## Zod スキーマとルート定義（`src/schemas/api.ts` 追記）

- `FileNodeSchema`, `FileTreeSchema`, `ContentQuerySchema` を追加
- 既存の `ContentMarkdownSchema`, `ErrorSchema` は再利用
- `createRoute` は `src/app.ts`（または `src/routes/files.ts` に分離）で 2 つ追加
- **backend.md の原則厳守**: JSON レスポンスは必ず `createRoute + app.openapi()`。`app.get()` 直書きはしない

---

## 契約テスト（`tests/api.test.ts` に追記、最低 6 本）

1. `GET /api/files` が 200 + `FileTreeSchema.parse()` が通る
2. ツリーに新しく追加するサンプルファイル（後述）が含まれる（`commands/help.md` 等）
3. `GET /api/content?path=welcome.md` が 200 + `text/markdown` + 本文が空でない
4. `GET /api/content?path=commands/help.md` が 200（サブディレクトリ取得）
5. **path traversal: `?path=../../../etc/passwd`** が 400 もしくは 404（少なくとも `CONTENT_DIR` 外を読んでいないこと）
6. **path traversal: `?path=..%2F..%2Fetc%2Fpasswd`**（URL エンコード）が同じく拒否
7. 存在しないファイル `?path=nope.md` が 404
8. (A2 を選んだ場合) `path` クエリ未指定 `GET /api/content` が 400
9. **OpenAPI spec 検査**: `spec.paths['/api/files']` と `spec.paths['/api/content']` が両方存在。`/api/content` の parameters に `path` が含まれる

---

## サンプルファイル追加（`backend/content/`）

現状 `welcome.md` 1 本のみ。ツリー走査とサブディレクトリ取得をテストするため、最小 2 階層のサンプルを追加:

```
backend/content/
├── welcome.md                ← 既存
├── commands/
│   └── help.md               ← 新規（Claude Code の /help を紹介する短い md）
└── tips/
    └── keybindings.md        ← 新規（キーバインドの短いサンプル）
```

内容は 10〜20 行程度の軽量 Markdown でよい。レンダリングテストではないので中身は二の次、**ツリー構造と個別取得の経路を走らせることが目的**。

---

## FE 非干渉の保ち方

- (A1 採用時) FE は一切触らない。
- (A2 採用時) `frontend/src/App.tsx` の fetch URL 1 行のみ変更。他は触らない。type 定義・レイアウト・state はすべて 3-B。
- いずれにせよ **ブラウザ画面は `welcome.md` が表示され続ける**。`npm run dev` で目視確認、もしくは MCP `take_snapshot` で回帰確認（余力があれば）。

---

## 実装ステップ

1. ユーザーに本 plan を見せて承認を取る（特に § 既存 `/api/content` の扱い の案選択）
2. サンプルファイル 2 本を `backend/content/` に追加
3. `src/schemas/api.ts` にスキーマ追加
4. `src/lib/safePath.ts` 新設 — `resolveWithinContent` を実装（ユニットテスト不要、契約テストでカバー）
5. `src/app.ts` に `/api/files` と新 `/api/content` ルート追加（`createRoute + app.openapi()`）
6. (A2 の場合) `frontend/src/App.tsx` の fetch URL を 1 行更新
7. `tests/api.test.ts` に契約テスト追記
8. `cd backend && npm run test:run` → green
9. `bash scripts/check.sh` → green
10. `code-reviewer` subagent に diff をかけて core-beliefs 違反を検査
11. reviewer 指摘を評価し、必要なら修正
12. `git commit`（pre-commit hook を通す）
13. exec-plan を `completed/` に移動、`core-beliefs/backend.md` に path traversal 防御の確立済み原則を追記
14. `failure-log.jsonl` に新規エントリは不要（既知のリスクを先に潰している）

---

## DoD（Definition of Done）

- [ ] `GET /api/files` が `FileTreeSchema` 通りのレスポンスを返す
- [ ] `GET /api/content?path=...` が任意の `.md` を返す
- [ ] path traversal 攻撃が最低 2 パターンのテストで拒否されている
- [ ] 存在しないファイルが 404
- [ ] OpenAPI spec に新エンドポイントが載っている
- [ ] `scripts/check.sh` と `npm run test:run` が両 green
- [ ] `welcome.md` の既存レンダリングがブラウザで壊れていない
- [ ] `code-reviewer` subagent の指摘を評価済み
- [ ] `core-beliefs/backend.md` に path traversal 原則追記

---

## 非スコープ（3-A では**やらない**）

- サイドバーツリー UI（3-B）
- 検索機能（3-C）
- 2 つ目の subagent 追加（3-D、条件付き）
- Markdown 以外のファイル対応（画像・コード断片）
- キャッシュ、ETag、If-None-Match（過剰設計）
- ファイル書き込み API（read-only プロダクトなので恒久的に不要）
