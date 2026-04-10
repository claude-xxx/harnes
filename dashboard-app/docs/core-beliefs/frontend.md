# core-beliefs / frontend

> `frontend/` 配下を編集するときに読むファイル。

## 確立された原則

- **UI 描画の最終確認は Chrome DevTools MCP の `take_snapshot` を一次手段にする**（Phase 2-E で導入）。
  - スクリーンショット (`take_screenshot`) は補助。a11y ツリーのテキスト diff の方がエージェントには扱いやすく、ログとしても残しやすい。
  - **ループは 1 機能 1 周** で終わらせる。網羅 UI テストの代替ではない。網羅は将来 Phase 2-G の Playwright 担当（下記「検討中」参照）。
  - dev server を **自分で起動した場合に限り** 終了時に taskkill で落とす（`FL-001` のレシピ）。**ユーザーが先に起動していた場合は触らない**。
  - 関連: `failure-log.jsonl` の `FL-002`（Phase 2-E で `promoted` に昇格、`promoted_to: "mcp:chrome-devtools"`）。

  #### 最小レシピ（次にエージェントが UI 検証するときの最短経路）

  1. dev server が両方起動していることを確認: `netstat -ano | grep -E ':3001|:5173' | grep LISTEN`
  2. `mcp__chrome-devtools__list_pages` で既存タブを把握
  3. `mcp__chrome-devtools__new_page` で `http://localhost:5173/` を開く
  4. `mcp__chrome-devtools__take_snapshot` で a11y ツリーを取得し、期待されるテキスト・見出しが含まれているか確認
  5. `mcp__chrome-devtools__list_console_messages`（`types: ["error", "warn"]` で絞る）で 0 件を確認
  6. `mcp__chrome-devtools__list_network_requests`（`resourceTypes: ["fetch", "xhr", "document"]`）で `/api/*` の status を確認
  7. コードを編集したら `mcp__chrome-devtools__wait_for` で期待文字列が画面に現れるまで待機 → 自動で snapshot が返る
  8. 自分で開いたタブは `mcp__chrome-devtools__close_page` で閉じる（**既存タブは閉じない**）

  失敗時は `list_console_messages` を絞らずに全件取って原因切り分け。スクショを取りたいときだけ `take_screenshot`（`filePath` を指定するとファイル保存も可能）。

- **Markdown レンダリングは `react-markdown + remark-gfm` を経由する。** 直接 DOM に Markdown 文字列を埋め込まない (`dangerouslySetInnerHTML` 禁止)。Phase 3-B で 3 ファイルを切り替えて検証、候補から昇格。
- **API 通信は `/api` 相対パスのみ使う。** 絶対 URL（`http://localhost:3001/...`）を書かない。Vite dev proxy + 将来の同一オリジン配信を両立させるため。Phase 3-B で `src/api.ts` を切り出して一箇所に集約、候補から昇格。
- **BE API の fetch は `src/api.ts` の wrapper を経由する。** コンポーネント内で直接 `fetch('/api/...')` を書かない。URL 組み立てとエラー整形を 1 箇所に閉じ込めるため（Phase 3-B 確立）。
- **useEffect 内で同期 setState しない（`react-hooks/set-state-in-effect` ESLint rule で強制）。** 必要なら render 時に derive する (Phase 3-B の `LoadedContent` + derive パターン参照)。ESLint で機械化済み。
- **1 ファイル 1 functional component を守る（Phase 3-B 確立、FL-005）。**
  - 同一ファイル内にエクスポート / 非エクスポート問わず複数の React functional component を定義しない (`<Foo />` と `<Bar />` の 2 つを書かない)。
  - コード量が少ない場合は 1 つのコンポーネント内で完結させる。再帰が必要なら return 内の IIFE か外部ヘルパー**関数**（JSX を返すだけの純粋関数、コンポーネントではない）で表現する。`FileTree.tsx` の `(function render(list) {...})(nodes)` パターン参照。
  - ファイルが肥大化してきたら、サブコンポーネントを新ファイルに切り出す。同一ファイル内での分割はしない。
  - 昇格予定 (candidate): `eslint-plugin-react` の `react/no-multi-comp` ルール。まだ未導入のため現状はプロンプト + レビュー依存。

## 検討中（昇格候補）

- **Playwright を `dashboard-app/tests/ui/` に導入**（Phase 2-G として将来予定。AGENTS.md にもバックログ登録済み）。
  - 動機: Phase 2-E で MCP UI ループを 1 周回したが、MCP は **エージェント駆動の対話ツール**であって CLI から呼べない。commit-time に自動で走る「ブラウザレベルの回帰テスト」が現状ゼロ。
  - 役割分担:
    - **Playwright** = 自動回帰、`npm run test:ui` で起動、将来の CI で必須
    - **MCP `take_snapshot`** = 開発中のアドホック確認、エージェントが手元で「今どう見えるか」を取るための一次手段
  - スコープ: 最初はテスト 1 本（`/` を開くと `Welcome to Claude Code Dashboard` が h1 に出る）。pre-commit hook には入れない（重い・長い）。
  - 着手のトリガー: UI 系の不具合を 2 回踏んだら最優先。それまでは MCP の手動ループで運用する。
