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

## 開発フロー（厳守）

`Explore → Plan → Implement → Verify → Record` を守ること:

1. **Explore**: 関連コードと `docs/` を読む（[`docs/context-loading.md`](docs/context-loading.md) 参照）
2. **Plan**: `docs/exec-plans/active/<task>.md` に実行計画を書く
3. **Implement**: **1 セッション 1 機能、1 PR 1 目的**
4. **Verify**: `bash scripts/check.sh` + 必要に応じて MCP UI 検証 + `code-reviewer` subagent
5. **Record**: 完了したら exec-plan を `completed/` へ、`core-beliefs/<category>.md` に黄金原則を追記、必要なら `failure-log.jsonl` に新規 JSON を append

---

## ハーネスのフィードバックループ（5 種、詳細は各 pointer）

- **静的検証**: `bash scripts/check.sh`（lint + typecheck + format + AGENTS.md 行数ガード）→ [`docs/dev-commands.md`](docs/dev-commands.md)
- **API 契約テスト**: `cd backend && npm run test:run`（Vitest, Zod スキーマで実レスポンスを parse）→ 同上
- **pre-commit hook**: 上記 2 つを `git commit` 時に強制（husky）→ 同上
- **UI 検証**: Chrome DevTools MCP の `take_snapshot` を一次手段に → [`docs/core-beliefs/frontend.md`](docs/core-beliefs/frontend.md)
- **コードレビュー**: `code-reviewer` subagent（読み取り専用、core-beliefs 違反検出）→ [`docs/code-review.md`](docs/code-review.md)

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
