# core-beliefs / infra

> FE↔BE 通信、ポート、ビルド設定、依存方向に関わる作業のときに読むファイル。
> 「クロスカッティング」な制約を集約する。

## 確立された原則

- **FE → BE の通信は Vite の `server.proxy` 経由で `/api` に統一する。** CORS 設定を BE に書かない。FE に絶対 URL を書かない。
- **FE は BE の HTTP API のみを介して Markdown を取得する。** FE から直接ファイルシステム（Node API, fs 等）に触れる経路を作らない。
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

- `eslint-plugin-no-restricted-imports` で FE から `node:fs`, `node:path` の import を禁止する（FE が誤ってファイル直読みするのを防ぐ）。
