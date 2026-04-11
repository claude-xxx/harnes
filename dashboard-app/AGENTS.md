# AGENTS.md — Claude Code Dashboard

> **このファイルは「100 行以内の目次」です**。詳細は `docs/` 配下を参照してください。
> 100 行を超えそうになったら必ず `docs/` に切り出すこと。`scripts/check.sh` が 120 行超で fail します（FL-004 由来）。

---

## このプロジェクトは何か

Claude Code の使い方をまとめた **個人用ローカルダッシュボード**。Markdown を Notion ライクに閲覧できる Web アプリで、**真の目的はハーネスエンジニアリングを実体験すること**です。プロダクト完成度よりハーネスの成熟度（フィードバックループの自動化）を優先してください。

詳細な背景・成功基準: [`../documents/plan/plan.md`](../documents/plan/plan.md)

---

## 技術スタック（確定事項、変更時は人間確認）

- **Frontend**: Vite + React + TypeScript（`frontend/`）
- **Backend**: Node.js + TypeScript + Hono / OpenAPIHono（`backend/`）
- **DB**: なし。Markdown は `backend/content/` に直置きし BE→FE は HTTP（DB サーバーも立てない）

---

## ディレクトリ構成

```
dashboard-app/
├── AGENTS.md           ← このファイル（目次、≤100 行）
├── package.json        ← husky 専用 dev tooling メタパッケージ
├── .husky/pre-commit   ← static check + tests を git commit に強制
├── scripts/check.sh    ← 静的検証一括エントリ
├── frontend/           ← Vite + React + TS
├── backend/            ← Node + TS + Hono、src/schemas/ が API の source of truth
└── docs/
    ├── core-beliefs/   ← 黄金原則（カテゴリ別）
    ├── exec-plans/     ← active/ と completed/
    ├── failure-log.jsonl
    ├── dev-commands.md / code-review.md / context-loading.md / ARCHITECTURE.md
    └── product-specs/
```

---

## 触ってよい / 触ってはいけない

### 触ってよい
- `frontend/` / `backend/` / `docs/` / `tests/` 配下

### 触ってはいけない（人間承認が必要）
- リポジトリ直下の `documents/`（親文書、本プロジェクトのスコープ外）
- `.git/` / `.env` / 認証情報を含むファイル
- ルート直下の設定ファイル（`.gitignore` 等）の変更は事前確認

### 禁止コマンド
- `rm -rf` 系の広範削除
- `git push --force` / `git reset --hard`（明示指示なき限り）
- `git commit --no-verify`（hook を回避しない）

---

## 開発フロー（厳守）— 3 エージェント + Orchestrator + Reviewer

メインエージェントは **Orchestrator** として振る舞い、順に呼び出す:

1. **Planner** → 仕様 + 受入基準（AC は Happy/Edge/A11y/Error の 4 カテゴリ必須、HOW 禁止）
2. **ユーザー承認** → Orchestrator が仕様を提示、人間がレビュー
3. **Generator** → TDD で実装（AC 不変、ブラウザ操作しない）
4. **Evaluator** → MCP で AC 検証（コード非参照）→ fail なら批判を Generator へ（最大 5 回）
5. **Code Review（必須 2 周目）** → Evaluator pass 後に `code-reviewer` を必ず呼ぶ。`blocking`/`major` があれば Generator へ差戻し、`minor`/`nit` は Orchestrator 判断
6. **Record** → verdict=clean 後に commit、exec-plan を `completed/` へ

詳細: [`docs/exec-plans/active/phase5-multi-agent-harness.md`](docs/exec-plans/active/phase5-multi-agent-harness.md)

---

## ハーネスのフィードバックループ

GAN / 静的検証 / テスト / UI 検証 / ドリフト検出の 5 本で構成。詳細は [`docs/feedback-loops.md`](docs/feedback-loops.md)。

---

## コンテキスト読み込み（段階的開示）

このプロジェクトは **すべてを毎回読み込まない** 段階的開示方針です。**起動時自動ロードはこの AGENTS.md のみ**。タスクに応じて読むべきファイルは [`docs/context-loading.md`](docs/context-loading.md) の表を参照してください。

最初の 1 歩は常に [`docs/core-beliefs/index.md`](docs/core-beliefs/index.md)。

---

## ドキュメントへのリンク

- 黄金原則: [`docs/core-beliefs/index.md`](docs/core-beliefs/index.md) / 失敗ログ: [`docs/failure-log.jsonl`](docs/failure-log.jsonl)
- アーキ: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) / 作業計画: [`docs/exec-plans/active/`](docs/exec-plans/active/) [`completed/`](docs/exec-plans/completed/)
- 詳細手順: [`docs/dev-commands.md`](docs/dev-commands.md) / [`docs/code-review.md`](docs/code-review.md) / [`docs/context-loading.md`](docs/context-loading.md)
- 親文書: [`../documents/plan/plan.md`](../documents/plan/plan.md) / [`../documents/harnes-summary.md`](../documents/harnes-summary.md)
