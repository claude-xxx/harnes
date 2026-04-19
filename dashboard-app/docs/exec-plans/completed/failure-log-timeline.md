# Failure Log タイムライン表示

- **状態**: completed
- **作成**: 2026-04-19

## 目的

HarnessDashboard で failure-log の発生推移を時系列で可視化する。既存の集計表示（status 別・category 別件数）を補完する形で、日付別の failure 件数グラフを HarnessDashboard 画面内に追加し、ハーネスの健全性が時間軸でも観測できるようにする。

## 仕様（WHAT）

### バックエンド

- `GET /api/harness/failure-log/timeline` エンドポイントを追加する。
- レスポンスは日付別の failure 件数の配列を返す。各要素は「日付（YYYY-MM-DD 文字列）」と「その日付に `date` フィールドを持つレコードの件数（整数）」のペア。
- 配列は日付の昇順でソートして返す。
- `failure-log.jsonl` が存在しない場合はエントリ数 0 の空配列を返す（500 ではなく 200）。
- `date` フィールドが欠損または無効な形式のレコードはスキップする（集計対象外）。

### フロントエンド

- HarnessDashboard 画面（現在 failure-log 集計を表示しているセクション）に「Failure Log タイムライン」セクションを追加する。
- セクションには日付を横軸、件数を縦軸とした推移グラフを表示する。外部グラフライブラリを導入せず、既存の Tailwind CSS 範囲内で表現できるシンプルな棒グラフ形式を基本とする（バーの高さが件数に比例）。
- 各バーには対応する日付と件数がアクセシブルな形でマークアップされている。
- `/api/harness/failure-log/timeline` からデータを取得し、取得中はローディング状態を表示、取得失敗時はエラーメッセージを表示する。
- データが空（エントリなし）の場合は「No data」相当のメッセージを表示する。

## 受入基準 (Acceptance Criteria)

### Happy path（1 個以上）

- [x] AC-H1: HarnessDashboard 画面（`http://localhost:5173/`）に「Failure Log タイムライン」という見出し（またはラベルテキスト）が表示され、1 本以上の棒グラフ要素が a11y ツリーで確認できる。
- [x] AC-H2: `GET /api/harness/failure-log/timeline` が HTTP 200 を返し、レスポンス JSON が `{ entries: [{ date: "YYYY-MM-DD", count: <non-negative integer> }] }` の形式で Zod スキーマを parse できる。
- [x] AC-H3: レスポンスの `entries` が日付昇順で並んでいる（先頭の `date` ≤ 末尾の `date`）。

### Edge case（1 個以上）

- [x] AC-E1: `failure-log.jsonl` が存在しない状態で `GET /api/harness/failure-log/timeline` を呼んだとき、HTTP 200 かつ `entries: []` が返る。
- [x] AC-E2: `failure-log.jsonl` 内に `date` フィールドが欠損しているレコードが混在していても、有効レコードの集計結果のみが `entries` に含まれ、不正レコード起因で 500 にならない。
- [x] AC-E3: `entries` が空配列のとき（レコードが 0 件）、フロントエンドのタイムラインセクションにグラフ要素は表示されず「No data」相当のテキストが a11y ツリーで確認できる。
- [x] AC-E4: 同一日付に複数の failure-log レコードが存在する場合、その日付のバーの件数（aria-label またはテキスト）が複数分を合算した値になっている。

### A11y / キーボード操作（1 個以上）

- [x] AC-A1: タイムラインセクション内の各バー要素（または対応するラッパー要素）が、`take_snapshot` の a11y ツリーで日付と件数を読み取れるテキスト（例: aria-label "2026-04-09: 1件" 相当）を持つ。
- [x] AC-A2: タイムラインセクションが見出し（h2 または h3）でグルーピングされており、スクリーンリーダーがセクション境界を認識できる構造になっている。

### Error path（1 個以上）

- [x] AC-R1: フロントエンドが `/api/harness/failure-log/timeline` から 500 レスポンスを受け取ったとき、画面上にエラーメッセージ相当のテキストが a11y ツリーで確認できる（グラフは表示されない）。
- [x] AC-R2: バックエンドが `failure-log.jsonl` の読み取りで想定外 I/O エラーを起こしたとき（ENOENT 以外）、HTTP 500 と `{ error: "..." }` を返す。

### 標準基準（常に含める）

- [x] AC-S1: コンソールエラーが 0 件
- [x] AC-S2: 全 API リクエストが 200（または期待ステータス）を返す
- [x] AC-S3: `bash scripts/check.sh` が green
- [x] AC-S4: `npm run test:run` (BE + FE) が green

## 非スコープ

- failure-log の個別レコード詳細表示（タイムラインはあくまで件数推移のみ）
- グラフのインタラクション（ホバーツールチップ、クリックドリルダウン等）
- 外部グラフライブラリの導入判断（Generator の裁量）
- タイムラインの日付範囲フィルタリング UI
- リアルタイム更新・ポーリング
