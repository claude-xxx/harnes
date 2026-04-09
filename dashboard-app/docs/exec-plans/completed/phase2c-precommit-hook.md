# Phase 2-C: Pre-commit hook で静的検証 + テストを強制する

- **状態**: completed
- **開始**: 2026-04-10
- **完了**: 2026-04-10
- **目的**: Phase 2-A で作った `scripts/check.sh` と Phase 2-B で作った BE 契約テストを **`git commit` にぶら下げて自動実行** し、「実行を忘れた」という人為ミスを物理的に潰す。プロンプトより仕組みが強い、を実体験する。

> **1セッション1機能、1PR1目的を死守する。**
> ハーネスの追加であって、コードロジックには触らない。

---

## 背景（このフェーズの存在意義）

現状 `scripts/check.sh` を呼び出す「トリガー」は **AGENTS.md と tooling.md に書かれた約束事だけ**。誰も自動で走らせていない（人間/エージェントが読んで自分で叩く前提）。これは弱い。`tooling.md` 自身もこう言っている:

> ルールが安定したら、**カスタムリンタ・テスト・型** に昇格させる（プロンプトより仕組みが強い）。

Phase 2-C は「仕組み化への昇格」の **最初の実例**。

---

## スコープ

### やる
- `harnes/` リポジトリ直下に **最小の `package.json`** を作る（**workspaces 化はしない**。あくまでリポジトリ全体で共有する dev tooling 用）
- `husky` v9 系を導入し、`prepare` script で hooks を有効化
- `.husky/pre-commit` を作り、内容を以下にする:
  1. `bash dashboard-app/scripts/check.sh`
  2. `( cd dashboard-app/backend && npm run test:run )`
  3. どちらかが失敗したら commit を中断
- 動作確認: 正常パスで commit が通り、わざと壊したパスで commit が **止まる** ことを両方確認する
- ドキュメントを更新し、新規 clone した人/エージェントが `npm install` をリポジトリ直下で1回叩けば hook が有効になることを明示
- `failure-log.jsonl` の `FL-002`（"Phase 1 では UI レンダリングを自動検証する手段がない"）の `recurrence` には影響しないが、関連で「`check.sh` を忘れた」という新規エントリを起こすかは検討（実害が出ていなければ起こさない）

### やらない（次フェーズ以降）
- `lint-staged` の導入（変更ファイル限定での高速化）。**まだ必要ない**。プロジェクトが小さく、check.sh + test:run の合計が数秒で終わる。Phase 2-D 以降で「遅さ」が痛んだら導入する。
- FE 側のテストの追加。
- CI（GitHub Actions 等）での同等の検査。pre-commit と CI は別レイヤー。CI は Phase 2 後半 or 別フェーズ。
- カスタム lint ルール（Phase 2-D）。
- Chrome DevTools MCP（Phase 2-E）。

---

## 設計判断

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| Hook ランナー | **husky v9** | デファクト。v9 はインストールが軽量で、`.husky/` が単なる shell スクリプトの集まり。Windows + Git Bash でも安定動作実績あり。 |
| 配置場所 | **リポジトリ直下 (`harnes/`)** | `.git` がここにあり、husky は `core.hooksPath` を `.husky/` に向ける必要があるため。`dashboard-app/` に置くと git root から外れる。 |
| ルート package.json の正体 | **「リポジトリ全体の dev tooling 用」のメタパッケージ** | `dashboard-app/{frontend,backend}` の package.json とは **役割が違う**。アプリコードを持たない。`private: true` で意図を明示。**workspaces には絶対しない**（意図のドリフトを防ぐため、`workspaces` フィールドは付けない）。 |
| Hook 内容 | `check.sh` と `test:run` を **直列実行** | 並列化は時期尚早。失敗したときのログが追いやすい方を優先。 |
| 失敗時の挙動 | hook が non-zero で exit → commit は git によって自動中断 | husky v9 の標準挙動。bash の `set -e` を hook 内で使う。 |
| `--no-verify` の方針 | **`AGENTS.md` で明示禁止済み**。今フェーズでは追加の機械化はしない | 既に約束として書かれている。これ以上の仕組み化は別フェーズ（例: server-side hook、CI）。 |
| Hook 実行時の CWD | **git root（`harnes/`）** | git の標準挙動。hook 内のパスはこれを前提に書く。 |
| `npm install` の必要性 | 新規 clone 後に `harnes/` 直下で1回 `npm install` が必要 | husky の `prepare` スクリプトが hooks を有効化するため。これは README/AGENTS.md に書く。 |

