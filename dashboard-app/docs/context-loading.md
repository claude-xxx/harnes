# context-loading.md — 段階的開示と「いつ何を読むか」

> AGENTS.md は目次なので、コンテキスト読み込みのルールはこのファイルに集約しています。
> プロジェクトが拡大しても 1 セッションあたりのコンテキスト消費が線形に膨らまないようにするための **設計** です。

---

## 大原則: 段階的開示（progressive disclosure）

このプロジェクトは **すべてを毎回読み込みません**。
1 日 100 件規模の作業セッションで破綻しないために、ファイルは「いつ読まれるか」で 3 階層に分けています:

| 階層 | 何が入るか |
| --- | --- |
| (A) **起動時自動ロード** | Claude Code がセッション開始時に必ず読むもの |
| (B) **タスク開始時に選択的に読む** | タスクの種類によって読むファイルが分岐するもの |
| (C) **必要なときだけ検索する** | 自動ロードしてはいけないアーカイブ系 |

---

## (A) 起動時自動ロード

- **このプロジェクトでは AGENTS.md のみ**
- 100 行制限はこの自動ロードが理由です。大きすぎるとあらゆるセッションのコスト・遅延・LLM の集中力に効きます（FL-004 由来）。

---

## (B) タスク開始時に **選択的に** 読むべきもの

| いつ | 読むファイル |
| --- | --- |
| まずは（必ず）  | [`core-beliefs/index.md`](core-beliefs/index.md) — マップ + process 系ルール |
| FE を編集 | [`core-beliefs/frontend.md`](core-beliefs/frontend.md) |
| BE を編集 | [`core-beliefs/backend.md`](core-beliefs/backend.md) |
| 通信・ポート・依存方向に触る | [`core-beliefs/infra.md`](core-beliefs/infra.md) |
| 開発環境・起動・停止・CI・hook に触る | [`core-beliefs/tooling.md`](core-beliefs/tooling.md) |
| 開発コマンドが分からない | [`dev-commands.md`](dev-commands.md) |
| code-reviewer subagent を呼びたい | [`code-review.md`](code-review.md) |
| 該当する作業計画があるなら | [`exec-plans/active/<task>.md`](exec-plans/active/) |
| アーキ全体像が必要なら | [`ARCHITECTURE.md`](ARCHITECTURE.md) |

---

## (C) 自動ロード対象外（必要なときだけ検索する）

- [`failure-log.jsonl`](failure-log.jsonl) — 過去の失敗の構造化アーカイブ
  - 似た問題に当たったときに `jq` などで検索する用途
  - **全件読み込んではいけない**
  - クエリ例:
    ```bash
    # 未昇格の項目
    jq -c 'select(.status=="open")' docs/failure-log.jsonl
    # カテゴリ別件数
    jq -r '.category' docs/failure-log.jsonl | sort | uniq -c
    # 再発回数が多い順（昇格の最有力候補）
    jq -c 'select(.recurrence | length >= 2)' docs/failure-log.jsonl
    ```
- [`exec-plans/completed/`](exec-plans/completed/) — 完了済みの作業履歴
  - 「あの判断をなぜしたか」を振り返るときだけ開く
  - 全件 ls で並べるのは可、全件 cat は禁止

---

## 失敗を記録・昇格させる手順

1. 同種の失敗を 2 回踏んだら、まず `failure-log.jsonl` の対象レコードの `recurrence` に日付を追加する（ない場合は新規 ID で append）。
2. それを受けて、該当カテゴリの `core-beliefs/<category>.md` に 1 行追記する。
3. そのルールが安定したら、**リンタ・テスト・hook・スクリプトのいずれかに昇格させ**、`failure-log.jsonl` の `status` を `promoted`、`promoted_to` に昇格先を記録する。
4. 昇格時に `promoted_at` / `promoted_in` / `promoted_note` を追加するのを忘れない（FL-002, FL-004 を参考に）。

詳細仕様と JSON スキーマは [`core-beliefs/index.md`](core-beliefs/index.md)。

---

## このルール自体の出自

- 元々 AGENTS.md 内の「コンテキスト読み込みのルール」節に書かれていた
- Phase 2 を通じて AGENTS.md が 199 行に膨張したため、FL-004 を起こしてこのファイルに切り出した
- 切り出した結果 AGENTS.md は 100 行以内に戻り、`scripts/check.sh` で機械的に維持されるようになった
