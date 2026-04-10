# dev-commands.md — 開発コマンド・dev server・hook の詳細

> AGENTS.md は目次で行数が制約されている（FL-004）ため、コマンド表と起動・停止・hook 周りの詳細はこのファイルに集約しています。**新規 clone した後、まずここを 1 度通読**してください。

---

## 全体（`dashboard-app/` 直下）

- **静的検証一括: `bash scripts/check.sh`**
  - BE/FE 両方の `lint → typecheck → format:check` を順に走らせ、最後に AGENTS.md の行数ガード（FL-004 由来、120 行超で fail）を確認します。
- **`git commit` のたびに pre-commit hook が `scripts/check.sh` と `backend` の `npm run test:run` を自動で走らせます**（Phase 2-C で導入）。
  - 失敗した commit は自動的に拒否されます。
  - **`--no-verify` での回避は禁止**（AGENTS.md の禁止コマンド参照）。
- **新規 clone 後の最初の 1 歩**: `dashboard-app/` で `npm install` を一度だけ走らせる → husky の `prepare` script が `dashboard-app/.husky/` に hooks を配置し、git の `core.hooksPath` を `dashboard-app/.husky/_` に設定します。

### dashboard-app/package.json は何か

- **dashboard-app の dev tooling 用メタパッケージ**であって、アプリコードを持ちません。npm workspaces でもありません。
- 現状の依存は `husky` のみ。アプリ依存は引き続き `dashboard-app/{frontend,backend}/package.json` 側で管理してください。
- ここに app deps や aggregator script を追加するのは過剰設計（次に必要になったら exec-plan を切って議論する）。

### `harnes/` 直下に何が「ない」か

- husky 関連ファイル（`package.json`, `.husky/`, `node_modules/` 等）は `harnes/` には **置きません**（FL-003 由来）。
- `harnes/` には `documents/` などの非アプリコンテンツが同居しているため、ハーネスのファイルは `dashboard-app/` 配下に閉じ込める設計です。
- 例外: `harnes/.claude/` は Claude Code 自体の wire-up なので元から存在します。

---

## Backend（`backend/`）

| コマンド | 何をするか |
| --- | --- |
| `npm run dev` | tsx watch で dev server 起動（port 3001） |
| `npm run typecheck` | `tsc --noEmit`（`src/` と `tests/` 両方） |
| `npm run lint` | ESLint flat config + typescript-eslint |
| `npm run format` | Prettier で `src/` `tests/` を書き換え |
| `npm run format:check` | Prettier 検査のみ |
| `npm run check` | `lint → typecheck → format:check` 集約 |
| `npm run test` | Vitest watch |
| `npm run test:run` | Vitest 1-shot（pre-commit hook で実行されるのはこちら） |
| `npm run build` | `tsc -p tsconfig.build.json` で `dist/` に emit。`src/` のみ対象、`tests/` は含まない |
| `npm start` | `node dist/index.js` |

### Backend の API エンドポイント（Phase 2-B 以降）

| パス | 内容 |
| --- | --- |
| `GET /api/health` | liveness probe |
| `GET /api/content` | `welcome.md` を `text/markdown` で返す |
| `GET /api/openapi.json` | Zod スキーマから自動生成された OpenAPI 3.1 spec |
| `GET /api/doc` | Swagger UI（`/api/openapi.json` を読む、HTML 配信のため raw `app.get()` 例外） |

すべて Vite proxy 経由で `http://localhost:5173/api/*` からも触れます。

---

## Frontend（`frontend/`）

| コマンド | 何をするか |
| --- | --- |
| `npm run dev` | Vite dev server 起動（port 5173、`/api` を 3001 にプロキシ） |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint flat config（`eslint-config-prettier/flat` で Prettier と非競合） |
| `npm run format` | Prettier |
| `npm run format:check` | Prettier 検査のみ |
| `npm run check` | `lint → typecheck → format:check` 集約 |
| `npm run test` | Vitest watch (jsdom + RTL) |
| `npm run test:run` | Vitest 1-shot（pre-commit hook で実行されるのはこちら） |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | ビルド成果物のプレビュー |

---

## 動作確認の手順（手動）

開発中の確認は基本的に Chrome DevTools MCP で済ませます（[`docs/core-beliefs/frontend.md`](core-beliefs/frontend.md) の最小レシピ参照）。完全に手動で確認したい場合は:

1. 別ターミナルで `cd backend && npm run dev`
2. 別ターミナルで `cd frontend && npm run dev`
3. ブラウザで <http://localhost:5173/> を開き、`backend/content/welcome.md` の内容が描画されていることを確認

### dev server を止めるとき（Windows + Git Bash 特有）

`kill <pid>` だけでは止まらないことがあります（`FL-001`）。正規手順:

```bash
netstat -ano | grep -E ':3001|:5173' | grep LISTEN
taskkill //PID <listening_pid> //F //T
```

詳細は [`core-beliefs/tooling.md`](core-beliefs/tooling.md) と `failure-log.jsonl` の `FL-001`。

---

## まだ存在しないもの（バックログ）

- **FE テスト（Vitest など）** → Phase 2 後半 or 別フェーズ
- **ブラウザでの UI 回帰テスト（Playwright）** → **Phase 2-G として将来導入予定**
  - 背景: Phase 2-E では Chrome DevTools MCP で UI ループを 1 周回したが、**MCP はエージェント駆動の対話ツール**であって、commit 時に自動で走る「テスト」にはできない（CLI から MCP は呼べない）。
  - 解決方針: Playwright を別レイヤとして導入し、`dashboard-app/tests/ui/` 配下に **HTTP 契約テストでは届かないレンダリング層の回帰テスト** を置く。pre-commit hook には入れず（重い）、`npm run test:ui` として明示起動 + 将来の CI で実行する想定。
  - 役割分担: **Playwright = 自動回帰**、**MCP `take_snapshot` = 開発中のアドホック確認**。[`core-beliefs/frontend.md`](core-beliefs/frontend.md) 参照。
  - 着手のトリガー: UI 系の不具合を 2 回踏んだら最優先。
- **CI（GitHub Actions など）での同等検査** → 別フェーズ（pre-commit と CI は別レイヤー）