---

## ディレクトリ構成（このフェーズで触るもの）

```
harnes/
├── .git/
├── .gitignore
├── .husky/                 ← 新規（husky init で作られる）
│   └── pre-commit          ← 新規。check.sh + test:run を呼ぶ
├── package.json            ← 新規。husky devDep + prepare script のみ
├── package-lock.json       ← 新規（自動生成）
├── node_modules/           ← 新規（gitignore 済み）
├── documents/              ← 触らない
└── dashboard-app/          ← 触らない（既存 scripts/check.sh を呼ぶだけ）
```

---

## やること（順番）

1. **ルート `package.json` を作る**
   - `name: "harnes-tooling"`、`private: true`、`type: "module"`、`scripts.prepare: "husky"`、`devDependencies: { husky: "^9.x" }` のみ
2. **husky をインストール**
   - `npm install`（prepare script が走り `.husky/_/` が初期化される）
3. **`.husky/pre-commit` を作成**
   - 内容: `bash` 1行ヘッダ不要（v9）。`set -e` で failfast。`check.sh` → `test:run` の順に実行。
4. **動作確認 (1) green path**
   - 既存ドキュメントをトリビアルに編集（例: `tooling.md` に空行追加）→ stage → `git commit -m "..."` → hook が通って commit 成立することを確認
5. **動作確認 (2) red path**
   - 既存 BE TS ファイルに **わざと Prettier 違反** を入れる（例: 行末セミコロン削除 or インデントの 1 マス追加）→ stage → `git commit` → hook が **format:check で止まる** ことを確認 → 編集を巻き戻す
6. **ドキュメント更新**
   - `AGENTS.md` の「まだ存在しないもの」から Pre-commit hook を削除し、「コミット前に通ること」の節を「**git commit が hook で自動的に走らせる**」に書き換え
   - `docs/core-beliefs/tooling.md` に「pre-commit hook を有効化するには `harnes/` 直下で `npm install` が1回必要」を追記
   - `tooling.md` の昇格候補一覧から該当があれば取り除く
7. **アーカイブ**
   - 学びを本ファイル末尾に追記し、`completed/` へ移動
   - 必要なら `failure-log.jsonl` に新規エントリ append

---

## ハーネス的観点での自戒

- **lint-staged を入れない**。今は `check.sh` + `test:run` 全部回しても数秒。先に複雑度を上げる動機がない。痛みが出てから入れる。
- **CI を入れない**。pre-commit と CI は別の問題（pre-commit は「ローカルでの忘却防止」、CI は「他人の commit を信じない」）。今フェーズでは前者だけ。
- **hook を `--no-verify` で回避するワークフローを正当化しない**。すでに `AGENTS.md` で禁止済みなのでこれを引き続き守る。
- **hook 内で `git add` し直すような副作用を加えない**（lint-staged + auto-fix のパターン）。**変更を勝手に書き戻すフックは混乱の元**。fail させて人間/エージェントが直す方が、ハーネスの透明性を保てる。
- **husky v9 の init で生成される雛形をそのままにしない**。デフォルトは `npm test` 1行が入っているが、私たちのワークフローには合わない。必ず置き換える。

---

## 既知のリスク / 不確実性

