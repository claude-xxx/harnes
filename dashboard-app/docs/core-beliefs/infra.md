# core-beliefs / infra

> FE↔BE 通信、ポート、ビルド設定、依存方向に関わる作業のときに読むファイル。
> 「クロスカッティング」な制約を集約する。

## 確立された原則

- **FE → BE の通信は Vite の `server.proxy` 経由で `/api` に統一する。** CORS 設定を BE に書かない。FE に絶対 URL を書かない。
- **FE は BE の HTTP API のみを介して Markdown を取得する。** FE から直接ファイルシステム（Node API, fs 等）に触れる経路を作らない。
  - **機械化済み**（Phase 2-D）: `frontend/eslint.config.js` の `no-restricted-imports` が `frontend/src/**/*.{ts,tsx}` から `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:child_process`, `node:url`, および `node:` プレフィックスなしの同等パッケージの import を **error** で禁止する。違反時にはエージェントが次の手を読み取れる詳細メッセージが出る（pre-commit hook で git commit が阻止される）。
  - 適用範囲は **`frontend/src/**` のみ**。`vite.config.ts` 等の build-time 設定ファイルは Node API を正当に使うため対象外。
- **ポート割り当ては固定**:
  - FE dev server: `5173`
  - BE dev server: `3001`
  - 衝突したら、衝突回避ではなくプロセス整理（`taskkill`）で対処する。

## 依存方向（`docs/ARCHITECTURE.md` と同期）

```
Browser → frontend (5173) → /api proxy → backend (3001) → fs → backend/content/*.md
```

逆方向の依存は禁止。

## 検討中（昇格候補）

（Phase 2-D で `node:*` import 禁止が ESLint に昇格済み。現時点で残っている候補はなし。）
