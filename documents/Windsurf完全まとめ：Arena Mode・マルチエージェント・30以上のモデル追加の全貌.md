---
title: "Windsurf完全まとめ：Arena Mode・マルチエージェント・30以上のモデル追加の全貌"
source: "https://qiita.com/picnic/items/287e1600a22a1a536b72"
author:
  - "[[picnic]]"
published: 2026-03-21
created: 2026-03-21
description: "はじめに AIコーディングエディタ Windsurf（旧Codeium）が、2025年2月〜2026年3月にかけて大規模なアップデートを連続リリースしました。GPT-5シリーズ、Claude 4.5/4.6、Gemini 3/3.1 Proなど30以上のモデル追加、並列エ..."
tags:
  - "clippings"
---
[@picnic](https://qiita.com/picnic)

0

投稿日

## はじめに

AIコーディングエディタ **Windsurf** （旧Codeium）が、2025年2月〜2026年3月にかけて大規模なアップデートを連続リリースしました。GPT-5シリーズ、Claude 4.5/4.6、Gemini 3/3.1 Proなど **30以上のモデル追加** 、並列エージェント実行の **Arena Mode** 、 **Git Worktreeによるマルチエージェント** 、そして **課金体系の根本的な変更** まで、AIコーディングツールの競争が一気に加速しています。

本記事では、これらの変更を重要度順に整理し、開発者が押さえるべきポイントと具体的な対応アクションをまとめます。

> **📌 影響を受ける人**
> 
> - Windsurfを日常的に使っている開発者
> - AIコーディングエディタの乗り換えを検討している方
> - チーム・Enterprise環境でAIツールを導入している技術リーダー

## 変更の全体像

約1年間のアップデートの関係性を時系列で整理します。

## 変更内容

### 1\. 課金体系の根本変更：プロンプトクレジット制への移行

> **⚠️ Breaking Change**  
> 2025年4月21日施行。Flow Action Creditsが廃止され、 **メッセージ送信ごとに消費されるプロンプトクレジット制** に移行しました。ツールコールではクレジットが消費されなくなります。

旧体系（Flow Action Credits）では、ツールコール単位で課金されていたため、エージェントが内部的に多数のツールを呼び出すと予期しないコスト増が発生していました。新体系では **ユーザーが送信したメッセージ数** ベースとなり、コスト予測が容易になります。

### 2\. Wave 14：Arena Mode と Plan Mode

2026年1月30日に発表された **最大級の機能アップデート** です。

**Arena Mode** は、2つのCascadeエージェントを **モデル名を伏せた状態で並列実行** し、どちらの出力が優れているかユーザーが投票する仕組みです。個人・グローバルリーダーボードで結果が集計され、モデル選定の判断材料になります。

**Plan Mode** は、Cascade の Code / Ask に並ぶ新モードで、実装前に計画を作成・レビューできます。 `megaplan` コマンドで明確化質問付きの高度な計画作成も可能です。

### 3\. Wave 13：マルチエージェント・Git Worktree

2025年12月24日リリース。 **同一リポジトリで複数のCascadeセッションをコンフリクトなく並列実行** できるようになりました。

| 機能 | 説明 |
| --- | --- |
| Git Worktree | 同一リポで複数Cascadeをコンフリクトなく実行 |
| マルチCascadeペイン | 複数セッションを並列表示 |
| 専用ターミナル（Beta） | Cascade用のzshシェルで信頼性向上 |
| コンテキストウィンドウインジケーター | 使用量の可視化 |
| Cascade Hooks | ワークフローの重要ポイントでカスタムコマンド実行 |
| SWE-1.5 Free | 全ユーザーに3ヶ月間無料提供 |

### 4\. Devin統合・UI刷新（v1.12.1）

2025年8月14日の大型リリースで、 **100以上のバグ修正** を含みます。

- **DeepWiki**: コードシンボルにホバーするとDeepWikiドキュメントが表示
- **Vibe and Replace**: AI搭載の検索置換
- **Tabオートコンプリート刷新**: より頻繁かつスマートな提案
- **UI全面リデザイン**: Chat/Cascade/ホーム画面パネルを刷新
- **Dev Containers**: リモートSSHアクセスによる開発コンテナ対応

### 5\. モデル対応の爆発的拡大

Windsurfに追加されたモデルを時系列・プロバイダ別に整理します。

#### OpenAI GPTシリーズ

| モデル | 追加日 | クレジット | 特徴 |
| --- | --- | --- | --- |
| GPT-4.1 | 2025/04 | 期間限定無料 | — |
| o4-mini | 2025/04 | 期間限定無料 | medium/high推論 |
| GPT-5 (low/med/high) | 2025/08 | 期間限定無料→ 0.5x/1x/2x | 可変推論レベル |
| GPT-5-Codex | 2025/09 | 有料0x / 無料0.5x | コーディング特化 |
| GPT-5.1 / 5.1-Codex | 2025/11 | 期間限定無料 | 可変思考（Variable Thinking） |
| GPT-5.1-Codex Max | 2025/12 | Low無料 / Med・High有料 | 3段階推論 |
| GPT-5.2 | 2025/12 | 期間限定0x | GPT-5以来最大の飛躍 |
| GPT-5.2-Codex | 2026/01 | 有料 | エージェント型コーディング特化 |
| GPT-5.4 | 2026/03 | 1x〜8x（推論レベル別） | 5段階推論レベル |
| GPT-5.4 Mini | 2026/03 | プロモーション1x | 軽量版 |

#### Anthropic Claudeシリーズ

| モデル | 追加日 | クレジット | 特徴 |
| --- | --- | --- | --- |
| Claude 3.7 Sonnet | 2025/02 | 1.0x（Thinking時1.5x） | Thinking対応 |
| Claude Sonnet 4.5 | 2025/09 | — | — |
| Claude Opus 4.5 | 2025/11 | 期間限定2x（通常20x） | Windsurf史上最高性能 |
| Claude Sonnet 4.6 | 2026/02 | 思考なし2x / 思考あり3x | — |
| Claude Opus 4.6 | 2026/02 | 思考なし2x / 思考あり3x | fast mode（最大2.5倍高速）あり |

#### Google Geminiシリーズ

| モデル | 追加日 | クレジット | 特徴 |
| --- | --- | --- | --- |
| Gemini 2.5 Pro | 2025/03 | 1x | Beta版 |
| Gemini 3 Pro | 2025/11 | — | Low/Highプレビュー |
| Gemini 3 Flash | 2025/12 | — | 前世代比3倍高速、SWE-bench 78% |
| Gemini 3.1 Pro | 2026/02 | 低思考0.5x / 高思考1x | — |

#### Windsurf独自・その他

| モデル | 追加日 | 特徴 |
| --- | --- | --- |
| SWE-1 / SWE-1-lite / SWE-1-mini | 2025/05 | Windsurf独自モデルファミリー |
| SWE-1.5 / SWE-1.5 Free | 2025/12 | 全ユーザー3ヶ月無料 |
| Falcon Alpha | 2025/10 | 高速エージェント型ステルスモデル |
| Kimi K2 | 2025/07 | 0.5x クレジット |
| GLM-5 / Minimax M2.5 | 2026/02 | 中国系モデル、Arena Mode対応 |
| Grok Code Fast 1 | 2025/08 | xAI製、Pro/Teams無料 |

### 6\. MCP（Model Context Protocol）の段階的拡充

MCPサポートは2025年2月の初回導入から段階的に強化されています。

### 7\. エージェントワークフロー機能の進化

| 機能 | リリース日 | 概要 |
| --- | --- | --- |
| Planning Mode | 2025/06 | 実装前に plan.md で計画作成 |
| カスタムワークフロー | 2025/05 | スラッシュコマンドで保存プロンプト呼び出し |
| ファイルベースルール | 2025/05 | .windsurf/rules で粒度の細かい制御 |
| Cascade Hooks | 2025/12 | ワークフローの重要ポイントでカスタムコマンド |
| Agent Skills | 2026/01 | Cascadeのカスタムスキル定義 |
| Arena Mode | 2026/01 | 2エージェント並列実行・比較投票 |
| Plan Mode（Wave 14） | 2026/01 | megaplanコマンドで高度計画 |
| SKILL.md / AGENTS.md | 2026/03 | ファイルベースのスキル・エージェント定義 |

## 影響と対応

### 全ユーザー共通

| 対応事項 | 優先度 | 詳細 |
| --- | --- | --- |
| 課金体系の確認 | 🔴 高 | プロンプトクレジット制への移行済み。アドオン購入・オートトップオフ設定を確認 |
| Knowledge Base機能の代替検討 | 🟡 中 | 2025年11月に削除済み。代替として@メンション・ルールファイル等を活用 |
| Windsurf Browser非推奨 | 🟡 中 | Previewsの使用を推奨 |

### モデル選定の指針

> **💡 Tips**
> 
> - 多くのコーディングタスクでは GPT-5.2-Codex の **medium推論レベル** が推奨されています
> - Claude Opus 4.6 の fast mode は同じ知能レベルで **最大2.5倍高速** 。コスト（10x/12x）に見合うかはタスク次第
> - Arena Modeでモデルを比較し、自分のワークロードに最適なモデルを見つけるのが効率的です

### Enterprise管理者向け

- **コマンド自動実行の許可・拒否リスト** を組織全体で設定可能（2026年1月〜）
- **MDM経由のシステムレベルルール・スキル定義** でポリシー統制が可能
- **Cascade Hooksのクラウド設定** でチーム全体のワークフロー標準化
- **Devinサービスキー認証** に対応

## コード例

### Cascade Hooksの設定例

Cascade Hooksを使うと、AIの動作をカスタマイズできます。

**Before（Hooks導入前）：** ポリシー違反プロンプトの検出手段がない

**After（Hooks導入後）：** ユーザープロンプト送信時にカスタムスクリプトを実行

```json
// .windsurf/cascade_hooks.json
{
  "post_cascade_response": {
    "command": "node scripts/log-cascade-response.js",
    "enabled": true
  },
  "on_user_prompt": {
    "command": "node scripts/validate-prompt.js",
    "enabled": true,
    "block_on_failure": true
  }
}
```

### ファイルベースルールの設定例

**Before（グローバル設定のみ）：**

すべてのファイルに同じルールが適用され、粒度の調整ができない。

**After（.windsurf/rules で細かく制御）：**

```markdown
<!-- .windsurf/rules/frontend.md -->
---
trigger: glob
glob: "src/components/**/*.tsx"
---

- React コンポーネントは関数コンポーネントで書くこと
- Tailwind CSS のユーティリティクラスを使用すること
- コンポーネントのpropsにはインターフェースを定義すること
```

```markdown
<!-- .windsurf/rules/api.md -->
---
trigger: glob
glob: "src/api/**/*.ts"
---

- エラーハンドリングは必ず実装すること
- レスポンス型を明示的に定義すること
```

### カスタムワークフローの例

```markdown
<!-- .windsurf/workflows/review.md -->
---
name: code-review
description: 変更されたファイルのコードレビューを実行
---

以下のステップでコードレビューを行ってください:
1. git diff で変更を確認
2. セキュリティ上の問題がないか確認
3. パフォーマンスへの影響を評価
4. 改善提案をまとめる
```

Cascade内で `/code-review` と入力するだけで実行できます。

## まとめ

Windsurfはこの約1年で、 **単なるAIコード補完ツールからエージェント型コーディングプラットフォーム** へと大きく進化しました。

1. **課金体系の変更** ：Flow Action Creditsからプロンプトクレジット制へ移行。コスト管理が容易に
2. **30以上のモデル追加** ：GPT-5系列、Claude 4.5/4.6、Gemini 3系列など主要モデルを網羅。推論レベル別の細かいコスト制御が可能
3. **エージェント機能の進化** ：Arena Mode（モデル比較）、マルチエージェント（Git Worktree）、Plan Mode（事前計画）で開発ワークフローが高度化
4. **MCP統合の成熟** ：初回サポートからOAuth、Enterprise対応、プラグインパネルまで段階的に拡充
5. **Enterprise機能の強化** ：コマンド制御、MDMポリシー、Cascade Hooks設定で組織統制が可能に

モデルの選択肢が急増する中、 **Arena Modeで自分のワークロードに最適なモデルを見つける** のが最も実践的なアプローチです。課金体系の変更に対応しつつ、ワークフロー・ルール・Hooksを活用して、チームに合ったAIコーディング環境を構築していきましょう。

[0](https://qiita.com/picnic/items/287e1600a22a1a536b72#comments)

コメント一覧へ移動

新規登録して、もっと便利にQiitaを使ってみよう

1. あなたにマッチした記事をお届けします
2. 便利な情報をあとで効率的に読み返せます
3. ダークテーマを利用できます
[ログインすると使える機能について](https://help.qiita.com/ja/articles/qiita-login-user)