- husky の `prepare` script は `npm install` 時のみ走るので、「リポジトリを `git clone` しただけで hook が効く」状態ではない。**最低 1 回 `npm install` を要する**。これは明示する。
- Windows + Git Bash で `.husky/pre-commit` のシェル実行が問題を起こさないことを実機で確認する（husky v9 はクロスプラットフォーム実績あり）。
- 既存の `core.hooksPath` を git config に手動設定していないか確認する（husky と衝突する可能性がある）。

---

## 学び・遭遇した問題

### 作業ログ

- **husky v9 のセットアップ**: `npm install husky -D` + ルート `package.json` の `scripts.prepare = "husky"` だけで `.husky/_/` 一式が `npm install` 時に生成された。`npx husky init` を明示的に叩く必要はなかった（v9 では prepare script が同等の処理を含む）。`core.hooksPath` も自動で `.husky/_` に設定された（`git config --get core.hooksPath` で確認）。
- **`.husky/pre-commit` のヘッダ**: husky v9 では昔の `#!/bin/sh` + `. "$(dirname -- "$0")/_/husky.sh"` 系のボイラープレートは **不要**。プレーンな shell スクリプトで OK。混乱回避のため `#!/usr/bin/env bash` と `set -euo pipefail` だけ書いた。
- **実行権限**: Git Bash 上で `chmod +x .husky/pre-commit` を実行。Windows ファイルシステムでは git の executable bit が走らないと心配したが、`.husky/_/pre-commit`（husky が用意した forwarder）が CLI から `sh` で呼ぶため、ターゲットの実行権限は実は必須ではない。とはいえ POSIX 流儀に揃えておく方が混乱が少ない。
- **動作確認の方針**: 実際の `git commit` を作って verify するのは「Claude が独断で commit を作る」ことになり、ガイドライン上避けたい。代わりに `bash .husky/pre-commit` を直接呼び、(1) 既存コードで EXIT 0、(2) `src/index.ts` に意図的にスペース2個の Prettier 違反を入れて EXIT 1、(3) 巻き戻して再度 EXIT 0、を確認した。git からの起動経路は husky の `_/pre-commit` forwarder が定型的に処理するため、ここまで verify できれば実 commit でも同じ結果になる。
- **シェルパイプライン落とし穴**: 最初の red path 検証で `bash .husky/pre-commit 2>&1 | tail -20; echo "EXIT: $?"` を使い、`$?` が `tail` の exit を拾って 0 に見えてしまった。リダイレクトに切り替えて再確認した。**今後ハーネスの fail 動作を verify するときは pipe を挟まない**。これは小さいが地味に効く教訓。
- **lint-staged 不採用**: 現状 hook 全体（check.sh + test:run）の所要時間は手元計測で **約 2〜3 秒**。ファイル絞り込みの最適化で得られるメリットより、設定が増える複雑度のデメリットが上回る。Phase 2 中に痛みが出たら導入検討。

### 仕組み化に値する学び（→ core-beliefs に転記済み）

1. **静的検証 + テストは pre-commit hook で git に強制する**。プロンプトとしての約束（AGENTS.md）から、git commit という機械的なゲートに昇格した。`tooling.md` に追記済み。
2. **hook の中で auto-fix（`prettier --write` 等）を走らせない**。失敗 → 人間/エージェントが直す、の経路を保つ方が変更の透明性が高い。`tooling.md` に追記済み。
3. **`harnes/` 直下の `package.json` は「リポジトリ全体の dev tooling 用」**。アプリパッケージとは役割が違うことを明示しておく。意図のドリフトで誤って workspaces 化しないよう、`description` に意図を書いて `tooling.md` にも書いた。

### 完了時の状態

