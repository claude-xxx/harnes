# ARCHITECTURE

> このファイルは、エージェントが本プロジェクトの全体像を最短で把握するためのトップレベルマップです。
> 各層の責務と依存方向を明示し、ドリフトを防ぐためのリファレンスとして使ってください。

## 現状

**Phase 0（雛形のみ）。実装はまだ存在しません。**
最初の縦串（Phase 1）が通った時点でこのファイルを更新してください。

## 想定する依存方向

```
[Browser]
   ↓ HTTP
[frontend/  Vite + React + TS]
   ↓ fetch
[backend/   Node + TS]
   ↓ fs
[backend/content/*.md]
```

- FE は BE の HTTP API のみを介して Markdown を取得する
- BE は `backend/content/` 配下のファイルシステムから直接 Markdown を読む
- DB / 永続化レイヤは持たない

## 決まっていないこと（Phase 1 で確定）

- BE のフレームワーク（素の http? Hono? Fastify? Express?）
- FE のルーティング（react-router? TanStack Router?）
- Markdown レンダリングの実装（react-markdown? その他?）
- API 設計（一覧取得 / 個別取得のパス、レスポンス形）
- 開発時の同時起動方法（concurrently? turbo? シェル並列?）

これらは Phase 1 の exec-plan の中で決め、決まり次第ここに反映する。
