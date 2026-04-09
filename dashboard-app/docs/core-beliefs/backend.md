# core-beliefs / backend

> `backend/` 配下を編集するときに読むファイル。

## 確立された原則

- **ESM (`"type": "module"`) を必須とする。** `npm init -y` が生成する commonjs は採用しない。新規パッケージを切る場合も同様。
- **API レスポンスの Content-Type は明示する。** Markdown を返すなら `text/markdown; charset=utf-8`。`c.body()` のオプションで指定する。
- **ファイルシステムアクセスは `backend/content/` 以下に限定する。** content 以外のディレクトリを fs で読まない（path traversal の温床）。

## 検討中（昇格候補）

（まだなし）

## 関連 failure-log エントリ

- `FL-002`（path traversal の予防）はまだ存在しないが、複数ファイル対応 API を作る Phase 3 で必須になる予定。
