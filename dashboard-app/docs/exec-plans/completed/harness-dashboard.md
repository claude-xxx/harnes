# ハーネス観測ダッシュボード

- **状態**: completed
- **作成**: 2026-04-12
- **完了**: 2026-04-12
- **生成者**: Planner Agent（Orchestrator により AC-13/14/21 を契約テスト・unit test 方式に調整）
- **検証**: Evaluator 25/25 AC pass (iter 1) / code-reviewer 3 iter (blocking→minor→minor: Finding 1 FL-005 / 2 backend.md carve-out / 3 空アサート / 4 ENOENT パターン統一 を段階的に解消)

## 目的

dashboard-app の真の目的である「ハーネスエンジニアリングの実体験」を可視化する専用ページを追加する。failure-log の集計・exec-plans の一覧・core-beliefs の原則サマリを一画面にまとめ、ハーネス自身の健全性をアプリ内で観測できるようにする。

## 仕様（WHAT）

### ナビゲーション

- 既存の Markdown ビューア画面（現トップ画面）と新しいハーネス観測画面を切り替えるナビゲーション要素をアプリに追加する。
- ナビゲーション要素はサイドバー上部またはトップバーの固定位置に配置し、2 画面を相互に行き来できる。
- ハーネス観測画面のナビゲーションラベルは「Harness」、Markdown ビューア画面のラベルは「Docs」。

### ハーネス観測画面

画面全体を 3 つのセクションに分割する。

#### セクション 1: Failure Log 集計

- データソース: `dashboard-app/docs/failure-log.jsonl`
- 表示内容:
  - ステータス別件数: `open` / `promoted`（他の status 値が存在する場合も同様に件数表示）
  - カテゴリ別件数: `frontend` / `backend` / `infra` / `tooling` / `process` 各カテゴリのレコード数
- セクション見出し: 「Failure Log」

#### セクション 2: Exec Plans 一覧

- データソース: `dashboard-app/docs/exec-plans/active/*.md` および `dashboard-app/docs/exec-plans/completed/*.md`
- 表示内容: 各プランについて
  - タイトル（ファイル先頭の `# <タイトル>` から取得）
  - 状態（本文中の `状態:` フィールドから取得。例: `planned` / `completed`）
  - 作成日（`作成:` フィールドがあれば表示）
  - 完了日（`完了:` フィールドがあれば表示）
- `active` / `completed` の 2 グループに分けて表示
- セクション見出し: 「Exec Plans」

#### セクション 3: Core Beliefs サマリ

- データソース: `dashboard-app/docs/core-beliefs/*.md`（`index.md` を含む全ファイル）
- 表示内容: 各ファイルについて
  - カテゴリ名（ファイル名から導出、例: `frontend` / `backend` / `infra` / `tooling` / `index`）
  - 「確立された原則」の件数（該当セクション内の箇条書き項目数）
  - 「検討中」の件数（該当セクション内の箇条書き項目数）
- セクション見出し: 「Core Beliefs」

### BE: 新規 API エンドポイント

3 つの新規エンドポイントを追加する。既存 API と同様に OpenAPIHono + Zod の `createRoute` + `app.openapi()` で定義し、Zod スキーマを source of truth とする。

1. **`GET /api/harness/failure-log`**: `docs/failure-log.jsonl` を読み、ステータス別件数とカテゴリ別件数を集計して返す
2. **`GET /api/harness/exec-plans`**: `docs/exec-plans/active/` と `completed/` 配下の `.md` ファイルを走査し、各プランのタイトル・状態・作成日（あれば）・完了日（あれば）を返す
3. **`GET /api/harness/core-beliefs`**: `docs/core-beliefs/*.md` を走査し、カテゴリ名・確立済み原則の件数・昇格候補の件数を返す

BE のファイルシステムアクセスは `docs/` 以下の対象ディレクトリのみに限定する。既存の path traversal 防御機構（`resolveWithinContent` 同等）を経由すること。

エッジケース時の挙動（Evaluator は BE 契約テストの存在と passing で検証する）:
- JSONL の特定行が不正な JSON の場合、その行はスキップし、残りの正常行で集計を完了する
- `exec-plans/active/` または `completed/` が空ディレクトリの場合、該当グループは空配列を返す
- `failure-log.jsonl` が空ファイルの場合、全カテゴリ・全ステータスの件数が 0 のオブジェクトを返す
- `core-beliefs/*.md` のうち「確立された原則」セクションを持たないファイルは、該当件数 0 として集計する

### FE: 新規ページコンポーネント

- `src/api.ts` に 3 つの新規 API wrapper 関数を追加する
- ハーネス観測画面は独立したコンポーネントとして実装する（1 ファイル 1 コンポーネント原則、FL-005 に従う）
- ローディング中は「読み込み中」相当の表示
- BE API のエラー時（fetch 失敗 / 非 200）は画面内に「取得できませんでした」相当の日本語メッセージを表示し、他セクション・アプリ全体はクラッシュしない
- エラー表示の挙動は FE unit test（vitest + RTL）で `fetch` モックにより検証する（Evaluator は unit test の存在と passing で検証する）

## 受入基準 (Acceptance Criteria)

### Happy Path

