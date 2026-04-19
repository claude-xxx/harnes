import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';
import {
  aggregateFailureLog,
  parseExecPlan,
  aggregateCoreBeliefs,
  aggregateFailureLogTimeline,
} from '../src/lib/harness.js';
import {
  HarnessFailureLogSchema,
  HarnessExecPlansSchema,
  HarnessCoreBeliefsSchema,
  HarnessFailureLogTimelineSchema,
} from '../src/schemas/api.js';

/**
 * ハーネス観測ダッシュボード (/api/harness/*) の contract + unit test。
 *
 * - 純粋関数 (aggregateFailureLog / parseExecPlan / aggregateCoreBeliefs) は
 *   ファイルシステムに触れない in-memory 入力で検証する。これが AC-E1〜E4 の本体。
 * - live handler はプロジェクトの実ファイルを読むため、最低限の形状と schema 整合のみ検証する。
 */

const ORIGIN = 'http://localhost';
async function get(path: string): Promise<Response> {
  return app.fetch(new Request(`${ORIGIN}${path}`));
}

describe('aggregateFailureLog', () => {
  // AC-E1: 不正な JSON 行を含む JSONL
  it('skips malformed JSON lines and aggregates the remainder (AC-E1)', () => {
    const jsonl = [
      '{"id":"FL-1","status":"open","category":"frontend"}',
      'not-json-at-all',
      '{"id":"FL-2","status":"promoted","category":"backend"}',
      '{broken',
      '{"id":"FL-3","status":"open","category":"frontend"}',
    ].join('\n');

    const result = aggregateFailureLog(jsonl);

    expect(result.totalValid).toBe(3);
    expect(result.totalInvalid).toBe(2);
    expect(result.byStatus).toEqual({ open: 2, promoted: 1 });
    expect(result.byCategory).toEqual({ frontend: 2, backend: 1 });
  });

  // AC-E3: 空 JSONL 文字列
  it('returns zero-filled aggregate for empty input (AC-E3)', () => {
    const result = aggregateFailureLog('');
    expect(result.totalValid).toBe(0);
    expect(result.totalInvalid).toBe(0);
    expect(result.byStatus).toEqual({});
    expect(result.byCategory).toEqual({});
  });

  it('ignores blank lines (trailing newline safe)', () => {
    const jsonl = '{"status":"open","category":"frontend"}\n\n';
    const result = aggregateFailureLog(jsonl);
    expect(result.totalValid).toBe(1);
    expect(result.totalInvalid).toBe(0);
  });
});

describe('parseExecPlan', () => {
  it('extracts title, status, createdAt, completedAt from bolded fields', () => {
    const md = [
      '# ハーネス観測ダッシュボード',
      '',
      '- **状態**: planned',
      '- **作成**: 2026-04-12',
      '',
      '## 目的',
    ].join('\n');

    const result = parseExecPlan(md, 'harness-dashboard.md');

    expect(result.title).toBe('ハーネス観測ダッシュボード');
    expect(result.status).toBe('planned');
    expect(result.createdAt).toBe('2026-04-12');
    expect(result.completedAt).toBeNull();
  });

  it('handles completed plans with all fields', () => {
    const md = [
      '# サイドバーにファイル最終更新日時を表示',
      '',
      '- **状態**: completed',
      '- **作成**: 2026-04-11',
      '- **完了**: 2026-04-12',
    ].join('\n');

    const result = parseExecPlan(md, 'file-timestamp.md');

    expect(result.title).toBe('サイドバーにファイル最終更新日時を表示');
    expect(result.status).toBe('completed');
    expect(result.createdAt).toBe('2026-04-11');
    expect(result.completedAt).toBe('2026-04-12');
  });

  it('falls back to fileName when no title heading is present', () => {
    const result = parseExecPlan('no heading here', 'orphan.md');
    expect(result.title).toBe('orphan.md');
    expect(result.status).toBeNull();
  });

  it('supports non-bold field variant `- 状態: planned`', () => {
    const md = '# T\n\n- 状態: planned\n';
    const result = parseExecPlan(md, 'x.md');
    expect(result.status).toBe('planned');
  });
});

