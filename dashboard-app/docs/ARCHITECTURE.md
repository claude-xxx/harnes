# ARCHITECTURE

> このファイルは、エージェントが本プロジェクトの全体像を最短で把握するためのトップレベルマップです。
> 各層の責務と依存方向を明示し、ドリフトを防ぐためのリファレンスとして使ってください。

## 現状

**Phase 3-C 完了 + Tailwind CSS 移行 + FE テスト基盤構築済み。** 複数の Markdown ファイルをサイドバーツリーで選択・表示・検索できるダッシュボードが動作しています。

## 依存方向

```
[Browser]
   ↓ HTTP (5173)
[frontend/  Vite + React 19 + TS + Tailwind CSS v4]
   ├─ App.tsx: sidebar (FileTree / SearchBar) + main (ReactMarkdown)
   ├─ src/api.ts: fetchFileTree / fetchContent / searchContent
   │   → /api/files, /api/content?path=..., /api/search?q=...
   └─ react-markdown + remark-gfm + @tailwindcss/typography (prose)
   ↓ Vite proxy (/api → http://localhost:3001)
[backend/   Node 24 + TS + Hono + @hono/zod-openapi]
   ├─ src/app.ts: OpenAPIHono + createRoute で全 API を定義
   ├─ src/schemas/api.ts: Zod スキーマ (API の source of truth)
   ├─ src/lib/safePath.ts: path traversal 防御 (resolveWithinContent)
   └─ GET /api/files, GET /api/content, GET /api/search, GET /api/health
   ↓ fs (resolveWithinContent 経由のみ)
[backend/content/]
   ├─ welcome.md
   ├─ commands/help.md
   └─ tips/keybindings.md
```

**ルール**:
- FE は BE の HTTP API のみを介して Markdown を取得する（直接ファイルシステムを触らない）
- BE は `backend/content/` 配下のファイルシステムから `resolveWithinContent` 経由でのみ Markdown を読む
- DB / 永続化レイヤは持たない

## 確定した技術選定

| レイヤ | 採用 | 備考 |
| --- | --- | --- |
| FE 言語/フレームワーク | TypeScript / React 19 | Vite scaffold |
| FE バンドラ | Vite 8 | dev server + proxy |
| FE スタイリング | Tailwind CSS v4 + @tailwindcss/vite | ユーティリティクラスのみ、手書き CSS 禁止 (FL-006) |
| FE Markdown 描画 | react-markdown 10 + remark-gfm 4 + @tailwindcss/typography | GFM 対応、prose クラスで描画 |
| FE テスト | Vitest + jsdom + @testing-library/react + jest-dom + user-event | pre-commit hook で強制 |
| BE 言語/ランタイム | TypeScript / Node 24 | ESM (`"type": "module"`) |
| BE フレームワーク | Hono 4 + @hono/node-server | TS-first / 軽量 |
| BE API 定義 | @hono/zod-openapi + Zod v4 | スキーマ駆動、OpenAPI 自動生成 |
| BE API ドキュメント | @hono/swagger-ui | `GET /api/doc` で Swagger UI |
| BE テスト | Vitest | API 契約テスト (Zod parse で検証)、pre-commit hook で強制 |
| BE TS 実行 | tsx (watch) | 開発時 |
| BE ビルド | tsc | dist/ に出力 |
| パッケージマネージャ | npm | |
| FE→BE 通信 | Vite の `server.proxy` | CORS 不要 |
| Pre-commit | husky (dashboard-app/ 配下) | scripts/check.sh + BE test:run + FE test:run |

## ポート

| ポート | 用途 |
| --- | --- |
| 5173 | FE dev server (Vite) |
| 3001 | BE dev server (Hono) |

## API

| メソッド | パス | 説明 | レスポンス |
| --- | --- | --- | --- |
| GET | `/api/health` | ヘルスチェック | `{"status":"ok"}` |
| GET | `/api/files` | content/ のファイルツリーを返す | `{"root": FileNode[]}` |
| GET | `/api/content?path=<rel>` | 指定パスの Markdown を返す | `text/markdown; charset=utf-8` |
| GET | `/api/search?q=<keyword>` | 全 .md を case-insensitive grep | `{"query": string, "hits": SearchHit[]}` |
| GET | `/api/openapi.json` | OpenAPI 3.1 spec (Zod から自動生成) | `application/json` |
| GET | `/api/doc` | Swagger UI (HTML) | `text/html` |

## テスト

| レイヤ | ファイル | テスト数 | 内容 |
| --- | --- | --- | --- |
| BE 契約テスト | `backend/tests/api.test.ts` | 16 | API レスポンスを Zod parse で検証 + path traversal + OpenAPI spec |
| FE コンポーネント | `frontend/tests/FileTree.test.tsx` | 4 | ツリー描画 / 選択 / クリック / a11y |
| FE コンポーネント | `frontend/tests/SearchBar.test.tsx` | 4 | 検索入力 / debounce / 結果表示 / 0 件 |
| FE API wrapper | `frontend/tests/api.test.ts` | 7 | fetchFileTree / fetchContent / searchContent + URL エンコード |

## 完了した Phase

| Phase | 主な成果 |
| --- | --- |
| 0 | dashboard-app の雛形 |
| 1 | 最初の縦串 (welcome.md の BE→FE 表示) |
| 2 | Lv2 ハーネス (lint/typecheck/format + pre-commit hook + Vitest 契約テスト + MCP UI ループ + code-reviewer subagent) |
| 3 | 複数ファイル対応 API + サイドバーツリー + 検索 + Tailwind CSS 移行 + FE テスト基盤 |

## 次フェーズで導入予定

- **Phase 4**: Lv3 観測 (docs-drift-detector subagent、ハーネス健全性チェック、core-beliefs 棚卸し)
