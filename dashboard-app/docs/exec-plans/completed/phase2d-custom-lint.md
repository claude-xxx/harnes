# Phase 2-D: 最初のカスタム lint 1 本（FE で `node:*` import 禁止）

- **状態**: completed
- **開始**: 2026-04-10
- **完了**: 2026-04-10
- **目的**: `infra.md` に長く昇格候補として登録されていた **「FE は Node 組み込みモジュール (`node:fs`, `node:path` 等) を import してはいけない」** を、ESLint の組み込みルール `no-restricted-imports` で **機械的に強制**する。
  - **学びの本丸はエラーメッセージ**: `harnes-summary.md` および plan.md の指示に従い、エラーメッセージを **エージェントが読んだら次の手が分かる粒度** に書く。これはハーネスエンジニアリングの「プロンプトより仕組みが強い」を体感する第一歩。

> **1セッション1機能、1PR1目的を死守する。** 1 ルールだけ書く。複数まとめない。

---

## 背景

- `dashboard-app/docs/core-beliefs/infra.md` には「FE → BE の通信は Vite proxy 経由で `/api`、FE は BE の HTTP API のみを介して Markdown を取得する。**FE から直接 fs に触れる経路を作らない**」が確立済み原則として書かれている。
- 同ファイルの「検討中（昇格候補）」セクションには **`eslint-plugin-no-restricted-imports` で FE から `node:fs` 等を禁止** が登録されていた（Phase 1 完了時から）。
- このルールはまだ違反されたことはないが、**Vite + React 環境では `node:fs` を import しようとしても実行時に静かに失敗する** 性質があり、エージェントがコードを書いている途中に気づきにくい。早めに静的に潰しておきたい。
- Phase 2-A で ESLint 環境は整備済み、Phase 2-C で pre-commit hook が走るようになっている。**カスタム lint を追加する土台は揃っている**。

---

## スコープ

### やる
- `frontend/eslint.config.js` に `no-restricted-imports` を 1 つだけ追加
- 禁止パターン: `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:child_process`, `node:url`, `fs`, `path`（`node:` プレフィックスなし版も）
- エラーメッセージは **エージェントフレンドリー**:
  - 何が悪いか
  - なぜ禁止か
  - 代わりに何を使えばよいか
  - どのドキュメントを読むべきか
- 動作確認: 違反 import を一時的に入れて `npm run lint` が **正しいメッセージで** 落ちることを確認 → revert
- pre-commit hook 経由でも止まることを確認（Phase 2-C との統合確認）
- `infra.md` の昇格候補を「確立済み」に書き換え、`promoted_to: "eslint:no-restricted-imports"` 相当の情報を残す

### やらない（次フェーズ以降）
- BE 側のカスタム lint（`backend.md` の `app.get()` 直書き禁止 → 次回検討、AST 走査が必要で複雑）
- ESLint プラグインの自作（今回は組み込みルールのみ）
- FE で `window.fetch` の絶対 URL 禁止などの追加ルール（誘惑に負けない）
- Stylelint 等の別系統ツール

---

## 設計判断

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| ルール種別 | **ESLint 組み込み `no-restricted-imports`** | 自作プラグインを作るより圧倒的に簡単。要件を満たす十分な表現力を持つ。 |
| 設定の場所 | `frontend/eslint.config.js` の既存 flat config 内 | 別ファイルに切り出すのは過剰設計。1 ルールしかない。 |
| 禁止対象 | `node:fs`, `node:fs/promises`, `node:path`, `node:os`, `node:child_process`, `node:url`, `fs`, `path` | FE で実害が想定される Node 組み込みを網羅。`node:url` はブラウザに `URL` があるため不要。 |
| エラーメッセージの構造 | 何 → なぜ → 代替 → どこを読むか の順 | エージェントが「次に何をすべきか」を 1 メッセージで読み取れるように。これが Phase 2-D の **学びの本丸**。 |
| ルール適用範囲 | `frontend/src/**` のみ | テストや設定ファイル（`vite.config.ts` など）は対象外（Vite は build-time に Node API を使う）。`files` で限定する。 |
| `severity` | `error` | warning にしても `npm run lint` は通ってしまう。`error` で強制する。 |

---

## 実装プラン

### `frontend/eslint.config.js` への追記イメージ

既存 config の末尾に新しいオブジェクトを 1 つ append:

```js
{
  files: ['src/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'node:fs',
            message:
              'FE must not import node:fs. Reason: the frontend runs in the browser and Vite cannot bundle Node built-ins. Use the BE HTTP API (e.g. fetch("/api/...")) instead. See dashboard-app/docs/core-beliefs/infra.md.',
          },
          // ...同形式で node:fs/promises, node:path, node:os, node:child_process, fs, path
        ],
      },
    ],
  },
},
```

複数禁止対象は `paths` 配列に並べる。`patterns` ではなく `paths` を使う理由: 完全一致で十分（誤検知ゼロ優先）。

---

## やること（順番）

1. **`frontend/eslint.config.js` を編集** — 既存の Prettier extends の **後ろに** 新しい設定オブジェクトを 1 つ append（rule の override が確実に効く順序）
2. **正常パス確認**: `cd frontend && npm run lint` が green
3. **異常パス確認**:
   - `frontend/src/App.tsx` の上に `import 'node:fs';` を 1 行追加
   - `npm run lint` が **エージェントフレンドリーなメッセージ付き** で落ちることを確認
   - そのままの状態で `bash dashboard-app/.husky/_/pre-commit`（git root を CWD として実行）が EXIT 1 することを確認
   - 違反 import を巻き戻す
