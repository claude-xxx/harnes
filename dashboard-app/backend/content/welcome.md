# Welcome to Claude Code Dashboard

このダッシュボードは **Claude Code の使い方** をまとめた個人用ノートです。

## このページについて

これは Phase 1 の最初の縦串（vertical slice）として表示されているサンプルです。
ハーネスエンジニアリングの実践プロジェクトの一部として、`backend/content/` 配下の Markdown を `frontend` で表示しています。

## Claude Code の基本

- **`/help`** — ヘルプを表示
- **`/clear`** — 会話履歴をクリア
- **`/fast`** — Fast モードの切り替え
- **`!<command>`** — シェルコマンドを実行

## チェックリスト（GFM の動作確認）

- [x] BE が Markdown を返す
- [x] FE が Markdown をレンダリングする
- [ ] Phase 2 でフィードバックループを構築する

## サンプルテーブル

| Phase | 目的 | 状態 |
| --- | --- | --- |
| 0 | 雛形 | 完了 |
| 1 | 縦串 | **進行中** |
| 2 | Lv2 ループ | 未着手 |

```ts
// シンタックスハイライトはまだ未対応（後フェーズで検討）
const greet = (name: string) => `Hello, ${name}`;
```
