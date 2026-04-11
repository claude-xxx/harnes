# core-beliefs/ — 設計判断の軸と黄金原則

> **このディレクトリは「段階的開示」を前提に設計されています。**
> エージェントは **すべてを毎回読み込んではいけません**。タスクに該当するカテゴリのファイルだけをピンポイントで読んでください。
> ルールが安定したら、**カスタムリンタ・テスト・型** に昇格させる（プロンプトより仕組みが強い）。

---

## カテゴリと「いつ読むか」

| ファイル | 読むべきタイミング |
| --- | --- |
| [`frontend.md`](frontend.md) | `frontend/` 配下を編集するとき |
| [`backend.md`](backend.md) | `backend/` 配下を編集するとき |
| [`infra.md`](infra.md) | FE↔BE 通信、ポート、ビルド設定、依存方向に関わるとき |
| [`tooling.md`](tooling.md) | 開発環境（OS、シェル、npm スクリプト、起動・停止）に関わるとき |

`process` 系（ワークフロー、Phase 進行、既知のリスクなど）は `index.md`（このファイル）にのみ書き、別ファイルにはしない。

---

## process（プロジェクト全体に効くルール）

- **1セッション1機能、1PR1目的**を厳守する。
- **失敗したらコードより先にハーネスを直す**: 同じ失敗を2回踏んだら、まず該当カテゴリの core-belief に1行追記してから直す。
- **安定した core-belief は機械化に昇格させる**: ESLint ルール、Vitest テスト、型、pre-commit hook のいずれかへ。昇格した時点で `failure-log.jsonl` の該当エントリの `status` を `promoted` にし、`promoted_to` を埋める。
- **開発は 3 エージェント + Orchestrator + Reviewer の敵対的ループで進める**（Phase 5 で確立）:
  - **Planner** → 仕様 + 受入基準を生成（HOW は書かない）。AC は **Happy / Edge / A11y / Error の 4 カテゴリ各 1 個以上必須**（初回 pass で終わらせずブラッシュアップ余地を残すため）
  - **Generator** → TDD で実装（受入基準を変えない、ブラウザ操作しない）
  - **Evaluator** → MCP でブラウザ検証（Generator のコードは読まない = 敵対性）。fail → Generator に批判を渡してリトライ（最大 5 回）
  - **code-reviewer（必須 2 周目）** → Evaluator pass 後に必ず呼ぶ。品質軸（過剰設計 / Zod source of truth / AGENTS.md 行数 / core-beliefs 違反等）で検証し、blocking/major があれば Generator へ差戻し。Evaluator が「外形検証のみ」に専念できるのはこの段が後続にあるため
  - pass + clean → commit
  - メインエージェントは **Orchestrator** に徹し、自分で計画・実装・検証を一括で行わない
  - 詳細: `docs/feedback-loops.md` / `docs/exec-plans/active/phase5-multi-agent-harness.md`
- **`AGENTS.md` は 100 行以内を維持する**（FL-004 由来）。詳細は `docs/` 配下の専用ファイル（`dev-commands.md` / `code-review.md` / `context-loading.md` 等）に切り出して、`AGENTS.md` には pointer のみを残す。
  - 機械化済み: `scripts/check.sh` が AGENTS.md の行数を検査し、**120 行（100 行目標 + 20 行マージン）を超えると fail** する。pre-commit hook で git commit が阻止される。
  - 100 行を超えそうになったら、新しい節を AGENTS.md に追加するのではなく、まず **どの docs/ ファイルに移すか** を考えること。新しいトピックなら新ファイルを `docs/<topic>.md` として作る。

---

## failure-log.jsonl のスキーマ（**正準定義**）

`docs/failure-log.jsonl` は **1行 = 1 JSON レコード** の append-only ファイル。
**自動ロード対象外**。検索・集計・GC サブエージェントが走査するためのアーカイブ。

### スキーマ

```jsonc
{
  "id": "FL-001",                  // 連番。FL-NNN 形式
  "date": "YYYY-MM-DD",            // 発見日
  "category": "tooling",            // frontend | backend | infra | tooling | process
  "title": "短い見出し",
  "situation": "何が起きたか",
  "cause": "なぜ起きたか",
  "fix": "どう対処したか",
  "status": "open",                 // open | promoted | wontfix
  "promoted_to": null,              // null または昇格先 (例: "eslint:no-direct-fetch", "test:api.test.ts", "hook:pre-commit", "agent:code-reviewer")
  "recurrence": []                  // 再発した日付の配列。length が再発回数
}
```

### 書き方のルール

- 1行 1 レコードの **JSONL**（pretty-print 禁止、必ず 1 オブジェクト 1 行）。
- `id` は単調増加。重複させない。
- 既存レコードの修正は許可（特に `status`, `promoted_to`, `recurrence` の更新）。ただし `id`, `date`, `situation`, `cause` は **不変** とする。
- 同じ失敗が再発したら、新規エントリは作らず、既存レコードの `recurrence` に日付を追加する。
- レコードを追加・更新したら、対応する markdown のカテゴリファイルにも黄金原則を追記するか検討する。

### よく使うクエリ例（ターミナル）

```bash
# 未昇格の項目を一覧
jq -c 'select(.status=="open")' docs/failure-log.jsonl

# カテゴリ別件数
jq -r '.category' docs/failure-log.jsonl | sort | uniq -c

# 再発回数が多い順（昇格の最有力候補）
jq -c 'select(.recurrence | length >= 2)' docs/failure-log.jsonl
```
