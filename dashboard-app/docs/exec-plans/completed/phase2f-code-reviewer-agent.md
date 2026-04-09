# Phase 2-F: `code-reviewer` カスタムサブエージェント

- **状態**: completed
- **開始**: 2026-04-10
- **完了**: 2026-04-10
- **目的**: メインのコーディングエージェントが書いたコードを **別コンテキスト** でレビューする最初のサブエージェントを `harnes/.claude/agents/code-reviewer.md` に定義する。Phase 2 の最後のサブフェーズで、plan.md の Lv2 ループ④（レビュー用サブエージェント）を実体化する。
  - Hashimoto / Ralph Wiggum 流の「同じ失敗を 2 回しないために、人間がレビューで指摘していたことを 1 つずつエージェント化していく」営みの最初の一歩。

> **1セッション1機能、1PR1目的を死守する。** サブエージェントを **1 体だけ** 作る。`spec-checker` や `golden-principle-checker` 等の追加は別 exec-plan。

---

## 背景

- Phase 2-A〜2-E で「プロンプトより仕組みが強い」を 3 種類の loop に体系化した: 静的検証 (lint/format/type)、契約テスト (Vitest)、UI 検証 (MCP)。
- これでも残る gap: **「core-beliefs に書いてあるが、まだ機械化されていない原則」** をコードが守っているかは、誰も自動チェックしていない。例:
  - BE: `app.get()` 直書き禁止（`backend.md` の昇格候補）
  - FE: `react-markdown` 経由必須（`frontend.md` のたたき台）
  - process: 「同じ失敗を 2 回踏んだら failure-log に追記」が守られているか
  - process: AGENTS.md / core-beliefs / exec-plan の更新漏れ
  - 構成: `harnes/` 直下にハーネスを置いていないか（`FL-003` 由来）
- これらを **メインのエージェント自身がレビューする**と、「自分の作業に対して甘い目で見る」バイアスがかかる。**別コンテキストの subagent に独立判断させる**ことで、Hashimoto 流の「人間がレビューで指摘していたことを 1 つずつ自動化」を最小実装する。

---

## スコープ

### やる
- `harnes/.claude/agents/code-reviewer.md` を新規作成（Claude Code が CWD = `harnes/` から起動されている前提）
- 役割を **dashboard-app/ 配下のレビュー** に **狭く限定**
- ツールは **読み取り系のみ**: `Read`, `Grep`, `Glob`, `Bash`（`git diff`/`git log` 用）。`Edit` / `Write` は与えない。
- 出力フォーマットを **エージェントフレンドリー** にする: 1 件 = `severity / file:line / 何が問題 / なぜ違反 / どう直すか / 参照する core-belief` の 6 要素
- 統合テスト: 実際にこのフェーズ完了直後に **Agent ツール経由でこの subagent を呼び**、現在の uncommitted 変更（Phase 2-E で書いたドキュメント類）を core-beliefs に対してレビューさせる。指摘がゼロなら「ハーネスは健全」、何か出たら直す or core-belief 側を修正する。
- AGENTS.md と `core-beliefs/index.md`（process 系）に「**非自明な変更は code-reviewer subagent に投げる**」を追記
- `failure-log.jsonl` の関連エントリ更新は **なし**（新規エントリも作らない。subagent の追加は再発防止ではなく予防）

### やらない（次フェーズ以降）
- `spec-checker`（実装が `product-specs/` の意図とズレていないかを確認する2体目）
- `golden-principle-checker`（GC として core-beliefs ドリフトを検知する3体目）
- `docs-drift-detector` / `exec-plan-archiver`（plan.md Lv3 で言及）
- subagent を pre-commit hook で **必須化** すること（Phase 2 のスコープでは「使うかどうかは人間/メインエージェントの裁量」。常設化は別フェーズで判断）
- subagent に **自動修正権限**（`Edit` / `Write`）を与えること。**出力は指摘 → 直す手順までとし、修正はメインエージェントが行う**。

---

