# Phase 4 — Lv3 観測と継続改善

- **状態**: completed（Phase 4 完了）
- **作成**: 2026-04-10
- **依存**: Phase 3 完了 + Tailwind 移行 + TDD 基盤

---

## 目的

plan.md の Lv3「観測と継続改善」を実装する。ハーネスが **セッションをまたいでも自律的にドリフトを検出・是正** できる状態を目指す。

**キーインサイト**: `code-reviewer` は「今回の diff」をレビューする。Phase 4 のエージェントは「コードベース全体 vs ドキュメント」のドリフトを検出する。観点が異なる。

---

## サブタスク

| 番号 | 内容 | 概要 |
|---|---|---|
| **4-A** | `docs-drift-detector` subagent | 実装と docs（ARCHITECTURE.md / dev-commands.md / core-beliefs）の乖離を検出 |
| **4-B** | `harness-health-check` プロンプト | failure-log の未昇格エントリ、core-beliefs の陳腐化、テストカバレッジの gaps を一括チェック |
| **4-C** | core-beliefs 見直し + Phase 4 完了記録 | これまでの全 core-beliefs を棚卸し、陳腐化項目の GC、Phase 4 overview を completed/ へ |

### 4-A: `docs-drift-detector`

`.claude/agents/docs-drift-detector.md` に定義する読み取り専用 subagent。

**検出するドリフト**:
1. **dev-commands.md vs 実際の package.json scripts** — コマンド表に書かれているが実在しない or 逆のもの
2. **ARCHITECTURE.md vs 実際のディレクトリ構成** — 記述されているが存在しないパス、存在するが記述されていないパス
3. **core-beliefs/backend.md の API エンドポイント一覧 vs 実際の routes** — dev-commands.md のエンドポイント表がコードと一致するか
4. **core-beliefs/frontend.md の候補原則 vs 実装** — 候補が残ったまま昇格されずにいるものの棚卸し
5. **failure-log.jsonl の status=open エントリ** — 長期 open のまま放置されていないか

**出力**: `code-reviewer` と同じ構造化フォーマット（Findings リスト）。

### 4-B: `harness-health-check`

1 コマンドで「ハーネスの健全性」を一括チェックするプロンプト。subagent ではなくメインエージェントが実行する手順書（`docs/harness-health-check.md`）として定義:

- `failure-log.jsonl` の open エントリ数と再発回数
- `docs/exec-plans/active/` に残存するファイル数（0 が理想）
- `core-beliefs/*.md` の「検討中（昇格候補）」セクションの棚卸し
- AGENTS.md 行数の現在値
- テスト本数（BE + FE）
- `docs-drift-detector` を 1 回走らせた結果

### 4-C: core-beliefs 棚卸し

Phase 1〜3 + Tailwind + TDD で蓄積した core-beliefs を全ファイル走査し:
- 陳腐化した項目を削除 or 更新
- 「検討中」に長期滞留している候補の判断（昇格 or 却下）
- failure-log の open エントリの GC

---

## DoD

- [ ] `docs-drift-detector` subagent が `.claude/agents/` に存在し、実際に 1 回走って findings を出す
- [ ] `harness-health-check.md` が `docs/` に存在し、実行手順が明確
- [ ] harness-health-check を 1 回実行し、結果を記録
- [ ] core-beliefs の棚卸しが完了（陳腐化項目の削除 or 更新）
- [ ] Phase 4 overview を `completed/` に移動

---

## 非スコープ

- 定期自動実行（cron / CI）— ローカル開発プロジェクトなので手動起動で十分
- `exec-plan-archiver` subagent — 既に手動で `completed/` 移動を運用中、自動化の実需なし
- プロダクト機能の追加（Phase 4 はハーネスのメタ作業のみ）
