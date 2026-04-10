# Phase 3-B — サイドバーツリー UI

- **状態**: completed（Phase 3-B 完了）
- **作成**: 2026-04-10
- **依存**: Phase 3-A 完了（`7c29c7b`） — `/api/files` と `/api/content?path=...` が必要
- **親**: `phase3-overview.md`
- **スコープ**: FE のみ。BE は触らない

---

## 目的

`/api/files` のツリーを左サイドバーに描画し、ファイルクリックで本文表示を切り替える。Phase 1 以来固定だった `welcome.md` から「複数ファイルを閲覧できるダッシュボード」へ進化する最小の 1 歩。

**非目的**: Notion 完全再現、フォルダ折りたたみのアニメーション、URL 同期、検索、モバイル最適化（いずれも過剰設計 or 別フェーズ）。

---

## ユーザーが見るもの（DoD 的な振る舞い）

1. `http://localhost:5173/` を開くと、左サイドバーにツリー（`welcome.md`, `commands/help.md`, `tips/keybindings.md`）が出る
2. 初期状態では `welcome.md` がハイライトされ、右側に本文がレンダリングされている（Phase 1 以来の挙動を壊さない）
3. `commands/help.md` をクリックすると右側が `/help` のページに切り替わる
4. `tips/keybindings.md` をクリックすると同様に切り替わる
5. 選択中のファイルはサイドバー上でハイライトされる
6. API 失敗時はそれぞれエラーメッセージが出る（ツリー失敗 / 本文失敗）
7. コンソールエラー 0 件（MCP `list_console_messages` で確認）

---

## アーキテクチャ

### コンポーネント分割（最小）

```
src/
├── App.tsx             ← レイアウト（sidebar + main）と state
├── App.css             ← sidebar/main のレイアウト追加
├── api.ts              ← 新規: fetch wrapper（/api/files と /api/content）
├── types.ts            ← 新規: FileNode 型（BE と形が一致）
└── components/
    └── FileTree.tsx    ← 新規: ツリー描画（再帰コンポーネント）
```

- **`api.ts`**: `fetchFileTree()` と `fetchContent(path)` を export する薄い wrapper。`/api` 相対パスを使う（`core-beliefs/frontend.md` の候補原則「絶対 URL を書かない」を守る）
- **`types.ts`**: BE の `FileNode` と同じ discriminated union 型を**手書き**する。BE の Zod から型生成する仕組みはまだ無いが、3-B で導入はしない（YAGNI、契約テストが BE 側にあるので FE の型手書きのコストは低い）
- **`FileTree.tsx`**: `FileNode[]` を受け取り、再帰的に `<ul>/<li>` でレンダリング。ディレクトリは常に展開（折りたたみは 3-B では入れない）。props に `onSelect(path)` と `selectedPath` を取る

### State 管理（App.tsx）

```ts
type TreeState =
  | { status: 'loading' }
  | { status: 'success'; tree: FileNode[] }
  | { status: 'error'; message: string };

type ContentState =
  | { status: 'idle' }     // 初期化前
  | { status: 'loading' }
  | { status: 'success'; markdown: string }
  | { status: 'error'; message: string };

const [tree, setTree] = useState<TreeState>({ status: 'loading' });
const [selectedPath, setSelectedPath] = useState<string>('welcome.md');
const [content, setContent] = useState<ContentState>({ status: 'loading' });
```

- マウント時に `fetchFileTree()` → `tree` 更新
- `selectedPath` が変わったら `fetchContent(selectedPath)` → `content` 更新（`useEffect` で dependency 管理）
- 初期 `selectedPath` は `'welcome.md'`。3-A で追加したサンプルファイルが存在する前提
- **Race condition 対策**: `useEffect` の cleanup 関数で `cancelled` フラグを立て、古い fetch の結果が setState を呼ばないようにする（Phase 1 の App.tsx が既にこのパターンを使っている）

### エラーハンドリング方針

- **ツリー取得失敗**: 左サイドバーに「ツリーを読み込めませんでした」と出す。右ペインは空 or メッセージのみ。**この状態からの復旧 UI（再試行ボタン）は作らない**（F5 リロードで十分、過剰設計を避ける）
- **本文取得失敗**: 右ペインに `Failed to load content: <message>` を出す。サイドバーは生きている（他ファイルを選び直せる）
- **選択中パスが 404**: BE の `/api/content?path=...` が 404 を返すので、`res.ok` チェックで `throw new Error('not found')` → `content` が error 状態
- **`selectedPath` がツリーに存在しない**場合でもクラッシュしない（単に fetch して 404 になるだけ）

---

## CSS（App.css 追記）

最小のレイアウト:

```css
.app-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.app-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #d0d7de;
  padding-right: 16px;
  position: sticky;
  top: 32px;
}

.file-tree ul {
  list-style: none;
  padding-left: 14px;
  margin: 4px 0;
}

.file-tree > ul {
  padding-left: 0;
}

.file-tree .node-label {
  display: block;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #24292f;
}

.file-tree .node-label:hover {
  background: #f6f8fa;
}

.file-tree .node-label.selected {
  background: #ddf4ff;
  color: #0969da;
  font-weight: 600;
}

.file-tree .node-directory > .node-label {
  cursor: default;
  color: #656d76;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.file-tree .node-directory > .node-label:hover {
  background: transparent;
}

.app-main {
  flex: 1;
  min-width: 0;  /* overflow 抑制 */
}
```