## 設計判断

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| 配置場所 | **`harnes/.claude/agents/code-reviewer.md`** | Claude Code は CWD = `harnes/` 起動時に `harnes/.claude/agents/` を auto-discover する。`harnes/.claude/settings.local.json` が既に存在しており、Claude Code の wire-up は元から `harnes/` に確立済み。FL-003 の「ハーネスは dashboard-app/ に閉じ込める」ルールはここでは適用しない（Claude Code の設定は別レイヤ）。 |
| 名前 | `code-reviewer` | plan.md の指定通り。短く・役割が一意に伝わる。 |
| description（呼び出し条件） | 「dashboard-app/ への非自明な変更を core-beliefs/ に対してレビューする」 | description が呼び出し判定に使われるので、**「いつ呼ぶか」を文章で明示** |
| ツール | `Read`, `Grep`, `Glob`, `Bash` のみ | 読み取り限定。`Edit` / `Write` を与えない（修正はメインエージェントが行うべき、責務分離）。`Bash` は git diff/log 用に必須。 |
| モデル | `sonnet`（明示） | レビュー用途は重い思考より「広く読む」側の作業。Opus は不要。コスト・速度・コンテキスト容量のバランス。 |
| スコープ | **`dashboard-app/` 配下のみ**。`documents/`, `harnes/.claude/`, `.git/` 等は一切触らない | プロンプトに明記。スコープ外を聞かれたら「対象外」と返す指示を入れる。 |
| 出力フォーマット | `severity / file:line / what / why / how / ref` の 6 要素を 1 件ずつ。指摘がなければ "no findings" と明示 | エージェント間で渡しやすい構造化出力。lint メッセージと同じ流儀。 |
| レビューの観点 | (1) **未機械化の core-belief の遵守**, (2) **AGENTS.md / core-beliefs / failure-log / exec-plan の更新漏れ**, (3) **過剰設計の検出** | lint で拾える話は lint に任せ、subagent はギャップを埋める。 |
| 自動修正 | **やらない**。指摘 + 直す手順までで停止 | サブエージェントが書き戻すと変更の透明性が落ちる（Phase 2-C の hook と同じ流儀）。 |
| 起動方法 | メインエージェントが `Agent` ツールに `subagent_type: code-reviewer` で渡す | プロンプト一発で別コンテキストに作業を任せられる。 |

---

## やること（順番）

1. **agent 定義ファイルを書く**: `harnes/.claude/agents/code-reviewer.md`
   - frontmatter: `name`, `description`, `tools`, `model`
   - body: 役割 → スコープ → レビュー観点（チェックリスト形式）→ 出力フォーマット → 禁止事項
2. **統合テスト**: メインから `Agent` ツールでこの subagent を呼び、以下のタスクを与える:
   - 「現在 git status に出ている uncommitted 変更（Phase 2-E のドキュメント変更を含む）を、`dashboard-app/docs/core-beliefs/` 配下のすべての原則に照らしてレビューせよ」
   - 出力を本 exec-plan の「学び」セクションに貼る
3. **指摘への対応**:
   - 指摘がゼロなら → ハーネスが健全であることが確認できた
   - 指摘が出たら → メインエージェントが個別に対応 or core-belief 側を更新
4. **ドキュメント更新**:
   - `AGENTS.md` の「まだ存在しないもの」から `code-reviewer` 行を削除
   - `AGENTS.md` に「**Code review subagent**」の節を追加: いつ呼ぶか、どう呼ぶか、出力をどう扱うか
   - `docs/core-beliefs/index.md` の process 節に「非自明な変更は `code-reviewer` subagent に投げる」を 1 行追加
5. **アーカイブ**: 学びを末尾に追記し `completed/`

---

## ハーネス的観点での自戒

