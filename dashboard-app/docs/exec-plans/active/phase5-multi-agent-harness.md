# Phase 5 — 3 エージェント + Orchestrator ハーネスへの再構築

- **状態**: plan（設計完了、実装は別セッション）
- **作成**: 2026-04-11
- **依存**: Phase 4 完了（`4dddfbd`）
- **動機**: ユーザーからの指摘「ハーネスエンジニアリングは役割を持ったエージェントが敵対的に FB ループを回すもの。今はそれができていない」

---

## 背景: なぜ今のアーキテクチャでは不十分か

### 現状 (Phase 4 完了時点)

```
[ユーザー] → [メインエージェント (1 体)]
                 ├─ 計画する
                 ├─ 実装する
                 ├─ テストを書く
                 ├─ UI を確認する
                 ├─ ドキュメントを更新する
                 └─ (任意で) code-reviewer subagent を呼ぶ
```

**問題点**:
1. **自分で書いて自分で評価している** — Generator と Evaluator が同一コンテキスト内にいるため「お手盛り」になる
2. **Planner が存在しない** — 計画と実装が分離されておらず、実装しながら計画を変える（計画のドリフト）
3. **Evaluator が実際にアプリを動かさない** — code-reviewer は diff を読むだけ。ブラウザ操作による実地検証がない
4. **FB ループが強制されない** — code-reviewer の呼び出しはメインの善意に依存。呼び忘れれば素通り
5. **敵対性がない** — Generator と Evaluator が敵対関係にないため、品質を押し上げる力が働かない

### Anthropic の 3 エージェントハーネス（参考）

