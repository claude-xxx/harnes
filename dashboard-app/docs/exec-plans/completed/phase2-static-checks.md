# Phase 2-A: 静的検証ループの整備（Lint / Format / Typecheck）

- **状態**: completed
- **開始**: 2026-04-10
- **完了**: 2026-04-10
- **目的**: Phase 2 の最初の縦串。BE/FE 両方に **決定的かつ速い静的検証ループ** を敷き、エージェントが手戻りなく自走できる足場を作る。
- **スコープ外（後続 exec-plan に分離）**:
  - **Phase 2-B: API 契約とテストループ** — `@hono/zod-openapi` を BE に導入し、`/api/content` を Zod スキーマ駆動の OpenAPI ルートに書き直す。`/api/openapi.json` と Swagger UI を配信。Vitest を BE に導入し、**Zod スキーマで実 API レスポンスを validate する契約テスト**を最初の1本として書く。`core-beliefs/backend.md` に「API は Zod スキーマ駆動」を黄金原則として追加。FE 側のテストは更に後ろに分離。**この方針はユーザー承認済み（2026-04-10）**。apiDoc は OpenAPI ネイティブではないため不採用。
  - Pre-commit hook（Phase 2-C、2-A/B が安定してから載せる）
  - カスタム lint ルール（Phase 2-D）
  - Chrome DevTools MCP の UI 検証（Phase 2-E）
  - `code-reviewer` サブエージェント（Phase 2-F）

> **1セッション1機能、1PR1目的を死守する。** Phase 2 全体は触らない。

---

## 背景

Phase 1 終了時点での静的検証の状態:

| 項目 | FE | BE |
| --- | --- | --- |
| 型チェック | `tsc -b --noEmit` あり | `tsc --noEmit` あり |
| Linter | ESLint(Vite scaffold) あり、ただし未実行 | **なし** |
| Formatter | **なし** | **なし** |

このままだと「コードを書く → 何も走らない → 人間がレビュー」になってしまい、Phase 1 と何も変わらない。

---

## ゴール（DoD）

- [ ] BE に Linter（ESLint flat config）が入っており、`npm run lint` で動く
- [ ] FE/BE 両方に Formatter が入っており、`npm run format` / `npm run format:check` で動く
- [ ] FE/BE 両方で **`npm run check`**（lint + typecheck + format:check を順次実行する集約スクリプト）が定義されている
- [ ] ルートに **`npm run check:all`**（または同等）を作り、FE/BE の `check` を一発で回せるようにする
  - ルート `package.json` を新規に1つ作って workspaces 化するか、シンプルに bash スクリプトで連続実行するかは Implement 中に判断。**過剰設計禁止**。
- [ ] 既存コード（Phase 1 で書かれたもの）が **新しい Lint と Format で 0 警告 0 エラー** で通る
- [ ] `AGENTS.md` の「ビルド・起動・テスト・Lint」セクションを新コマンドで更新
- [ ] `docs/core-beliefs/tooling.md` に「静的検証は `check` に集約する」原則を1行追加

---

## 設計判断

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| Formatter | **Prettier** | ESLint(typescript-eslint) と組み合わせる定番。Biome 一本化も魅力だが、FE 側に既に ESLint が入っている以上、移行コストを払う場面ではない（Phase 2-A のスコープ外）。 |
| BE Linter | **ESLint + typescript-eslint(flat config)** | FE と同じスタックに揃える。学習コスト最小。 |
| Prettier 設定 | リポジトリルートに 1 つ（`.prettierrc.json`） | FE/BE で揺れないようにする。 |
| Lint と Format の分離 | ESLint からスタイル系ルールは外し、Prettier に任せる（`eslint-config-prettier` を入れる） | 競合を起こさないための定石。 |
| ルートでの集約 | **bash スクリプト or ルート package.json の scripts のみ**。npm workspaces は **入れない**（Phase 1 で意図的に避けた構成を尊重） | 過剰設計禁止。 |
| 集約スクリプト名 | `check`（ローカル単体）/ `check:all`（FE+BE 両方） | エージェントに「迷わず1つ叩けば全部走る」を提供する。 |

---

## やること（順番）

1. **BE に ESLint を導入**
   - `backend/` で `eslint`, `typescript-eslint`, `@eslint/js` を devDependency 追加
   - `backend/eslint.config.js`（flat config, FE と同じ流儀）を作成
   - `backend/package.json` に `lint` script を追加
   - 既存の `src/index.ts` が 0 エラーで通るまで微修正