- [ ] AC-H1: `http://localhost:5173/` を開き `take_snapshot` で a11y ツリーを取得したとき、「Harness」というラベルのナビゲーション要素（link または button）が存在する
- [ ] AC-H2: 「Harness」ナビゲーションをクリックした後、`take_snapshot` のツリーに「Failure Log」「Exec Plans」「Core Beliefs」の 3 見出しが同時に存在する
- [ ] AC-H3: `take_snapshot` で Failure Log セクション内に `open` という文字列と整数が近傍に表示されている
- [ ] AC-H4: `take_snapshot` で Failure Log セクション内にカテゴリ名（`frontend` / `backend` / `infra` / `tooling` / `process` のいずれか）と対応する整数が近傍に表示されている
- [ ] AC-H5: `take_snapshot` で Exec Plans セクション内に、現在 `active/` に実在する `harness-dashboard` 関連のプランタイトル（または `completed/` に存在する `file-timestamp` 関連のプランタイトル）が表示されている
- [ ] AC-H6: `take_snapshot` で Core Beliefs セクション内に `frontend` というカテゴリ名と、対応する確立済み件数の整数が近傍に表示されている
- [ ] AC-H7: 「Docs」ナビゲーションをクリックした後、`take_snapshot` に既存 Markdown ビューアのファイルツリー（`welcome.md` ノード等）が再表示され、ハーネス観測セクションは消える
- [ ] AC-H8: `list_network_requests` で `/api/harness/failure-log` / `/api/harness/exec-plans` / `/api/harness/core-beliefs` がいずれも HTTP 200 を返す
- [ ] AC-H9: `/api/harness/failure-log` のレスポンスボディにステータス別およびカテゴリ別の集計を含むオブジェクトが存在する
- [ ] AC-H10: `/api/harness/exec-plans` のレスポンスに各プランのタイトルと状態フィールドが含まれている
- [ ] AC-H11: `/api/harness/core-beliefs` のレスポンスに `frontend` カテゴリの確立済み件数が 1 以上の整数として含まれている

### Edge Cases（BE 契約テストで検証）

- [ ] AC-E1: `backend/tests/` に、不正な JSON 行を含む JSONL 文字列を in-memory に渡して集計ロジックを検証するテストが存在し、passing。不正行がスキップされ、正常行のみが集計結果に反映されることを assert する
- [ ] AC-E2: `backend/tests/` に、空ディレクトリ（exec-plans が 0 件）時の挙動を検証するテストが存在し、passing。`active` もしくは `completed` グループが空配列で返ることを assert する
- [ ] AC-E3: `backend/tests/` に、空の JSONL 文字列を渡したときに全件数が 0 のオブジェクト（または等価な空集計）が返ることを検証するテストが存在し、passing
- [ ] AC-E4: `backend/tests/` に、「確立された原則」セクションを持たない markdown 文字列を渡したときに該当件数が 0 として集計されることを検証するテストが存在し、passing

### A11y

- [ ] AC-A1: `take_snapshot` で、ナビゲーション要素（「Docs」「Harness」）が `navigation` role（`nav` 要素または `role="navigation"`）のコンテナ内に存在する
- [ ] AC-A2: ハーネス観測画面の 3 セクション見出し（「Failure Log」「Exec Plans」「Core Beliefs」）が `heading` role（`h2` または `h3`）として `take_snapshot` の a11y ツリーに現れ、階層が壊れていない
- [ ] AC-A3: キーボードのみ（Tab + Enter/Space）で「Harness」ナビゲーションにフォーカスが到達し、画面切替が発動する。`press_key` で Tab を連打してフォーカスを移動し、`take_snapshot` でフォーカス位置を確認した後、Enter で切替が起きることを `take_snapshot` で確認する
- [ ] AC-A4: Exec Plans 一覧の各プランについて、タイトル近傍に状態（`planned` / `completed` 等）のテキストが存在し、a11y ツリーから状態が読み取れる

### Error Path（FE unit test で検証）

- [ ] AC-R1: `frontend/tests/` に、`/api/harness/failure-log` の fetch が失敗（ネットワークエラー or 非 200）したケースの unit test が存在し、passing。Failure Log セクション内に「取得できません」または「エラー」を含む日本語テキストがレンダリングされ、他セクションがアンマウントされていないことを assert する
- [ ] AC-R2: `frontend/tests/` に、`/api/harness/exec-plans` が空のオブジェクト（`{}`）や想定外の形（Zod の safeParse が fail する形）を返したケースの unit test が存在し、passing。FE がクラッシュせず、ユーザー向けのエラー/空表示が出ることを assert する

### 標準基準

- [ ] AC-S1: コンソールエラー 0 件（`list_console_messages` の `types: ["error"]` フィルタで 0 件）
- [ ] AC-S2: ハーネス観測画面表示中に発生した全 `/api/harness/*` リクエストが 200 を返す
- [ ] AC-S3: `bash scripts/check.sh` が green
- [ ] AC-S4: `npm run test:run`（BE + FE）が全件 green

## 非スコープ

- リアルタイム更新（WebSocket / 自動リフレッシュ）
- failure-log の編集・追記機能
- exec-plan の作成・ステータス変更機能
- core-beliefs の編集機能
- failure-log の全レコード一覧表示（集計のみ）
- exec-plan の本文プレビュー（タイトル・状態・日付のみ）
- failure-log の再発回数ランキング
- 通知・アラート（`open` が N 件超でバッジ等）
- `docs/` 以外のディレクトリを対象とした集計
- モバイル専用レスポンシブ対応（既存画面と同等で可）
- API の認証・認可
- `failure-log.jsonl` のスキーマバリデーション警告（不正行はサイレントスキップ）
- Evaluator による実ファイル改変によるエッジ検証（代わりに BE 契約テスト / FE unit test で検証）
