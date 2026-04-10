# ハーネス健全性チェック

> Phase 完了時やセッション開始時に手動で実行する。自動化はしない（ローカル開発プロジェクトなので手動で十分）。

## チェック手順

### 1. 静的検証 + テスト

```bash
cd dashboard-app
bash scripts/check.sh
cd backend && npm run test:run
cd ../frontend && npm run test:run
```

すべて green であることを確認。

### 2. failure-log.jsonl のヘルス

```bash
# open エントリの一覧
node -e "const fs=require('fs'); fs.readFileSync('docs/failure-log.jsonl','utf-8').trim().split('\n').map(l=>JSON.parse(l)).filter(e=>e.status==='open').forEach(e=>console.log(e.id, '-', e.title));"

# 再発が多い（昇格候補）
node -e "const fs=require('fs'); fs.readFileSync('docs/failure-log.jsonl','utf-8').trim().split('\n').map(l=>JSON.parse(l)).filter(e=>e.recurrence&&e.recurrence.length>=1).forEach(e=>console.log(e.id, 'recurrence:', e.recurrence.length, '-', e.title));"
```

- open が 3 件以上 → 棚卸しを検討
- recurrence >= 2 → 即座に昇格を検討

### 3. exec-plans/active/ の残存

```bash
ls docs/exec-plans/active/
```

完了済みのファイルが残っていないか。理想は進行中のもののみ。

### 4. core-beliefs の「検討中」棚卸し

各 core-beliefs ファイルの「検討中（昇格候補）」セクションを目視:
- `docs/core-beliefs/backend.md`
- `docs/core-beliefs/frontend.md`
- `docs/core-beliefs/tooling.md`

1 Phase 以上放置されている候補があれば、昇格 or 却下を判断。

### 5. AGENTS.md 行数

```bash
wc -l AGENTS.md
```

100 行目標、120 行 hard cap。80 行を超えてきたら節の切り出しを検討。

### 6. テスト本数の確認

```bash
cd backend && npx vitest run --reporter=verbose 2>&1 | grep -c "✓"
cd ../frontend && npx vitest run --reporter=verbose 2>&1 | grep -c "✓"
```

新しいエンドポイントやコンポーネントが追加されたのにテスト数が増えていなければ TDD 違反。

### 7. docs-drift-detector を実行

```
Agent(subagent_type: "docs-drift-detector" 相当) でドリフト検出を 1 回走らせる。
findings が 0 件なら OK。drift-found なら findings に従って修正。
```

## いつ実行するか

- **Phase 完了時**: Phase N の最後の commit 後、Phase N+1 に進む前に
- **セッション開始時（任意）**: 前セッションからの作業が断絶している場合
- **大きなリファクタの前後**: 影響範囲が広いとき