2. **Prettier をリポジトリルートに導入**
   - ルートに `.prettierrc.json`, `.prettierignore` を作成
   - FE/BE 両方の devDependency に `prettier`, `eslint-config-prettier` を追加
   - FE/BE の `eslint.config.js` の `extends` に `eslint-config-prettier` を追加（ESLint と競合させない）
   - FE/BE 両方の `package.json` に `format`, `format:check` scripts を追加
3. **集約スクリプト**
   - FE/BE 両方の `package.json` に `check` script を追加（`npm run lint && npm run typecheck && npm run format:check`）
   - リポジトリルートに最小の `package.json` を作る or `scripts/check.sh` を作る（Implement 時に小さい方を選ぶ）
4. **既存コードを新ハーネスで通す**
   - `npm run check:all` 相当を実行し、警告/エラーがあれば直す
   - **コードを直すか、ルールを緩めるかの判断は core-beliefs に1行残す**
5. **ドキュメント更新**
   - `AGENTS.md` の Lint/Format コマンドを新コマンドに置換
   - `docs/core-beliefs/tooling.md` に集約 `check` の原則を追記
6. **作業ログを本ファイル末尾に追記** → 完了したら `completed/` に移動 + `failure-log.jsonl` に学びを反映

---

## ハーネス的観点での自戒

- **テストは絶対に書かない**（Phase 2-B のスコープ）。誘惑が強いが、ここで縦串を太くしすぎると Phase 2-A が終わらない。
- **Pre-commit hook も入れない**（Phase 2-C）。今は「手で `npm run check:all` を叩いたら即座に結果が出る」状態を作るだけで十分。hook はその後、確実に通る状態の上に載せる。
- **Biome への一本化、Turborepo / nx 化、workspaces 化はやらない**。やりたくなったら別 exec-plan を切る。
- **Prettier の設定は最小**（行幅など好みは default を尊重）。設定で時間を溶かさない。

---

## 既知のリスク

- ESLint/Prettier のメジャーバージョン同士の競合。`eslint-config-prettier` のバージョンが ESLint v9 (flat config) と整合するかは事前確認が必要。
- BE は ESM (`"type": "module"`) なので `eslint.config.js` の書き方も ESM に揃える。

---

## 学び・遭遇した問題

### 作業ログ

- **集約形式の選定**: ルートに `package.json` を作って scripts でまとめる案と、`scripts/check.sh` のシェルスクリプト案を比較。`package.json` を3つにすると「ここは workspaces なのか?」とエージェントが誤解するリスクがあるため、**`scripts/check.sh` 1ファイル**を採用した。`set -euo pipefail` で failfast。
- **`eslint-config-prettier` の入り口**: ESLint v9 (flat config) では `eslint-config-prettier/flat` という専用エントリポイントを使う必要がある（ルートの import だと flat config 用ではない）。`backend/eslint.config.js` と `frontend/eslint.config.js` の両方で `from 'eslint-config-prettier/flat'` を使用。
- **既存コードの違反**: BE は 0 違反でクリア。FE は Vite scaffold 由来の `App.tsx` / `App.css` / `index.css` / `main.tsx` / `eslint.config.js` / `tsconfig.json` が Prettier 違反。`npm run format` 一発で全部解消（手作業ゼロ）。
- **`backend/content/` の除外**: `.prettierignore` で除外。content の Markdown は **表示対象データ** であり、Prettier が改行・空白を勝手に変えるとレンダリング結果まで変わってしまうため、フォーマッタの管轄外とする。
- **`tsconfig.json` の Prettier 適用**: `tsconfig.json` も Prettier の対象に入れた（FE の root level json）。ESLint の対象ではないので競合の心配なし。

### 仕組み化に値する学び（→ core-beliefs に転記済み）

1. 静的検証は `scripts/check.sh` に集約。エージェントは「コミット前にこれ1本叩けばよい」だけ覚えればよい。`tooling.md` に追記済み。
2. ESLint flat config + Prettier は `eslint-config-prettier/flat` で結合する。これは ESLint v9 系の作法であり、古い記事の `eslint-config-prettier` (legacy entry) 経由のサンプルをコピペすると黙って効かなくなる。`tooling.md` の昇格候補にはまだ書かないが、Phase 2-D のカスタム lint で「eslint config に prettier flat extends があること」を強制してもよい（次フェーズの判断材料）。

### 完了時の状態

- BE: `npm run check` → 0 警告 0 エラー
- FE: `npm run check` → 0 警告 0 エラー
- ルート: `bash scripts/check.sh` → BE/FE 両方が green、最後に `OK: all static checks passed.` を出力
- `AGENTS.md` のコマンド表を新しい `check` / `format` / `format:check` / `scripts/check.sh` に更新済み
- `docs/core-beliefs/tooling.md` に「静的検証は `check` に集約する」原則を追記済み
