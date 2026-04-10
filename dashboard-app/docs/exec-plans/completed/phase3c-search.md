# Phase 3-C — 検索機能

- **状態**: completed（Phase 3-C 完了）
- **作成**: 2026-04-10
- **依存**: Phase 3-A 完了（`7c29c7b`）
- **親**: `phase3-overview.md`
- **スコープ**: BE + FE

---

## 目的

`backend/content/` 配下の全 Markdown を対象に、タイトル/本文のキーワード検索を提供する。overview の方針: **最初は BE 側で全件 grep**。

---

## BE: `GET /api/search?q=<keyword>`

### レスポンス

```ts
// src/schemas/api.ts に追加
export const SearchQuerySchema = z.object({
  q: z.string().min(1).openapi({
    param: { name: 'q', in: 'query' },
    example: 'help',
  }),
});

export const SearchHitSchema = z.object({
  path: z.string(),           // content/ からの相対パス
  title: z.string(),          // 最初の # 見出し (なければファイル名)
  matches: z.array(z.string()), // マッチした行 (前後トリム、最大 3 行)
}).openapi('SearchHit');

export const SearchResultSchema = z.object({
  query: z.string(),
  hits: z.array(SearchHitSchema),
}).openapi('SearchResult');
```

### 実装方針

- `walkContent` の既存ロジック（`app.ts`）を再利用して全 `.md` を走査
- 各ファイルを `readFile` して全行を検索（大文字小文字を無視、`toLowerCase()` で比較）
- マッチした行は前後の空白トリムのみ、最大 3 行まで（レスポンスの肥大化防止）
- title は最初の `# ` で始まる行。なければファイル名
- `q` 未指定・空文字 → 400
- 結果 0 件でも 200（`hits: []`）

### path traversal

- 検索対象は `walkContent` が返すファイルのみ。ユーザー入力のパスは受け取らないので traversal リスクは `/api/content` より低い。ただし `resolveWithinContent` を通す既存のガードは維持

### 契約テスト（3〜4 本追加）

1. `GET /api/search?q=help` → 200、`SearchResultSchema.parse()` 通る、hits に `commands/help.md` が含まれる
2. `GET /api/search?q=xyznonexistent` → 200、`hits` が空配列
3. `GET /api/search` (q 未指定) → 400
4. OpenAPI spec に `/api/search` が存在、parameters に `q` がある

---

## FE: サイドバーに検索入力 + 結果表示

### UI 振る舞い

1. サイドバー上部に `<input type="search" placeholder="Search...">` を追加
2. 入力があると 300ms debounce 後に `GET /api/search?q=...` を叩く
3. 検索中はサイドバーに「Searching…」を表示
4. 結果が返ったら **ツリーの代わりに** 検索結果リストを表示（ツリーは一時非表示）
5. 各結果は `title` + `path` + マッチ行スニペット（1〜2 行）
6. 結果をクリック → `selectedPath` が変わり右ペインに本文表示
7. 検索欄をクリアしたら元のツリーに戻る
8. 0 件は「No results」メッセージ

### 新規ファイル

- `src/components/SearchBar.tsx` — 検索入力 + 結果リスト（1 ファイル 1 コンポーネント、FL-005）
- `src/api.ts` に `searchContent(query)` 追加
- `src/types.ts` に `SearchHit` / `SearchResult` 型追加
- `App.css` に検索関連スタイル追加

### App.tsx の変更

- `searchQuery` state を追加
- `searchQuery` が空なら FileTree、非空なら SearchBar（結果表示）をサイドバーに描画
- 検索入力は sidebar 内の固定ヘッダー、ツリー or 結果はその下

---

## DoD

- [ ] `GET /api/search?q=help` が SearchResultSchema 通りのレスポンスを返す
- [ ] `q` 未指定が 400
- [ ] 0 件ヒットが `hits: []` で 200
- [ ] OpenAPI spec に `/api/search` が載っている
- [ ] FE: 検索欄に入力するとリアルタイムで結果表示
- [ ] FE: 結果クリックで本文切り替え
- [ ] FE: 検索クリアでツリーに戻る
- [ ] `scripts/check.sh` + `npm run test:run` 両 green
- [ ] MCP UI ループ: 検索入力 → 結果表示 → クリック → 本文切り替え → クリア → ツリー復帰
- [ ] コンソールエラー 0 件
- [ ] `code-reviewer` 指摘を評価済み

---

## 非スコープ

- 正規表現検索（単純な文字列マッチのみ）
- ハイライト（マッチ箇所の本文中ハイライト）→ 別フェーズ
- インクリメンタルインデックス / 全文検索エンジン（過剰設計）
- ページネーション（ファイル数が少ないので不要）
- 検索結果のソート（出現順 = ファイル走査順で十分）