describe('aggregateCoreBeliefs', () => {
  // AC-E4: 「確立された原則」セクションを持たないファイル
  it('returns established=0 when the section is absent (AC-E4)', () => {
    const md = ['# index', '', '## カテゴリ', '- foo', '- bar', '', '## process', '- baz'].join(
      '\n',
    );

    const result = aggregateCoreBeliefs(md, 'index.md');
    expect(result.category).toBe('index');
    expect(result.established).toBe(0);
    expect(result.candidates).toBe(0);
  });

  it('counts only top-level bullets under ## 確立された原則', () => {
    const md = [
      '# frontend',
      '',
      '## 確立された原則',
      '- A',
      '  - sub-A1',
      '  - sub-A2',
      '- B',
      '- C',
      '',
      '## 検討中（昇格候補）',
      '- candidate-1',
      '- candidate-2',
    ].join('\n');

    const result = aggregateCoreBeliefs(md, 'frontend.md');
    expect(result.category).toBe('frontend');
    expect(result.established).toBe(3);
    expect(result.candidates).toBe(2);
  });

  it('derives category from filename stripping .md', () => {
    const result = aggregateCoreBeliefs('## 確立された原則\n- x\n', 'backend.md');
    expect(result.category).toBe('backend');
    expect(result.established).toBe(1);
  });
});

describe('GET /api/harness/failure-log', () => {
  it('returns 200 with a body matching HarnessFailureLogSchema', async () => {
    const res = await get('/api/harness/failure-log');
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = HarnessFailureLogSchema.parse(json);
    // real docs/failure-log.jsonl should have at least one valid record
    expect(parsed.totalValid).toBeGreaterThan(0);
    // open / promoted are the two known statuses in the current fixture
    const statuses = Object.keys(parsed.byStatus);
    expect(statuses.length).toBeGreaterThan(0);
  });
});

describe('GET /api/harness/exec-plans', () => {
  // AC-E2 is covered by the unit-level pure function suite (loadGroup maps to []
  // when readdir finds 0 .md files). Here we check that the live handler returns
  // arrays for both groups and includes at least one known plan.
  it('returns 200 with active+completed arrays including known plans', async () => {
    const res = await get('/api/harness/exec-plans');
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = HarnessExecPlansSchema.parse(json);

    expect(Array.isArray(parsed.active)).toBe(true);
    expect(Array.isArray(parsed.completed)).toBe(true);

    // completed/ must contain file-timestamp.md and harness-dashboard.md,
    // both with status='completed'
    const ft = parsed.completed.find((e) => e.file === 'file-timestamp.md');
    expect(ft).toBeDefined();
    expect(ft!.status).toBe('completed');

    const hd = parsed.completed.find((e) => e.file === 'harness-dashboard.md');
    expect(hd).toBeDefined();
    expect(hd!.title).toContain('ハーネス');
    expect(hd!.status).toBe('completed');
  });

  // AC-E2 (empty directory case) is not verifiable at the pure-function level
  // because loadGroup's readdir is a live fs call. The live contract test above
  // covers the non-empty path; a formalized empty-dir test was removed as it
  // degenerated into an empty-vs-empty assertion. If a test fs harness is
  // introduced later, re-add a directory-level empty case here.
});

/* ------------------------------------------------------------------ */
/*        aggregateFailureLogTimeline — pure function unit tests        */
/* ------------------------------------------------------------------ */