4. **`infra.md` を更新**:
   - 「検討中（昇格候補）」から該当行を削除
   - 「確立された原則」セクションに「FE で `node:*` import 禁止（ESLint で機械化済み）」を追加
   - 関連: ルールの実体は `frontend/eslint.config.js` にあると明示
5. **アーカイブ**: 学びを本ファイル末尾に追記し `completed/` へ移動

---

## ハーネス的観点での自戒

- **複数ルールをまとめて入れない**。1 本だけ書く。次のルールが必要になったら別 exec-plan。
- **自作プラグインを書きたくならない**。組み込みルールでできるうちは組み込みで済ませる。
- **エラーメッセージで時間を溶かさない**。読みやすい構造の最小バージョンを 1 回で書く。改善は実害が出てから。
- **FE 全体に適用しない**。`vite.config.ts` のような build-time コードは別文脈なので対象外にする。範囲を最小に保つ。
- **`failure-log.jsonl` に空想エントリを起こさない**。今フェーズは「事前防御」であって「再発防止」ではないため、`FL-XXX` の追加は行わない（infra.md の昇格候補が長く生きていたという事実は exec-plan の作業ログに残せば十分）。

---

## 既知のリスク / 不確実性

- ESLint flat config で `no-restricted-imports` の `paths` に `node:` プレフィックス付きの名前を渡せるかは要検証（おそらく問題ないが、初回なので動かして確認する）。
- FE の既存コード（`App.tsx`, `main.tsx` 等）が誤って Node 組み込みを import していないことを green path で再確認する。

---

## 学び・遭遇した問題

### 作業ログ

- **`no-restricted-imports` の `paths` で `node:` プレフィックスは問題なく動いた**。`node:fs` と `fs` を別エントリとして両方リストに入れた。
- **適用範囲の分離が効いた**: ESLint flat config では複数の設定オブジェクトをスタックできるので、既存の全体ルール（`files: ['**/*.{ts,tsx}']`）の **後ろに** `files: ['src/**/*.{ts,tsx}']` のオブジェクトを追加するだけで、`vite.config.ts` のような build-time コードを自然に除外できた。`vite.config.ts` で `path` を import しているが lint は通る（`src/**` ではないため）。
- **エラーメッセージは長くてよい**: ESLint の出力にメッセージがそのまま 1 行で出る。エージェント目線では改行よりも「1 メッセージで全情報を運ぶ」方が読みやすい。「何 → なぜ → 代替 → 参照ドキュメント」の構造で書いた。
- **`FORBIDDEN_NODE_BUILTINS` を配列で持って `.map()` 生成した**: 各 `paths` エントリにメッセージをコピペすると保守性が落ちるため、定数 + `.map()` で1か所を編集すれば全エントリに反映される構造にした。**過剰設計には該当しない**: ルール 1 本に対する自然な抽象化。
- **pre-commit hook と統合確認**: `frontend/src/App.tsx` に `import 'node:fs'` を 1 行入れて `bash dashboard-app/.husky/_/pre-commit` を実行 → EXIT 1、ESLint の詳細メッセージがそのまま hook の出力に出て、`husky - pre-commit script failed (code 1)` で終わった。**ハーネスがエージェント向け診断ログをそのまま素通しする** ことが確認できた。
- **既存コードへの影響**: 既存の `App.tsx`, `main.tsx`, `index.css`, `App.css` は誰も Node 組み込みを import していなかったので、巻き戻し後も green。

### 仕組み化に値する学び（→ core-beliefs に転記済み）

1. **ESLint メッセージはエージェントが読む前提で書く**: 「何 → なぜ → 代替 → 参照ドキュメント」の 4 要素を 1 メッセージで運ぶ。これは `infra.md` のルール記述と同じ流儀で、コードレビューでもエージェントログでも同じ情報粒度になる。今回は `infra.md` に「機械化済み（Phase 2-D）」として完了状態を記録した。
2. **flat config は「狭い対象 × 限定ルール」のオブジェクトを後ろから足す方が事故が少ない**: 全体ルールを書き換えるよりも、`files` で適用範囲を絞った新しいオブジェクトを末尾に append する方が、既存の lint 結果を壊さない。これは `tooling.md` への追記候補だが、Phase 2-D 単独では昇格しない（同じパターンが 2 回必要になったら追記する）。

### 完了時の状態

- 新規/更新ファイル:
  - `frontend/eslint.config.js`: `no-restricted-imports` を 1 つ追加（`src/**/*.{ts,tsx}` 限定）
  - `dashboard-app/docs/core-beliefs/infra.md`: 機械化済みの注記を追加、昇格候補リストから該当行を削除
- `bash dashboard-app/scripts/check.sh` → green
- 異常パス確認: `import 'node:fs'` を意図的に入れた状態で `npm run lint`、および pre-commit hook が **同じ詳細メッセージ** で EXIT 1 になることを両方確認 → 巻き戻し済み
- `failure-log.jsonl` への追加: **なし**（事前防御の追加であり、再発防止ではないため）

### 次の昇格候補（次回の参考）

- **BE の `app.get()` 直書き禁止**（`backend.md` の昇格候補）: `OpenAPIHono` 以外でハンドラを登録するのを禁止する。`no-restricted-syntax` で AST マッチが必要なため、Phase 2-D の組み込みルールよりは複雑度が高い。優先度は中。
- **FE で `fetch('http://...')` の絶対 URL 禁止**: `frontend.md` のたたき台ルールの 1 つ。`no-restricted-syntax` で `Literal` を見れば書ける。実害が出ていないので優先度は低。

これらは次のカスタム lint exec-plan を切るときの種。