出典: [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Anthropic が 2026 年に公開した設計では、GAN（敵対的生成ネットワーク）の構造を応用:
- **Planner**: ユーザーの 1〜4 文のプロンプトから詳細な製品仕様を生成。HOW ではなく WHAT を定義
- **Generator**: 仕様に基づいて実装。各スプリント後に自己評価してから Evaluator へ引き渡し
- **Evaluator**: Playwright MCP で実際にアプリを操作して検証。定量的に採点し、不合格なら具体的な批判を返す
- **フィードバックループ**: 5〜15 イテレーション。Generator が作り、Evaluator が壊す。この敵対的関係が品質を押し上げる

参考記事:
- [The GAN-Style Agent Loop - Epsilla](https://www.epsilla.com/blogs/anthropic-harness-engineering-multi-agent-gan-architecture)
- [Anthropic's Three-Agent Harness - InfoQ](https://www.infoq.com/news/2026/04/anthropic-three-agent-harness-ai/)
- [The Code Agent Orchestra - Addy Osmani](https://addyosmani.com/blog/code-agent-orchestra/)

---

## ターゲットアーキテクチャ

### 全体フロー

```
[ユーザー]: 「〇〇を追加して」
        ↓
[Orchestrator (メインエージェント)]
        ↓ ① ユーザー要求を渡す
[Planner Agent] ← 独立コンテキスト
  - core-beliefs / ARCHITECTURE.md / 既存コードを読む
  - 詳細仕様 (exec-plan) を生成
  - 受入基準 (acceptance criteria) を定義 — チェック可能な具体的条件
  - 実装方法 (HOW) は書かない
  - 出力: exec-plan + acceptance-criteria.md
        ↓ ② 仕様書 + 受入基準
[Orchestrator]
  - ユーザーに仕様を提示して承認を取る（人間ゲート）
        ↓ ③ 承認済み仕様
[Generator Agent] ← 独立コンテキスト
  - 仕様 + 受入基準 + core-beliefs のみを受け取る（Planner の思考過程は見ない）
  - TDD: 受入基準 → テストコード → 実装
  - 自己チェック: lint / typecheck / format / test green
  - 受入基準を自分で変更しない（Planner が定めた基準に従う）
  - 出力: 実装済みコード + テスト
        ↓ ④ 実装完了通知
[Orchestrator]
        ↓ ⑤ 「検証してください」
[Evaluator Agent] ← 独立コンテキスト、Generator のコードを読まない
  - 受入基準のみを見る（Generator の実装意図は見ない）
  - MCP (Chrome DevTools) で実際にブラウザを操作して検証
  - 各受入基準に対して pass/fail を判定
  - 不合格: 具体的な批判を構造化して返す（何が壊れている、何が基準を満たさない）
  - 合格: 「承認」を返す
  - 出力: evaluation-report (pass/fail + 批判 or 承認)
        ↓ ⑥ evaluation-report
[Orchestrator]
  - 不合格 → ⑦ Generator に批判を渡して再実装 (→ ④ に戻る)
  - 合格 → ⑧ commit + record (exec-plan を completed/ へ、core-beliefs 更新)
```

### ループの停止条件

- **合格**: Evaluator が全受入基準を pass と判定
- **最大イテレーション**: 5 回（超えたらユーザーにエスカレーション）
- **ユーザー中断**: いつでも停止可能

---

## 各エージェントの詳細設計

### Planner Agent (`planner.md`)

| 項目 | 内容 |
|---|---|
| **ファイル** | `.claude/agents/planner.md` |
| **ツール** | `Read`, `Grep`, `Glob`, `Bash` (読み取り専用) |
| **モデル** | sonnet（高速で十分、計画は短い） |
| **コンテキスト** | core-beliefs, ARCHITECTURE.md, 既存コード構造, ユーザー要求 |
| **出力形式** | exec-plan + acceptance-criteria（Markdown） |

**入力**:
- ユーザーの要求（1〜数文）
- 現在のコードベースの構造（ARCHITECTURE.md + Glob 結果）

**出力**:
- `docs/exec-plans/active/<task>.md` — 仕様書（WHAT を書く、HOW は書かない）
- 受入基準セクション — 各基準は以下の形式:
  ```
  - [ ] AC-1: 〇〇ページを開いたとき、△△が表示される
  - [ ] AC-2: □□ボタンをクリックしたとき、◇◇に遷移する
  - [ ] AC-3: API エンドポイント GET /api/xxx が 200 を返す
  - [ ] AC-4: コンソールエラーが 0 件
  ```
- **制約**: 実装方法を指示しない。「React コンポーネントを作って...」ではなく「ユーザーが〇〇できる」の形で書く

**やらないこと**:
- コードを書く
- ファイルを編集する
- 実装方法を指定する

### Generator Agent (`generator.md`)

| 項目 | 内容 |
|---|---|
| **ファイル** | `.claude/agents/generator.md` |
| **ツール** | `Read`, `Grep`, `Glob`, `Bash`, `Edit`, `Write` (全ツール) |
| **モデル** | opus（実装品質が重要） |
| **コンテキスト** | exec-plan + acceptance-criteria + core-beliefs + 実装対象のコード |

**入力**:
- Planner が生成した exec-plan + 受入基準
- Evaluator からの批判（2 回目以降のイテレーション）

**フロー**:
1. 受入基準を読む
2. TDD: 受入基準をテストコードに変換（Red）
3. テストを通す最小実装を書く（Green）
4. リファクタ（Refactor）
5. 自己チェック: `bash scripts/check.sh` + `npm run test:run` (BE + FE)
6. 完了をオーケストレータに報告

**制約**:
- 受入基準を自分で変更しない（Planner が定めた基準を尊重）
- core-beliefs に違反しない
- 1 ファイル 1 コンポーネント (FL-005)
- Tailwind CSS のみ (FL-006)
- テストなしの実装は禁止 (FL-007)

**やらないこと**:
- ブラウザを操作する（MCP ツールは持たない）
- 受入基準を定義する
- exec-plan を書く

### Evaluator Agent (`evaluator.md`)

| 項目 | 内容 |
|---|---|
| **ファイル** | `.claude/agents/evaluator.md` |
| **ツール** | `Read`, `Grep`, `Glob`, `Bash`, Chrome DevTools MCP (`take_snapshot`, `click`, `type_text`, `wait_for`, `list_console_messages`, `list_network_requests`, `new_page`, `close_page`) |
| **モデル** | sonnet（検証は速度重視） |
| **コンテキスト** | 受入基準のみ + 実行中のアプリ（MCP 経由）|

**入力**:
- Planner が生成した受入基準（AC-1, AC-2, ...）
- dev server の URL (`http://localhost:5173/`)

**フロー**:
1. 受入基準を 1 つずつ検証:
   - `new_page` でブラウザを開く
   - `take_snapshot` で a11y ツリーを取得
   - `click` / `type_text` / `wait_for` で操作
   - 基準に照らして pass/fail を判定
2. `list_console_messages` でエラー 0 件を確認
3. `list_network_requests` で API レスポンスを確認
4. 検証レポートを出力

**出力形式**:
```markdown
## Evaluation Report

**Verdict**: pass | fail

### AC-1: 〇〇ページを開いたとき、△△が表示される
- **result**: pass
- **evidence**: take_snapshot で △△ を確認

### AC-2: □□ボタンをクリックしたとき、◇◇に遷移する
- **result**: fail
- **criticism**: ボタンをクリックしたが画面が変化しなかった。
  snapshot 上に □□ ボタンが存在するが、onClick が発火していない模様。
  期待: ◇◇ が表示される。実際: 元の画面のまま。

### Console errors
- **result**: pass (0 件)

### Network
- **result**: pass (全 API 200)
```

**制約**:
- **Generator のソースコードを読まない** — 受入基準とブラウザ上の実際の挙動のみで判断する（敵対性の担保）
- ファイルを編集しない
- 受入基準を変更しない

**やらないこと**:
- コードを書く
- 実装の詳細を見る
- 修正方法を提案する（「何が壊れている」だけ伝え、「どう直す」は Generator の仕事）

---

## Orchestrator（メインエージェント）の役割

Orchestrator は **新しい subagent ではなく、メインエージェント自体** が担う。Claude Code のメインセッションが 3 つの subagent を順に呼び出し、メッセージを橋渡しする:

```typescript
// 擬似コード — 実際は Claude Code の Agent ツールで実行
async function orchestrate(userRequest: string) {
  // Phase 1: Plan
  const plan = await Agent({ subagent_type: 'planner', prompt: userRequest });
  const approved = await askUser(plan); // 人間ゲート
  if (!approved) return;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Phase 2: Generate
    const feedback = i === 0 ? null : evaluation.criticism;
    await Agent({ subagent_type: 'generator', prompt: plan + feedback });

    // Phase 3: Evaluate
    const evaluation = await Agent({ subagent_type: 'evaluator', prompt: plan.criteria });

    if (evaluation.verdict === 'pass') {
      commit();
      return;
    }
  }
  escalateToUser("最大イテレーションに到達");
}
```

**Orchestrator の責務**:
1. ユーザー要求を Planner に渡す
2. Planner の出力（exec-plan + 受入基準）をユーザーに提示して承認を取る
3. Generator に仕様を渡して実装させる
4. Evaluator に受入基準を渡して検証させる
5. Evaluator が fail を返したら、批判を Generator に渡してリトライ
6. Evaluator が pass を返したら commit + record
7. 最大イテレーション (5 回) を超えたらユーザーにエスカレーション

**Orchestrator がやらないこと**:
- 自分でコードを書く
- 自分で計画を立てる
- 自分で検証する
- Evaluator の判定を上書きする

---

## 既存エージェントの扱い

| 既存 | Phase 5 での扱い |
|---|---|
| **code-reviewer** | **Evaluator に統合**。diff レビュー + ブラウザ操作検証を 1 つのエージェントに統合するか、Evaluator の補助として残すか検討。初期は Evaluator 一本で運用し、必要になったら分離。 |
| **docs-drift-detector** | **独立で存続**。3 エージェントループとは直交する定期メンテナンスツール。Orchestrator がセッション終了時に任意で呼ぶ。 |

---

## コミュニケーション方式

### エージェント間のデータ受け渡し

Claude Code の subagent は prompt 文字列でのみ入力を受け取り、結果文字列でのみ出力を返す。ファイルベースのコミュニケーションも併用する:

| データ | 書き手 | 読み手 | 方式 |
|---|---|---|---|
| exec-plan + 受入基準 | Planner | Generator, Evaluator | ファイル (`docs/exec-plans/active/<task>.md`) |
| 実装コード + テスト | Generator | Evaluator (間接的にブラウザ経由) | ファイルシステム + dev server |
| evaluation-report | Evaluator | Orchestrator → Generator | 戻り値 (文字列) |
| 批判 (fail 時) | Evaluator | Generator (Orchestrator 経由) | prompt 引数に含める |

### コンテキスト隔離の原則

- **Planner は Generator のコードを見ない** — 「どう実装するか」は Generator の裁量
- **Generator は Evaluator の判定ロジックを見ない** — 受入基準だけ見て実装する
- **Evaluator は Generator のソースコードを見ない** — ブラウザ上の挙動と受入基準だけで判定する

この隔離が **敵対性** を担保する。互いの内部状態を知らないからこそ、甘い判定が生まれない。

---

## 実装ステップ（Phase 5 を着手するとき）

### 5-A: エージェント定義の作成
1. `.claude/agents/planner.md` を新設
2. `.claude/agents/generator.md` を新設
3. `.claude/agents/evaluator.md` を新設
4. 既存の `code-reviewer.md` は一旦残す（Evaluator で置き換え可能か実験後に判断）

### 5-B: Orchestrator ワークフローの確立
1. AGENTS.md の「開発フロー」セクションを Orchestrator フローに更新
2. core-beliefs/index.md の process ルールを更新
3. docs/dev-commands.md に新しい開発フローを記載

### 5-C: 最初の実機テスト
1. 小さな機能追加（例: ファイル作成日時の表示）を題材にする
2. Planner → Generator → Evaluator のループを 1 周回す
3. 各エージェントの出力品質と連携を評価
4. 問題点をハーネスにフィードバック

### 5-D: 振り返りと調整
1. ループ 1 周の所要時間とコストを記録
2. 各エージェントの prompt を調整
3. 受入基準の粒度が適切か評価
4. core-beliefs に新パターンを追記
5. 不要になった旧エージェント (code-reviewer) の整理

---

## リスクと軽減策

| リスク | 影響 | 軽減策 |
|---|---|---|
| **ループが収束しない** | Generator と Evaluator が 5 回以上ピンポンして時間・コストが膨張 | 最大イテレーション制限 (5 回) + ユーザーエスカレーション |
| **Evaluator が厳しすぎる** | 些細な差異で fail を返し続け、Generator が永遠に修正する | 受入基準の粒度を Planner が適切に設定する。nit は pass 扱い |
| **Evaluator が甘すぎる** | pass を返すが実際には品質が低い | 受入基準を具体的・検証可能にする（「見た目がきれい」ではなく「h1 タグが存在する」） |
| **コンテキスト消費が大きい** | 3 subagent × N イテレーション = コンテキスト爆発 | 各 subagent は独立コンテキスト（メインと共有しない）。subagent のプロンプトは最小限の情報のみ渡す |
| **dev server の状態依存** | Evaluator が MCP でブラウザ操作するには dev server が起動している必要がある | Generator 完了後、Evaluator 起動前に dev server の起動確認を Orchestrator が行う |
| **subagent_type の制約** | Claude Code の subagent_type に `planner` / `generator` / `evaluator` が登録されるかは `.claude/agents/` の命名に依存 | 登録されない場合は `general-purpose` で代替し、prompt で役割を指定する fallback を用意 |

---

## 成功基準 (Phase 5 の DoD)

- [ ] `.claude/agents/` に `planner.md` / `generator.md` / `evaluator.md` の 3 定義ファイルが存在
- [ ] Orchestrator フローが AGENTS.md と core-beliefs に記述されている
- [ ] 小さな機能追加で Planner → Generator → Evaluator の 3 エージェントループが 1 周以上回った実績がある
- [ ] Evaluator が MCP でブラウザを操作して pass/fail を判定した実績がある
- [ ] Generator → Evaluator → Generator のリトライが少なくとも 1 回発生し、修正後に pass した実績がある
- [ ] ループ 1 周の所要時間とコストが記録されている
- [ ] 旧エージェント (code-reviewer) の扱いが決定されている

---

## 非スコープ（Phase 5 ではやらない）

- **Agent Teams（Claude Code の実験的機能）** — peer-to-peer のチーム構成は Phase 5 では使わない。subagent パターンで十分
- **CI/CD 連携** — ローカル開発プロジェクトなので不要
- **複数モデルの混在実験** — 全エージェントで同じモデルを使い、後で最適化
- **プロダクト機能の大規模追加** — Phase 5 はハーネスの再構築が主目的。機能追加は 5-C の実験用に最小限
- **自動デプロイ** — 対象外
