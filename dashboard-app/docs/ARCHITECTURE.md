# ARCHITECTURE

> このファイルは、エージェントが本プロジェクトの全体像を最短で把握するためのトップレベルマップです。
> 各層の責務と依存方向を明示し、ドリフトを防ぐためのリファレンスとして使ってください。

## 現状

**Phase 1 完了。** 1 つの Markdown ファイル（`backend/content/welcome.md`）を BE 経由で取得し、FE で表示する縦串が通っています。

## 依存方向

```
[Browser]
   ↓ HTTP (5173)
[frontend/  Vite + React 19 + TS]
   ├─ App.tsx: useEffect で /api/content を fetch
   └─ react-markdown + remark-gfm でレンダリング
   ↓ Vite proxy (/api → http://localhost:3001)
[backend/   Node 24 + TS + Hono]
   └─ src/index.ts: GET /api/content → fs.readFile
   ↓ fs
[backend/content/welcome.md]
```

**ルール**:
- FE は BE の HTTP API のみを介して Markdown を取得する（直接ファイルシステムを触らない）
- BE は `backend/content/` 配下のファイルシステムから直接 Markdown を読む
- DB / 永続化レイヤは持たない

## 確定した技術選定

| レイヤ | 採用 | 備考 |
| --- | --- | --- |
| FE 言語/フレームワーク | TypeScript / React 19 | Vite scaffold |
| FE バンドラ | Vite 8 | dev server + proxy |
| FE Markdown 描画 | react-markdown 10 + remark-gfm 4 | GFM（テーブル/チェックボックス）対応 |
| BE 言語/ランタイム | TypeScript / Node 24 | ESM (`"type": "module"`) |
| BE フレームワーク | Hono 4 + @hono/node-server | TS-first / 軽量 |
| BE TS 実行 | tsx (watch) | 開発時 |
| BE ビルド | tsc | dist/ に出力 |
| パッケージマネージャ | npm | |
| FE→BE 通信 | Vite の `server.proxy` | CORS 不要 |

## ポート

| ポート | 用途 |
| --- | --- |
| 5173 | FE dev server (Vite) |
| 3001 | BE dev server (Hono) |

## API（現状）

| メソッド | パス | 説明 | レスポンス |
| --- | --- | --- | --- |
| GET | `/api/health` | ヘルスチェック | `{"status":"ok"}` |
| GET | `/api/content` | `welcome.md` の内容を返す | `text/markdown; charset=utf-8` |

> **注**: 現在 `/api/content` はパラメータなしで `welcome.md` を固定で返します。複数ファイル対応・ファイルツリー API は Phase 3 で導入予定。

## 次フェーズで導入予定

- **Phase 2**:
  - Linter / Formatter / 型チェック（FE/BE 共通の取り回しを決める）
  - Vitest による単体テスト
  - Pre-commit hook（lefthook or husky）
  - カスタム Lint（プロジェクト固有の不変条件）
  - Chrome DevTools MCP による UI 検証ループ
  - `.claude/agents/code-reviewer.md` — 最初のカスタムサブエージェント
- **Phase 3**:
  - サイドバーのファイルツリー
  - 検索機能
  - 複数 MD 対応の API（一覧 / 個別取得）
