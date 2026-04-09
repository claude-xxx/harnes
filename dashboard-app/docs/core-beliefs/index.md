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
