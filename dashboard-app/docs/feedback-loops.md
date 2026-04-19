# ハーネスのフィードバックループ

このプロジェクトの「ハーネス」を構成する 5 本のフィードバックループを列挙する。AGENTS.md から切り出したもの（FL-004 由来、目次の肥大化防止）。

## 1. 敵対的 GAN ループ（開発の中核）

Planner → Generator → Evaluator → code-reviewer の 4 段構成。

1. **Planner** が仕様 + 受入基準（AC は Happy/Edge/A11y/Error の 4 カテゴリ必須）を生成
2. **Generator** が TDD で実装（AC 不変、ブラウザ操作しない）
3. **Evaluator** が Chrome DevTools MCP で AC を検証（コード非参照）→ fail なら批判を Generator へ返す（最大 5 回）
4. **code-reviewer** が Evaluator pass 後に品質軸で必須レビュー（blocking/major は Generator 差戻し、minor/nit は Orchestrator 判断）
5. **差し戻し時**: Orchestrator が [`review-log.jsonl`](review-log.jsonl) に finding を追記。同一パターンが 2 回以上蓄積されたら `code-reviewer.md` のチェック観点に昇格

Orchestrator（メインエージェント）は上記を順に呼び出し、各段の出力を次段に引き渡す。詳細なフロー定義は [`AGENTS.md`](../AGENTS.md) の §開発フローを参照。

## 2. 静的検証ループ

- エントリポイント: `bash scripts/check.sh`
- 内容: ESLint + TypeScript typecheck + Prettier format:check + AGENTS.md 行数ガード（120 行）
- 強制手段: pre-commit hook
- 詳細: [`dev-commands.md`](dev-commands.md)

## 3. テストループ

- BE: `cd backend && npm run test:run`（Vitest、API 契約テストは Zod スキーマを source of truth として `parse()` で検証）
- FE: `cd frontend && npm run test:run`（Vitest + jsdom + React Testing Library）
- 強制手段: pre-commit hook
- 詳細: [`dev-commands.md`](dev-commands.md)

## 4. UI 検証ループ

- Evaluator が Chrome DevTools MCP の `take_snapshot` / `take_screenshot` / `list_console_messages` / `list_network_requests` で受入基準を機械検証
- Generator はブラウザを操作しない（敵対性担保）
- 詳細: [`core-beliefs/frontend.md`](core-beliefs/frontend.md)

## 5. ドリフト検出ループ

- `docs-drift-detector` subagent が「コードベース全体 vs ドキュメント全体」の乖離を検出
- 実行タイミング: セッション開始時 / Phase 完了後（任意実行）
- code-reviewer が「今回の diff」を見るのに対し、こちらは「全体の整合性」を見る
- 詳細: [`code-review.md`](code-review.md)
