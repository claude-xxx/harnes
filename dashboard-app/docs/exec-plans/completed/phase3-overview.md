# Phase 3 オーバービュー + 次セッションの開始地点

- **状態**: completed（Phase 3 全サブフェーズ完了、3-D は実害なしにつき見送り）
- **作成**: 2026-04-10（Phase 2 完了直後、就寝前に作成）
- **次に開く人へ**: このファイルが `docs/exec-plans/active/` にある間は **Phase 3 が未着手 or 進行中** です。最初にこのファイルを読んでください。

---

## TL;DR — 次セッションで最初にやること

1. **このファイルを最後まで読む**
2. 必要なら `git log --oneline -5` で前回 commit (`7a5a29d Phase 2: Lv2 ハーネスの構築 …`) を確認
3. **Phase 3-A（BE 複数ファイル対応）の exec-plan を `docs/exec-plans/active/phase3a-be-multifile.md` として書く**（このファイル末尾の DoD を下敷きに）
4. その後 1 セッション 1 機能で 3-A → 3-B → 3-C と順に進める

---

## ここまでの進捗（Phase 0〜2 すべて完了済み）

| Phase | 内容 | commit |
| --- | --- | --- |
| 0 | dashboard-app の雛形作成 | `25a9799` |
| 1 | 最初の縦串（welcome.md を BE→FE で表示） | `6550b24` |
| 1.5 | core-beliefs を段階的開示構造に再編 + failure-log を JSONL 化 | `bea87cf` |
| **2** | **Lv2 ハーネスの構築（5 つのループ + code-reviewer + AGENTS.md 切り出し）** | **`7a5a29d`** |

**Phase 2 で何ができるようになったか**:
- `bash dashboard-app/scripts/check.sh` で lint+typecheck+format+AGENTS.md 行数ガード
- `cd dashboard-app/backend && npm run test:run` で Vitest 契約テスト（Zod スキーマ駆動）
- `git commit` で pre-commit hook（上記 2 つを強制、husky）
- Chrome DevTools MCP で UI 検証ループ（`take_snapshot` を一次手段に）
- `code-reviewer` subagent（読み取り専用、別コンテキストで core-beliefs 違反検出）

詳細は各 `docs/exec-plans/completed/phase2*.md` を参照。

---

## Phase 3 の分割案（plan.md より、4 サブフェーズ）

| 番号 | 内容 | 依存 | 状態 |
| --- | --- | --- | --- |
| **3-A** | **BE 複数ファイル対応**: `/api/files`（ツリー一覧）と `/api/content?path=...`（個別取得）。path traversal 防御。Zod スキーマ + 契約テスト | なし（**ゲート**） | **次にやる** |
| 3-B | サイドバーツリー UI: FE で `/api/files` を取得→Notion 風ツリー描画→クリックで切り替え。MCP `take_snapshot` で検証 | 3-A | 待機 |
| 3-C | 検索機能: タイトル/本文 grep（最初は BE 側で全件 grep）+ FE 検索 UI | 3-A | 待機 |
| 3-D | 2 つ目の subagent（例 `spec-checker`）: **必要なら**追加。3-A〜C を回した結果「人間がレビューで指摘していたこと」が 2 回出たらルール化 → エージェント化 | 3-C 完了後の判断材料 | **条件付き** |

3-D は実害が出てから着手するのがハーネス流。3-A → 3-B → 3-C を順に。

---

## Phase 3-A の DoD（次セッションで exec-plan に展開する下敷き）

- **新エンドポイント**:
  - `GET /api/files` → ファイルツリー（再帰的なノード構造、Zod スキーマ）
  - `GET /api/content?path=foo/bar.md` → 指定された Markdown ファイルを返す
- **既存 `GET /api/content`** の扱いを exec-plan で判断:
  - (a) 互換維持のため一旦残す（次 session で削除可）
  - (b) `?path=welcome.md` 必須にして即削除
  - 推奨: **(b)** — 後方互換シムを残さない（core-beliefs/index.md に「前方互換 hack を入れない」流儀あり）
- **path traversal 防御**: `backend/content/` 配下を一歩も外に出ない。`..` / 絶対パス / シンボリックリンクすべて拒否。`backend.md` の確立済み原則「fs アクセスは `backend/content/` 以下に限定」を守る
- **Zod スキーマ拡張**: `src/schemas/api.ts` に `FileNode` / `FileTree` / `ContentQuery` を追加
- **契約テスト 4-5 本**: 一覧取得・個別取得・path traversal 拒否（`../../../etc/passwd` 系）・存在しないファイルの 404・空ディレクトリ
- **サンプルファイル追加**: `backend/content/` に階層構造のサンプル（例: `commands/help.md`, `tips/keybindings.md`）
- **OpenAPI spec が新エンドポイントを反映**していることを契約テストで確認（`paths['/api/files']` 等）
- `bash scripts/check.sh` + `npm run test:run` が両方 green
- **既存の `welcome.md` レンダリング経路は壊さない**（FE は次の 3-B で更新するため、3-A 単体では FE は触らない）

---

## 次セッションで気をつけること

### `code-reviewer` subagent の利用
- Phase 2-F で作成済み (`harnes/.claude/agents/code-reviewer.md`)
- **session 起動時にロードされる仕様**なので、commit `7a5a29d` 以後に起動する次セッションでは **正式に `subagent_type: code-reviewer` で呼べる** はず
- 初回起動時に `Agent` ツールの subagent_type 一覧に `code-reviewer` が出ているか確認すること
- 出ていなければ、Phase 2-F で使った代理プロンプト方式（`general-purpose` に「あなたの行動原理は `.claude/agents/code-reviewer.md` にある」と渡す）に fallback

### dev server の状態
- Phase 2-E 時点では BE PID 20780 / FE PID 13576 が listening していた（ユーザー側起動）
- 次セッション開始時に `netstat -ano | grep -E ':3001|:5173' | grep LISTEN` で再確認
- 3-A は BE のみの作業なので **dev server は不要**（Vitest が `app.fetch` を直接叩くため）。3-B から FE/MCP を使う

### Phase 3-A の最初の 1 歩
1. このファイル（`phase3-overview.md`）と `core-beliefs/index.md` / `backend.md` / `dev-commands.md` を読む
2. `docs/exec-plans/active/phase3a-be-multifile.md` を新規作成（このファイルの DoD を下敷きに）
3. ユーザーに plan を見せて承認を取る
4. 実装に入る

### バックログの再確認
- **Phase 2-G (Playwright)**: AGENTS.md と `core-beliefs/frontend.md` に登録済み。UI 系の不具合が 2 回出たら最優先
- **`failure-log.jsonl`** の `open` 状態のエントリ: FL-001 (Windows taskkill), FL-003 (husky 配置)。両方ともプロセス系で、当面は静観

---

## このファイル自身のライフサイクル

- **Phase 3-A 着手時**: このファイルは `active/` に残したまま。`phase3a-be-multifile.md` を別ファイルとして並べる
- **Phase 3 全体完了時**: `phase3-overview.md` を `completed/` に移動。サマリと学びを末尾に追記
- **`active/` を空にする運用**は当面しない。Phase 3 全体のオーバービューはここに残し続ける