- 新規ファイル: `harnes/package.json`, `harnes/package-lock.json`, `harnes/.husky/pre-commit`, `harnes/.husky/_/`（husky 内部）
- `git config --get core.hooksPath` → `.husky/_`
- `bash .husky/pre-commit` → green path EXIT 0、red path EXIT 1 を両方確認
- `AGENTS.md`: pre-commit の存在、`npm install` の必要性、`--no-verify` 禁止を明記
- `docs/core-beliefs/tooling.md`: 新原則を 2 つ追記
- `dashboard-app/docs/exec-plans/active/` は再び空、Phase 2-A/2-B/2-C はすべて `completed/` に揃った

### failure-log への影響

新規エントリは作らない。「`check.sh` を忘れた」という失敗が **実害として観測されていない**ため、空想で `FL-XXX` を追加するのはノイズになる。代わりに、今フェーズのアウトプットそのものが `FL-001`（taskkill 問題）の一般化された予防策にもなっている（「ローカル環境固有の罠を仕組みで潰す」流儀）。`FL-001` の `status` はまだ `open` のままで良い（`taskkill` 問題は pre-commit hook では解決していない）。

---

## ポストモーテム: 配置場所の修正（2026-04-10）

完了直後にユーザーから「`.husky/` フォルダは `dashboard-app/` 配下でよくない?」と指摘を受けた。**正しい指摘**だったので即座に移動した。

### 何を間違えたか
- 初期配置: `harnes/{package.json, .husky/, node_modules/}` を git root に作った。
- 問題: `harnes/` 直下には `documents/`（プロジェクトの親文書群）も同居しており、ハーネス用 dev tooling と非アプリコンテンツが同じ階層に混ざってしまっていた。
- 設計時の思考停止: 「husky は git root に置くもの」と決め打ちで、subdirectory パターンの存在を確認していなかった。

### 何を学んだか
- husky v9 は **公式に subdirectory パターンをサポート** している:
  - `package.json` をサブディレクトリ（ここでは `dashboard-app/`）に置き、
  - `prepare` script を `cd .. && husky dashboard-app/.husky` にする。
  - これで `core.hooksPath` は git root から見て `dashboard-app/.husky/_` になり、`.husky/` がサブディレクトリ配下に閉じ込められる。
- git は hook を **常に git root を CWD として実行する**ので、hook 内のパスは `.husky/` の物理位置に依存しない。元の hook 内容（`bash dashboard-app/scripts/check.sh` 等）はそのまま使い回せた。
- リポジトリの「git root」と「プロジェクトのルート」が一致しないリポジトリでは、ツール類はプロジェクト側に寄せた方が認知負荷が低い。

### 何をやったか
1. `dashboard-app/package.json` を新規作成（`name: "dashboard-app-tooling"`、`prepare: "cd .. && husky dashboard-app/.husky"`、`devDependencies.husky` のみ）
2. `dashboard-app/` で `npm install` → `dashboard-app/.husky/_/` 一式が生成され、`core.hooksPath` が `dashboard-app/.husky/_` に更新された
3. `harnes/.husky/pre-commit` の中身を `dashboard-app/.husky/pre-commit` にコピー（**内容は無変更**、コメントだけ「git は git root を CWD として実行する」と追記）
4. `harnes/{package.json, package-lock.json, node_modules/, .husky/}` を全削除
5. `bash dashboard-app/.husky/_/pre-commit`（husky の forwarder 経由）で green/red の両方を再 verify
6. `AGENTS.md` と `tooling.md` を新配置に合わせて書き換え
7. `failure-log.jsonl` に **`FL-003`** を append: 「husky の初期配置を harnes/ git root に置いてしまった」をプロセス系の失敗として記録

### この出来事の意味

これは **同じ失敗を 2 回踏まないようにルール化する** ハーネスエンジニアリングの典型例。
個別バグではなく「設計時の決め打ち」が原因なので、リンタには昇格できないが、`tooling.md` に「ハーネスは `dashboard-app/` 配下に閉じ込める」原則として刻んだ。次にツール（lint-staged、commitizen、CI 設定等）を導入するときの **判断のプリセット**として機能する。