- **subagent を 1 体しか作らない**。`spec-checker` も `golden-principle-checker` も誘惑が強いが、別 exec-plan に温存する。
- **subagent に過剰な責務を与えない**。「すべてのコードを完璧にレビューする万能 reviewer」にしない。**狭い責務 = `dashboard-app/` の core-beliefs 遵守チェックのみ**。
- **subagent に Edit / Write を与えない**。修正はメインに戻す。
- **subagent を pre-commit hook に組み込まない**。それは別レイヤの判断。subagent はあくまで「メインが裁量で呼ぶ」ツール。
- **subagent の出力フォーマットを揺らさない**。1 度決めた 6 要素構造を守る。

---

## 既知のリスク / 不確実性

- Claude Code の subagent 呼び出しがどの程度確実に description マッチで起動するかは未確認。明示的に `subagent_type: code-reviewer` を指定して呼ぶ前提で運用する。
- subagent が誤検知（false positive）を出したとき、メインエージェントがそれに引きずられる可能性。**subagent の指摘は必ずメインが評価してから採用する**ことをプロンプトに書く。
- subagent の system prompt が長くなりすぎるとレビューの質が落ちる。**150 行以内** に収める努力をする。

---

## 学び・遭遇した問題

### 作業ログ

- **subagent は session 開始時にしかロードされない**: `.claude/agents/code-reviewer.md` を作成した直後に `Agent(subagent_type: "code-reviewer", ...)` で呼ぼうとしたが、`Agent type 'code-reviewer' not found. Available agents: general-purpose, statusline-setup, Explore, Plan, claude-code-guide` でエラーになった。Claude Code は subagent の一覧を起動時に静的に読み込む。**新しい subagent を追加した場合、有効化には Claude Code の再起動が必要**。これは AGENTS.md の Code review subagent 節に明示した。今回は workaround として `general-purpose` agent に「あなたの行動原理は `harnes/.claude/agents/code-reviewer.md` にある。それをまず Read してその通りに動け」と渡す **代理プロンプト方式**で integration test を回した。
- **subagent 定義は日本語で書く**: 最初英語で書いたところユーザーから即座に「日本語で書いて」と指示があった。プロジェクトの core-beliefs と AGENTS.md がすべて日本語なので、subagent もそれらを参照する以上、日本語の方が用語の対応が取りやすい。日本語で書き直した。
- **代理レビューが本物の指摘を 2 件返した**:
  - **Finding 1 (minor)**: `backend/src/app.ts:86` の `app.get('/api/doc', swaggerUI(...))` が、自分で書いたばかりの `backend.md` の「API は Zod スキーマ駆動、`app.get()` 直書き禁止」ルールに違反していた。**Swagger UI は HTML を返すユーティリティであって JSON 契約ではない**ため、ルール側に carve-out（`app.doc`、Swagger UI、静的配信、リダイレクト等）を入れて意図を honest に明文化した。`app.ts` の該当行にも「これは documented carve-out」コメントを追記した。
  - **Finding 2 (nit)**: MCP UI 検証の 8 ステップレシピが `AGENTS.md` と `core-beliefs/frontend.md` の両方に存在し、AGENTS.md の冒頭の「百科事典ではなく目次」原則に反していた。レシピ本体を `frontend.md` に集約し、`AGENTS.md` には pointer のみを残した。
  - **Finding 3 (nit)**: Phase 2-F の exec-plan が `active/` に残っている（このフェーズの終了時点でアーカイブする予定なので想定通り）。
- **「自分のレビューは自分には甘い」が実証された**: 私（メインエージェント）はこの 2 件を自力では検出できていなかった。特に Finding 1 は **直前のフェーズで自分が書いたばかりのルールに自分が違反している** という、レビュアーが入らないと絶対に気づかないパターン。**これがハーネスエンジニアリングで「別コンテキストの subagent に独立判断させる」効果の現実の例**。
- **代理プロンプト方式の有効性**: subagent ロードができない状況で、定義ファイル本体を「あなたの行動原理として読め」と渡すことで、ほぼ同等の挙動が得られた。次セッションで本物の `subagent_type: code-reviewer` が動けば、このワークアラウンドは不要になる。

### 仕組み化に値する学び（→ core-beliefs / AGENTS.md に転記済み）

