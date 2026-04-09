# code-review.md — `code-reviewer` subagent の使い方

> AGENTS.md は目次なので、subagent の運用詳細はこのファイルに集約しています。
> 定義ファイル本体は `harnes/.claude/agents/code-reviewer.md`。

---

## 目的

メインのコーディングエージェント（あなた）が書いた変更を、**別コンテキストの読み取り専用 subagent** にレビューさせて、自分では気づきにくい core-beliefs 違反や process 漏れを検出します。Phase 2-F で `plan.md` の Lv2 ループ④（コンテキスト分離レビュアー）として導入されました。

実際に Phase 2-F で代理レビューを 1 回回したところ、**メインエージェントが自力では検出できなかった本物の指摘 2 件**（Swagger UI の `app.get()` ルール違反、MCP recipe の AGENTS.md/frontend.md 重複）を返しました。**「自分で書いた直後のルールに自分が違反している」という、レビュアーが入らないと気づかないパターン**が実証されています。

---

## いつ呼ぶか

以下のいずれかに該当したら **commit 前に** 呼ぶことを基本ルールとします:

1. 変更が **複数ファイル** にまたがる
2. `backend/src/` または `frontend/src/` を触る
3. `docs/core-beliefs/*` または `docs/exec-plans/*` を追加・修正する
4. メインエージェントが「自分の作業が黄金原則を守れているか自信がない」状態
5. **AGENTS.md / `core-beliefs/` の構造変更**（FL-004 由来 — 行数膨張のような『目次自身の劣化』を検出させる）

---

## どう呼ぶか

メインエージェントが Claude Code の `Agent` ツールに以下を渡します:

```
subagent_type: code-reviewer
description: <短いタスク説明>
prompt: <具体的なレビュー依頼>
```

プロンプトには以下を含めると効果的です:

- **何をレビューしてほしいか**（例: 「現在の uncommitted diff を core-beliefs 全体に対して」）
- **直近の commit ハッシュ**（git log で確認できる範囲を明示）
- **特に注意して見てほしい観点**（あれば）
- **出力の語数制限**（暴走防止、~400-600 語推奨）

---

## 出力フォーマット（subagent 側で厳守させている）

```
## Code review report

**Reviewed**: <一文での説明>
**Scope**: <inspect したファイル一覧、最大10行>
**Verdict**: clean | minor-findings | blocking-findings

## Findings

### Finding N: <タイトル>
- **severity**: blocking | major | minor | nit
- **location**: <path>:<line>
- **what**: <1文>
- **why**: <違反した core-belief / process ルール>
- **how**: <具体的な修正手順>
- **ref**: <core-belief / failure-log / exec-plan のパス>

## Summary for the main agent
<2-3文>
```

指摘ゼロなら `*(no findings)*` + `verdict: clean`。**捏造は禁止**しています。

---

## メインエージェントの責任

- **subagent の指摘を盲従しない**。必ず自分で評価してから採用する
- **subagent には `Edit` / `Write` を与えていない**。修正は **常にメインに戻る**（責務分離）
- 採用しなかった指摘がある場合、その理由を後続の作業ログに残す
- 重大な false positive が複数回出た場合は、subagent 定義を更新する（Phase 2-F の exec-plan 内で議論）

---

## 制約（Phase 2-F の学びより）

- **subagent は session 開始時にしかロードされない**。`.claude/agents/*.md` を mid-session で新規作成しても、その回では `subagent_type` 一覧に載りません。**追加・大幅修正のあとは Claude Code の再起動が必要**。
- 再起動できない暫定回避: `general-purpose` agent に「あなたの行動原理は `harnes/.claude/agents/code-reviewer.md` にある。それをまず Read してその通りに動け」と渡す **代理プロンプト方式**。Phase 2-F では実際にこれで integration test を回しました。

---

## 関連

- 定義ファイル本体: [`../../.claude/agents/code-reviewer.md`](../../.claude/agents/code-reviewer.md)
- Phase 2-F の完了 plan + 学び: [`exec-plans/completed/phase2f-code-reviewer-agent.md`](exec-plans/completed/phase2f-code-reviewer-agent.md)
- process ルール（core-beliefs/index.md の「非自明な変更は code-reviewer に投げる」）: [`core-beliefs/index.md`](core-beliefs/index.md)
