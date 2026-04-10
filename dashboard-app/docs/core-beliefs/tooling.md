# core-beliefs / tooling

> 開発環境（OS、シェル、npm スクリプト、起動・停止）に関わる作業のときに読むファイル。

## 確立された原則

- **静的検証は `check` / `scripts/check.sh` に集約する**。
  - 各パッケージ（FE/BE）の `npm run check` は `lint → typecheck → format:check` を順に走らせる。
  - `dashboard-app/scripts/check.sh` が両方を一発で回す唯一のエントリ。
  - 個別コマンド（`npm run lint` 単体など）はエージェントが原因切り分けでデバッグするとき以外は使わない。
  - フォーマッタは Prettier、Lint は ESLint(flat config) + typescript-eslint。両者の競合は `eslint-config-prettier/flat` で回避。
  - 設定ファイルの場所: `dashboard-app/` 直下に `.prettierrc.json` / `.prettierignore`、各パッケージに `eslint.config.js`。

- **静的検証とテストは pre-commit hook で git に強制される**（Phase 2-C で昇格済み）。
  - `dashboard-app/package.json` が husky を持ち、`dashboard-app/.husky/pre-commit` が `dashboard-app/scripts/check.sh` と `dashboard-app/backend` + `dashboard-app/frontend` 両方の `npm run test:run` を順に実行する。
  - hook を有効化するには **新規 clone 後、`dashboard-app/` で `npm install` を一度実行**する必要がある。`dashboard-app/package.json` の `prepare` script が `cd .. && husky dashboard-app/.husky` を呼び、git root から見て `core.hooksPath` を `dashboard-app/.husky/_` に設定する（husky 公式の subdirectory パターン）。
  - **`git commit --no-verify` での回避は禁止**（`AGENTS.md` で明示）。失敗の根本原因を直すか、ハーネス側を直すこと。
  - hook 内では **自動修正（`prettier --write` 等）を走らせない**。失敗させて人間/エージェントが直す方が、変更内容の透明性を保てる。
  - hook ファイルの中身は **git root（`harnes/`）からの相対パスで書く**。git は hook を常に git root を CWD として実行するため、`.husky/pre-commit` がどのサブディレクトリ配下にあろうとパス解決は変わらない。
  - `dashboard-app/package.json` は **dashboard-app の dev tooling 用メタパッケージ**。アプリコードを持たず、`workspaces` フィールドも持たない。アプリ依存は `dashboard-app/{frontend,backend}/package.json` 側に閉じる。**意図のドリフトでこの package.json に scripts や deps を増やしてはいけない**（増やすなら別 exec-plan で議論する）。
  - `harnes/` 直下に husky 関連ファイルは **置かない**。`documents/` 等の非アプリコンテンツが同居しているため、ハーネスは `dashboard-app/` 配下に閉じ込める。関連: `failure-log.jsonl` の `FL-003`。

- **Windows + Git Bash で dev サーバを停止するときは `taskkill` を使う**。
  - `kill <pid>` では止まらない（`&` で起動した場合、bash が返す PID は subshell の PID）。
  - 正しい手順:
    ```bash
    netstat -ano | grep -E '<port>' | grep LISTEN
    taskkill //PID <listening_pid> //F //T
    ```
  - 関連: `failure-log.jsonl` の `FL-001`

- **dev サーバはバックグラウンド起動より、別ターミナル起動を優先する**（停止トラブルの根本回避）。
  - エージェント実行時にやむを得ずバックグラウンド起動する場合は、上記 `taskkill` の手順をセットで実行できる状態にしておく。

## 検討中（昇格候補）

- `scripts/dev.sh` と `scripts/stop.sh` を作って起動・停止を1コマンドにラップする（特に停止）。これにより `failure-log.jsonl` の `FL-001` を `promoted_to: "script:scripts/stop.sh"` に昇格できる。