1. **`backend.md` のルール carve-out**: 「API は Zod スキーマ駆動」原則に「JSON 契約を持たないユーティリティハンドラ（Swagger UI、静的配信、リダイレクト等）は raw `app.get()` 可」を **明示の例外リスト** として追加した。**暗黙の例外は禁止**で、新しい carve-out が必要なら必ずこのリストを拡張する形で記録する。
2. **AGENTS.md は目次・recipe は core-beliefs**: 操作手順の本体は core-beliefs 配下に集約し、AGENTS.md は pointer に徹する。今回は `frontend.md` に MCP recipe を移した。次に何かレシピを書きたくなったら、まず core-beliefs / docs を当たる。
3. **subagent は session 起動時ロード**: 新規 subagent を追加したセッションでは使えないので、`.claude/agents/*.md` の追加・大幅修正が走った後は **次セッションで再起動が必要**。AGENTS.md の Code review subagent 節に明示した。
4. **process: 非自明な変更は code-reviewer に投げる**: `core-beliefs/index.md` の process セクションに 1 行追加した。これでメインエージェントが「いつ呼ぶか」の判断基準を持てる。

### 完了時の状態

- 新規ファイル: `harnes/.claude/agents/code-reviewer.md`（日本語、約 110 行、frontmatter + 役割 + スコープ + チェック観点 ABCDE + 出力フォーマット + 厳守ルール）
- 更新ファイル:
  - `dashboard-app/docs/core-beliefs/backend.md`: carve-out 明示
  - `dashboard-app/docs/core-beliefs/index.md`: process に「非自明な変更は code-reviewer に投げる」
  - `dashboard-app/docs/core-beliefs/frontend.md`: MCP の最小レシピを集約
  - `dashboard-app/AGENTS.md`: Code review subagent 節を新設、MCP recipe 本体を削除して pointer 化、「まだ存在しないもの」から code-reviewer 行を削除
  - `dashboard-app/backend/src/app.ts`: Swagger UI mount 行に carve-out コメントを追加
- `bash dashboard-app/scripts/check.sh` → green
- 代理 review の戻り値（findings 3 件）はすべて処理済み

### plan.md の Lv2 ループ④ 達成状況

> ループ④ レビュー用サブエージェント（コンテキスト分離）
> - 役割: メインのコーディングエージェントが書いたコードを **別コンテキスト** でレビューする
> - これは OpenAI の Ralph Wiggum ループの最小再現

- ✅ `code-reviewer` subagent を 1 体定義した（`.claude/agents/code-reviewer.md`）
- ✅ 狭い責務（dashboard-app/ 配下の core-beliefs 遵守チェック）に絞った
- ✅ Read-only（`Edit` / `Write` を持たない）で責務分離した
- ✅ 出力フォーマット（6 要素の構造化指摘）を厳守させた
- ✅ 実際に 1 回呼んで（代理プロンプト方式で）レビューを回し、**メインエージェントが自力では検出できなかった本物の指摘 2 件**を得た
- ✅ 指摘を反映してコードと core-belief を直した
- ⚠️ 本物の `subagent_type: code-reviewer` 経由での起動は、Claude Code 再起動後の次セッションで初めて動作確認可能

### plan.md の Phase 2 全体達成状況

| サブフェーズ | 内容 | 状態 |
|---|---|---|
| 2-A | 静的検証ループ（ESLint/Prettier/typecheck/scripts/check.sh） | ✅ |
| 2-B | API 契約とテスト（@hono/zod-openapi + Vitest） | ✅ |
| 2-C | Pre-commit hook（husky） | ✅ |
| 2-D | 最初のカスタム lint（FE で `node:*` import 禁止） | ✅ |
| 2-E | Chrome DevTools MCP UI 検証ループ | ✅ |
| 2-F | `code-reviewer` カスタムサブエージェント | ✅ |

**Phase 2 完了**。次は Phase 3（機能を増やしながらハーネスを育てる）か Phase 2-G（Playwright 導入）。
