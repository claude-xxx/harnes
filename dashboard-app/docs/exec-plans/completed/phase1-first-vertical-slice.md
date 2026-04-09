# Phase 1: First Vertical Slice — 1 つの Markdown を表示する

- **状態**: **completed**
- **開始**: 2026-04-09
- **完了**: 2026-04-09
- **目的**: 「BE が 1 つの MD ファイルを返し、FE がそれをレンダリングする」までを最短で縦に貫き、技術スタックの初期決定と最低限のビルド/起動コマンドを確立する。

## ゴール（DoD）

- [x] `npm run dev`（または同等）で FE と BE が起動できる
- [x] ブラウザで FE を開くと、`backend/content/welcome.md` の内容が Markdown としてレンダリングされる
  - **注**: 現セッションでは Chrome DevTools MCP が未ロードのため、ブラウザでの目視確認は人間に持ち越し。代わりに `curl http://localhost:5173/api/content` で BE→FEプロキシ経路の疎通、および `curl http://localhost:5173/` で SPA HTML の配信を確認済み。Phase 2 で MCP 接続後に正式な UI 検証を行う。
- [x] `dashboard-app/AGENTS.md` の TBD コマンドが全て実コマンドに置き換わっている
- [x] `docs/ARCHITECTURE.md` の「決まっていないこと」が確定事項に置き換わっている

## 設計判断（このスライスで確定する）

| 項目 | 決定 |
| --- | --- |
| BE フレームワーク | **Hono**（@hono/node-server アダプタ経由） |
| BE ポート | 3001 |
| BE TS 実行 | **tsx**（watch モード） |
| FE → BE 通信 | Vite の `server.proxy` で `/api` を 3001 にプロキシ |
| Markdown レンダリング | **react-markdown** + **remark-gfm** |
| API（このフェーズ） | `GET /api/content` で 1 ファイル全文を返す（プレーンテキスト） |
| パッケージマネージャ | npm |
| モジュール形式 | ESM (`"type": "module"`) |

## ディレクトリ構成（このフェーズで作るもの）

```
dashboard-app/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── index.ts          ← Hono サーバ
│   └── content/
│       └── welcome.md        ← サンプル
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts        ← /api のプロキシ設定
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           ← fetch + react-markdown
│       └── App.css
```

## やること（順番）

1. `backend/` を作る
   - `npm init -y` → `package.json` を ESM 化
   - 依存: `hono`, `@hono/node-server` / dev: `typescript`, `tsx`, `@types/node`
   - `tsconfig.json`（ESM, NodeNext）
   - `src/index.ts`：`/api/content` を実装、`backend/content/welcome.md` を fs で読んで text/markdown で返す
   - `content/welcome.md` を作る
2. `frontend/` を作る
   - Vite の React+TS テンプレートで初期化
   - `react-markdown`, `remark-gfm` を追加
   - `vite.config.ts` に `/api` のプロキシ設定
   - `App.tsx` で `/api/content` を fetch → ReactMarkdown で表示
3. 両方起動して手動確認
4. `AGENTS.md` の TBD を更新
5. `ARCHITECTURE.md` の TBD を更新

## ハーネス的観点での自戒

- **過剰な作り込み禁止**: テスト、Lint、Pre-commit は **この exec-plan のスコープ外**（Phase 2）。今はあくまで縦串のみ。
- **失敗したらコードより先にハーネス（=この docs）を直す**: もし「同じ初期化で2回つまずいた」ことがあれば、`core-beliefs.md` に1行追記してから直す。
- **判断の根拠を残す**: ライブラリ選定理由は表に書いた。

## 学び・遭遇した問題（実装中に追記）

### 作業ログ

- **BE セットアップ**: `npm init -y` がデフォで `"type": "commonjs"` を生成するため、ESM に書き換えが必要だった。次回からは `package.json` を最初から手書きで生成した方が早い。
- **Vite scaffold**: Vite 8 の scaffold は eslint 設定を最初から含んでくれるので、Phase 2 の Lint 導入が一段ラクになる見込み。
- **port 衝突なし**: 5173/3001 でクリーン。
- **dev サーバ停止**: bash の `&` で投げた PID は subshell の PID であり、実際の node プロセスは別 PID。停止時は `netstat -ano` で listening PID を引いて `taskkill //PID <pid> //F //T` する必要があった（Windows 環境特有）。

### 仕組み化に値する学び（→ core-beliefs.md に転記）

1. Windows + Git Bash 環境では、バックグラウンドで起動した dev サーバの停止に `kill <pid>` だけでは不十分。netstat → taskkill が必要。
2. Phase 1 では「自動 UI 検証」を持たないため、UI レンダリングの正しさは人間 or 次フェーズの MCP に依存している。これは現時点の **既知のリスク**として明示する。

### 完了時の状態

- BE: `http://localhost:3001/api/health` → 200 OK / `/api/content` → 200 OK + Markdown
- FE: `http://localhost:5173/` → 200 OK + SPA HTML
- FE プロキシ: `http://localhost:5173/api/content` → BE の Markdown が透過的に取得できることを確認
- 型チェック: BE/FE 両方 0 エラー
