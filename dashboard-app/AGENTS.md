# AGENTS.md — Claude Code Dashboard

> このファイルは **百科事典ではなく目次** です。詳細は `docs/` 配下を参照してください。
> 失敗や同じミスを2回したら、まずこのファイル or `docs/core-beliefs.md` に1行追記してから直してください。

---

## このプロジェクトは何か

Claude Code の使い方をまとめた **個人用ローカルダッシュボード** です。
Markdown ファイルを Notion ライクに閲覧できる Web アプリで、本プロジェクトの**真の目的はハーネスエンジニアリングを実体験すること**にあります。
プロダクトとしての完成度よりも、ハーネスの成熟度（フィードバックループの自動化、Lint/テスト/UI検証の機械化）を優先してください。

詳細な背景・成功基準は `../documents/plan/plan.md` を参照。

---

## 技術スタック（確定事項）

- **Frontend**: Vite + React + TypeScript（`frontend/`）
- **Backend**: Node.js + TypeScript（`backend/`）
- **DB**: なし。Markdown ファイルは `backend/content/` 配下に直置きし、BE から FE へ HTTP で返却する
- **DB サーバー**: 立てない

この方針は確定事項です。変更が必要な場合は人間に確認してください。

---

## ディレクトリ構成（予定）

```
dashboard-app/
├── AGENTS.md              ← このファイル（目次）
├── frontend/              ← Vite + React + TS
├── backend/               ← Node + TS
│   └── content/           ← 表示対象の Markdown ファイル群
└── docs/                  ← ハーネスのナレッジ基盤
    ├── ARCHITECTURE.md    ← 構造とレイヤと依存方向（決まり次第追記）
    ├── core-beliefs.md    ← 設計判断の軸 / 黄金原則
    ├── exec-plans/
    │   ├── active/        ← 進行中の実行計画
    │   └── completed/     ← 完了済み実行計画
    └── product-specs/     ← 仕様メモ
```

---

## 触ってよい / 触ってはいけない

### 触ってよい
- `frontend/` 配下
- `backend/` 配下（`backend/content/` 内の Markdown も追加・編集可）
- `docs/` 配下
- `tests/` 配下（できたら）

### 触ってはいけない（人間承認が必要）
- リポジトリ直下の `documents/`（ハーネス計画書の親文書、本プロジェクトのスコープ外）
- `.git/`、`.env`、認証情報・秘密情報を含むファイル
- ルート直下の設定ファイル（`.gitignore` など）の変更は事前確認

### 禁止コマンド
- `rm -rf` 系の広範削除
- `git push --force` / `git reset --hard`（明示指示がない限り）
- `git commit --no-verify`（hook を回避しない）

---

## ビルド・起動・テスト・Lint

FE と BE は別プロセスで起動します。Phase 1 では同時起動の自動化（concurrently 等）はあえて入れていません。

### Backend（`backend/`）
- 開発サーバー起動: `npm run dev` （tsx watch、ポート 3001）
- 型チェック: `npm run typecheck`
- ビルド: `npm run build`（→ `dist/`）
- 本番起動: `npm start`

### Frontend（`frontend/`）
- 開発サーバー起動: `npm run dev` （Vite、ポート 5173、`/api` を 3001 にプロキシ）
- 型チェック: `npm run typecheck`
- ビルド: `npm run build`
- Lint: `npm run lint`（Vite scaffold が用意した eslint 設定）
- プレビュー: `npm run preview`

### 動作確認の手順（手動 / Phase 2 以降は MCP で自動化）
1. 別ターミナルで `cd backend && npm run dev`
2. 別ターミナルで `cd frontend && npm run dev`
3. ブラウザで http://localhost:5173/ を開き、`backend/content/welcome.md` の内容が表示されることを確認

### まだ存在しないもの
- テスト（Vitest 等）→ Phase 2
- Pre-commit hook → Phase 2
- カスタム lint → Phase 2
- カスタムサブエージェント → Phase 2

---

## 開発フロー（厳守）

`Explore → Plan → Implement → Verify → Record` を守ってください。

1. **Explore**: 関連コードと `docs/` を読む
2. **Plan**: `docs/exec-plans/active/<task-name>.md` に実行計画を書く
3. **Implement**: **1セッション1機能、1PR1目的** の粒度で実装
4. **Verify**: Lint / 型 / テスト / （Phase 2 以降は）Chrome DevTools MCP での UI 検証を全て通す
5. **Record**: 完了したら exec-plan を `completed/` に移動し、学びを `core-beliefs.md` に追記

---

## ドキュメントへのリンク

- 設計の軸・黄金原則: [`docs/core-beliefs.md`](docs/core-beliefs.md)
- アーキテクチャ概観: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- 進行中の作業: [`docs/exec-plans/active/`](docs/exec-plans/active/)
- 完了した作業: [`docs/exec-plans/completed/`](docs/exec-plans/completed/)
- 親プロジェクトの計画書: [`../documents/plan/plan.md`](../documents/plan/plan.md)
- ハーネス概念のサマリ: [`../documents/harnes-summary.md`](../documents/harnes-summary.md)
