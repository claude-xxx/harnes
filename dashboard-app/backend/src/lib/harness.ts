/**
 * ハーネス観測用の純粋関数群。
 *
 * ここに定義される関数は **ファイルシステムに触れない**。入力は全て in-memory な
 * 文字列 / オブジェクト / 配列で、エッジケースは unit test から直接食わせて検証する。
 *
 * ファイルの読み込みは呼び出し側 (app.ts のハンドラ) が `resolveWithinContent`
 * 経由で行い、その結果の文字列 / パス配列をこの層に渡す。
 *
 * 関連: docs/exec-plans/active/harness-dashboard.md の AC-E1〜E4
 */

export type FailureLogAggregate = {
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  totalValid: number;
  totalInvalid: number;
};

/** failure-log.jsonl 全体を 1 つの文字列として食い、ステータス別・カテゴリ別の件数を集計する。
 *
 * - 空行はスキップ
 * - JSON.parse に失敗した行はスキップ（totalInvalid に加算）
 * - status / category が文字列でないレコードもスキップ扱い（集計対象外）
 */
export function aggregateFailureLog(jsonlText: string): FailureLogAggregate {
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalValid = 0;
  let totalInvalid = 0;

  const lines = jsonlText.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      totalInvalid++;
      continue;
    }
    if (parsed === null || typeof parsed !== 'object') {
      totalInvalid++;
      continue;
    }
    const rec = parsed as Record<string, unknown>;
    const status = typeof rec.status === 'string' ? rec.status : null;
    const category = typeof rec.category === 'string' ? rec.category : null;
    if (status === null && category === null) {
      totalInvalid++;
      continue;
    }
    totalValid++;
    if (status !== null) {
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }
    if (category !== null) {
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
  }

  return { byStatus, byCategory, totalValid, totalInvalid };
}

export type ExecPlanSummary = {
  file: string;
  title: string;
  status: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

/**
 * Markdown 本文から exec-plan のメタ情報を抽出する。
 *
 * - タイトル: 先頭の `# <タイトル>` 行。なければファイル名を使う。
 * - 状態 / 作成 / 完了: 本文中に `- **<キー>**: <値>` もしくは `- <キー>: <値>`
 *   の形で現れる最初の行から値を取り出す。
 *   値側の leading/trailing の `*` / 空白は strip する。
 *
 * 存在しないキーは null を返す（該当フィールド非表示のヒント）。
 */
export function parseExecPlan(text: string, fileName: string): ExecPlanSummary {
  const lines = text.split(/\r?\n/);
  let title = fileName;
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) {
      title = m[1].trim();
      break;
    }
  }
  const pickField = (key: string): string | null => {
    // `- **状態**: planned` / `- 状態: planned` 両方を許容
    const re = new RegExp(`^[\\-*]\\s*\\**\\s*${key}\\s*\\**\\s*[:：]\\s*(.+?)\\s*$`);
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        // 値内の leading/trailing `*` を剥がす（`**completed**` 対策）
        return m[1].replace(/^\*+|\*+$/g, '').trim() || null;
      }
    }
    return null;
  };
  return {
    file: fileName,
    title,
    status: pickField('状態'),
    createdAt: pickField('作成'),
    completedAt: pickField('完了'),
  };
}

export type CoreBeliefSummary = {
  category: string;
  established: number;
  candidates: number;
};

/**
 * core-beliefs markdown 1 ファイル分から「確立された原則」と「検討中」の
 * 箇条書き件数を数える。
 *
 * - 対象セクションは `## 確立された原則` 直下から次の `##` までの範囲
 * - `## 検討中` で始まる見出し（「検討中（昇格候補）」含む）直下から次の `##` まで
 * - 「箇条書き件数」 = **インデント無しの `- ` 行** の数（サブ箇条書きは数えない）
 * - 該当セクションを持たないファイルは 0 を返す（AC-E4）
 * - category はファイル名から拡張子を除いたもの（例: `frontend.md` -> `frontend`）
 */
export function aggregateCoreBeliefs(text: string, fileName: string): CoreBeliefSummary {
  const category = fileName.replace(/\.md$/i, '');
  const lines = text.split(/\r?\n/);

  const countTopLevelBulletsInSection = (headingMatcher: (h: string) => boolean): number => {
    let inSection = false;
    let count = 0;
    for (const line of lines) {
      const headingMatch = line.match(/^(#{2,6})\s+(.*)$/);
      if (headingMatch) {
        const heading = headingMatch[2].trim();
        if (headingMatch[1] === '##' && headingMatcher(heading)) {
          inSection = true;
          continue;
        }
        if (inSection && headingMatch[1] === '##') {
          // 次の h2 見出しで区間終了
          inSection = false;
        }
        continue;
      }
      if (inSection && /^-\s+/.test(line)) {
        count++;
      }
    }
    return count;
  };

  const established = countTopLevelBulletsInSection((h) => h.startsWith('確立された原則'));
  const candidates = countTopLevelBulletsInSection((h) => h.startsWith('検討中'));
  return { category, established, candidates };
}
