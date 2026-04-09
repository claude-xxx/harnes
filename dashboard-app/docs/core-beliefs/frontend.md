# core-beliefs / frontend

> `frontend/` 配下を編集するときに読むファイル。

## 確立された原則

（Phase 1 時点ではまだなし。Phase 2 以降に追記される想定）

候補（昇格前のたたき台）:
- Markdown レンダリングは `react-markdown + remark-gfm` を経由する。直接 DOM に Markdown 文字列を埋め込まない。
- API 通信は `/api` 相対パスのみ使う。絶対 URL（`http://localhost:3001/...`）を書かない。

## 検討中（昇格候補）

（まだなし）
