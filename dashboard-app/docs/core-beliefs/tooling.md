# core-beliefs / tooling

> 開発環境（OS、シェル、npm スクリプト、起動・停止）に関わる作業のときに読むファイル。

## 確立された原則

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