- 既存の `.app { max-width: 880px }` は狭すぎるので `.app-layout` が収まるよう `max-width` を 1080px 程度に広げる
- ディレクトリ見出しは「押せない小見出し」扱い。クリックでトグル展開はしない（3-B 非目的）
- **`em` 絵文字やアイコンフォントは使わない**（依存増を避ける）。ファイル/ディレクトリの区別は文字スタイルのみで表現

---

## 契約の接続: 手書き型 vs 自動生成

- **今回は手書き** (`src/types.ts`)。Zod → TS 型の自動生成（`z.infer` + BE からの再 export）は魅力的だが:
  - FE は BE package を直接 import していない（別 tsconfig / 別依存）
  - 契約の single source of truth は BE 側の Zod（契約テストでカバー済み）
  - FE の型が BE とずれたら UI が壊れるのでテストで即検出される
  - 自動生成の仕組みを入れるなら別フェーズで独立させる（過剰設計回避）
- 手書き型の drift 防御: `FileTree.tsx` の render ロジックで `node.type === 'file' | 'directory'` の discriminated union を使い、TS の `never` チェックで抜けを検出する

---

## 検証フロー（Explore → Plan → Implement → Verify → Record）

### Implement

1. `src/types.ts` 作成
2. `src/api.ts` 作成
3. `src/components/FileTree.tsx` 作成
4. `App.tsx` リライト（layout + state + effects）
5. `App.css` 追記
6. `bash scripts/check.sh`（lint + typecheck + format）
7. BE 契約テストは変更なしのはずだが `cd backend && npm run test:run` で念のため green 確認

### Verify（MCP UI ループ、`core-beliefs/frontend.md` のレシピ準拠）

1. dev server 起動確認: `netstat -ano | grep -E ':3001|:5173' | grep LISTEN`
   - 起動していなければユーザーに起動を依頼（エージェントが勝手に起動しない運用、**ユーザーが既に起動している前提**）
2. `list_pages` → 既存タブ把握
3. `new_page` で `http://localhost:5173/` を開く
4. `take_snapshot` で:
   - サイドバーに `welcome.md`, `commands`, `help.md`, `tips`, `keybindings.md` が出ていること
   - 右ペインに `Welcome to Claude Code Dashboard` の h1 が出ていること
5. `list_console_messages`（error/warn 絞り）→ 0 件確認
6. `list_network_requests` → `/api/files` 200, `/api/content?path=welcome.md` 200 確認
7. `click` で `commands/help.md` に相当するノードをクリック
8. `wait_for` で `/help — ヘルプを表示する` が現れるのを待つ
9. 再度 `take_snapshot` で切り替わりを確認
10. 自分で開いたタブは `close_page`（既存タブは触らない）

### Record

1. `code-reviewer` subagent に差分をかける（複数ファイルまたがる + `frontend/src/` を触る + `docs/` 追加 → 呼び出し条件に該当）
2. reviewer 指摘を評価・反映
3. `git commit`（pre-commit hook 通過）
4. `phase3b-sidebar-tree-ui.md` を `completed/` に移動
5. `core-beliefs/frontend.md` の候補原則（react-markdown 経由、`/api` 相対 URL）のうち、3-B で実際に使ったものを「確立された原則」に昇格させるか判断

---

## DoD（Definition of Done）

- [ ] 初期表示で `welcome.md` が Phase 1 と同様にレンダリングされる
- [ ] サイドバーに `/api/files` のツリーが出る
- [ ] `commands/help.md` をクリックすると本文が切り替わる
- [ ] `tips/keybindings.md` をクリックすると本文が切り替わる
- [ ] 選択中のファイルがサイドバーでハイライトされる
- [ ] `bash scripts/check.sh` が green
- [ ] `cd backend && npm run test:run` が green（回帰なし）
- [ ] MCP `list_console_messages` でエラー 0 件
- [ ] MCP `list_network_requests` で `/api/files` と `/api/content?path=...` が 200
- [ ] `code-reviewer` subagent の指摘を評価済み

---

## 非スコープ（3-B では**やらない**）

- **URL 同期**（`?file=commands/help.md` でブックマーク可能にする）→ react-router 導入が必要、別フェーズ
- **ディレクトリ折りたたみ**（クリックで開閉）→ state が増える、Notion 風見た目はあとで
- **検索**（3-C 担当）
- **キーボード操作**（↑↓ で移動）→ a11y 重要だが後追いでよい
- **モバイル対応**（sidebar が drawer になる）
- **BE 側の型自動生成**（Zod → TS）→ 別フェーズで議論
- **Playwright 導入**（Phase 2-G 予約、3-B では着手しない）
- **シンタックスハイライト**（Phase 1 から punt 中、別フェーズ）

---

## 既知のリスク

- **BE 契約ドリフト**: `FileNode` 型を FE で手書きするため、BE Zod が変わったら FE が静かに壊れる可能性。今回は BE を触らないので低リスク。将来 BE 側を触るときは FE の型も更新する運用。`core-beliefs/frontend.md` に昇格させるかは 3-B 完了後に判断
- **MCP dev server の状態依存**: ユーザーの dev server が立っていないと Verify できない。立っていなければ実装完了後にユーザーへ報告し、起動後に MCP ループを回す
- **CSS の `max-width` 変更で Phase 1 の見た目と差が出る**: 狙いどおりだが、ユーザーが「前の方が良かった」と感じる可能性あり。その場合は値を調整