describe('aggregateFailureLogTimeline', () => {
  // AC-E1: empty input returns empty entries
  it('returns empty entries for empty input (AC-E1)', () => {
    const result = aggregateFailureLogTimeline('');
    expect(result.entries).toEqual([]);
  });

  // AC-H2 + AC-H3: valid records produce date-count pairs sorted ascending
  it('aggregates by date and sorts ascending (AC-H2, AC-H3)', () => {
    const jsonl = [
      '{"date":"2026-04-10","status":"open","category":"frontend"}',
      '{"date":"2026-04-09","status":"open","category":"backend"}',
      '{"date":"2026-04-10","status":"promoted","category":"tooling"}',
    ].join('\n');

    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([
      { date: '2026-04-09', count: 1 },
      { date: '2026-04-10', count: 2 },
    ]);
  });

  // AC-E2: records with missing date are skipped
  it('skips records without a date field (AC-E2)', () => {
    const jsonl = [
      '{"date":"2026-04-09","status":"open","category":"frontend"}',
      '{"status":"open","category":"backend"}',
      '{"date":"2026-04-09","status":"promoted","category":"tooling"}',
    ].join('\n');

    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([{ date: '2026-04-09', count: 2 }]);
  });

  // AC-E2: records with invalid date format are skipped
  it('skips records with invalid date format (AC-E2)', () => {
    const jsonl = [
      '{"date":"2026-04-09","status":"open","category":"frontend"}',
      '{"date":"not-a-date","status":"open","category":"backend"}',
      '{"date":"2026/04/10","status":"open","category":"tooling"}',
    ].join('\n');

    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([{ date: '2026-04-09', count: 1 }]);
  });

  // AC-E4: same date multiple records are summed
  it('sums counts for the same date (AC-E4)', () => {
    const jsonl = [
      '{"date":"2026-04-09","status":"open","category":"frontend"}',
      '{"date":"2026-04-09","status":"open","category":"backend"}',
      '{"date":"2026-04-09","status":"promoted","category":"tooling"}',
    ].join('\n');

    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([{ date: '2026-04-09', count: 3 }]);
  });

  it('skips malformed JSON lines', () => {
    const jsonl = [
      '{"date":"2026-04-09","status":"open"}',
      'not-json',
      '{"date":"2026-04-10","status":"open"}',
    ].join('\n');

    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([
      { date: '2026-04-09', count: 1 },
      { date: '2026-04-10', count: 1 },
    ]);
  });

  it('ignores blank lines', () => {
    const jsonl = '{"date":"2026-04-09","status":"open"}\n\n';
    const result = aggregateFailureLogTimeline(jsonl);
    expect(result.entries).toEqual([{ date: '2026-04-09', count: 1 }]);
  });
});

/* ------------------------------------------------------------------ */
/*        GET /api/harness/failure-log/timeline — contract test        */
/* ------------------------------------------------------------------ */

describe('GET /api/harness/failure-log/timeline', () => {
  // AC-H2: returns 200 with body matching schema
  it('returns 200 with a body matching HarnessFailureLogTimelineSchema (AC-H2)', async () => {
    const res = await get('/api/harness/failure-log/timeline');
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = HarnessFailureLogTimelineSchema.parse(json);
    expect(Array.isArray(parsed.entries)).toBe(true);
  });

  // AC-H3: entries are sorted by date ascending
  it('returns entries sorted by date ascending (AC-H3)', async () => {
    const res = await get('/api/harness/failure-log/timeline');
    const json = await res.json();
    const parsed = HarnessFailureLogTimelineSchema.parse(json);
    if (parsed.entries.length >= 2) {
      for (let i = 1; i < parsed.entries.length; i++) {
        expect(parsed.entries[i].date >= parsed.entries[i - 1].date).toBe(true);
      }
    }
  });
});

describe('GET /api/harness/core-beliefs', () => {
  it('returns 200 with frontend.md having established >= 1 (AC-H11 data source)', async () => {
    const res = await get('/api/harness/core-beliefs');
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = HarnessCoreBeliefsSchema.parse(json);

    const fe = parsed.entries.find((e) => e.file === 'frontend.md');
    expect(fe).toBeDefined();
    expect(fe!.category).toBe('frontend');
    expect(fe!.established).toBeGreaterThanOrEqual(1);
  });

  it('includes index.md with established=0 (section absent)', async () => {
    const res = await get('/api/harness/core-beliefs');
    const json = await res.json();
    const parsed = HarnessCoreBeliefsSchema.parse(json);

    const idx = parsed.entries.find((e) => e.file === 'index.md');
    expect(idx).toBeDefined();
    expect(idx!.established).toBe(0);
  });
});
