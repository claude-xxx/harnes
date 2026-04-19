import { useEffect, useState } from 'react';
import {
  fetchHarnessFailureLog,
  fetchHarnessFailureLogTimeline,
  fetchHarnessExecPlans,
  fetchHarnessCoreBeliefs,
} from '../api';
import type {
  HarnessFailureLog,
  HarnessFailureLogTimeline,
  HarnessExecPlans,
  HarnessCoreBeliefs,
} from '../types';

/**
 * ハーネス観測ダッシュボード。
 *
 * 3 セクション (Failure Log / Exec Plans / Core Beliefs) をそれぞれ独立した
 * 非同期ロードで描画する。1 セクションの失敗が他セクションを巻き込まないように
 * 各 state を分離している（AC-R1 保証）。
 *
 * FL-005: 1 ファイル 1 functional component（エラー表示はインライン JSX）。
 * core-beliefs/frontend.md: useEffect 内で同期 setState しない → LoadedX パターン。
 */

type Section<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

export function HarnessDashboard() {
  const [failureLog, setFailureLog] = useState<Section<HarnessFailureLog>>({ status: 'loading' });
  const [timeline, setTimeline] = useState<Section<HarnessFailureLogTimeline>>({
    status: 'loading',
  });
  const [execPlans, setExecPlans] = useState<Section<HarnessExecPlans>>({ status: 'loading' });
  const [coreBeliefs, setCoreBeliefs] = useState<Section<HarnessCoreBeliefs>>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHarnessFailureLog();
        if (!cancelled) setFailureLog({ status: 'success', data });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setFailureLog({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHarnessFailureLogTimeline();
        if (!cancelled) setTimeline({ status: 'success', data });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setTimeline({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHarnessExecPlans();
        if (!cancelled) setExecPlans({ status: 'success', data });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setExecPlans({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHarnessCoreBeliefs();
        if (!cancelled) setCoreBeliefs({ status: 'success', data });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'unknown error';
          setCoreBeliefs({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8" data-testid="harness-dashboard">
      {/* --- Section 1: Failure Log --------------------------------------- */}
      <section data-testid="section-failure-log" aria-labelledby="section-failure-log-heading">
        <h2
          id="section-failure-log-heading"
          className="text-xl font-bold border-b border-gray-300 pb-2 mb-3"
        >
          Failure Log
        </h2>
        {failureLog.status === 'loading' && <p className="text-gray-500 text-sm">読み込み中…</p>}
        {failureLog.status === 'error' && (
          <p className="text-red-600 text-sm">
            Failure Log を取得できませんでした（{failureLog.message}）
          </p>
        )}
        {failureLog.status === 'success' && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <h3 className="font-semibold mb-1">ステータス別</h3>
              <ul className="flex flex-wrap gap-3">
                {Object.entries(failureLog.data.byStatus).map(([status, count]) => (
                  <li
                    key={status}
                    className="inline-flex items-baseline gap-1 rounded bg-gray-100 px-2 py-1"
                  >
                    <span className="font-mono">{status}</span>
                    <span className="font-bold">{count}</span>
                  </li>
                ))}
                {Object.keys(failureLog.data.byStatus).length === 0 && (
                  <li className="text-gray-500">（該当なし）</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">カテゴリ別</h3>
              <ul className="flex flex-wrap gap-3">
                {Object.entries(failureLog.data.byCategory).map(([category, count]) => (
                  <li
                    key={category}
                    className="inline-flex items-baseline gap-1 rounded bg-gray-100 px-2 py-1"
                  >
                    <span className="font-mono">{category}</span>
                    <span className="font-bold">{count}</span>
                  </li>
                ))}
                {Object.keys(failureLog.data.byCategory).length === 0 && (
                  <li className="text-gray-500">（該当なし）</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* --- Section: Failure Log Timeline ---------------------------------- */}
      <section
        data-testid="section-failure-log-timeline"
        aria-labelledby="section-failure-log-timeline-heading"
      >
        <h2
          id="section-failure-log-timeline-heading"
          className="text-xl font-bold border-b border-gray-300 pb-2 mb-3"
        >
          Failure Log タイムライン
        </h2>
        {timeline.status === 'loading' && <p className="text-gray-500 text-sm">読み込み中…</p>}
        {timeline.status === 'error' && (
          <p className="text-red-600 text-sm">
            タイムラインを取得できませんでした（{timeline.message}）
          </p>
        )}
        {timeline.status === 'success' && timeline.data.entries.length === 0 && (
          <p className="text-gray-500 text-sm">No data</p>
        )}
        {timeline.status === 'success' &&
          timeline.data.entries.length > 0 &&
          (() => {
            const maxCount = Math.max(...timeline.data.entries.map((e) => e.count));
            return (
              <div className="flex items-end gap-1" style={{ height: '120px' }}>
                {timeline.data.entries.map((entry) => {
                  const heightPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
                  return (
                    <div
                      key={entry.date}
                      className="flex-1 bg-blue-500 rounded-t min-w-2"
                      style={{ height: `${heightPct}%` }}
                      aria-label={`${entry.date}: ${entry.count}件`}
                      role="img"
                      title={`${entry.date}: ${entry.count}件`}
                    />
                  );
                })}
              </div>
            );
          })()}
      </section>

      {/* --- Section 2: Exec Plans ---------------------------------------- */}
      <section data-testid="section-exec-plans" aria-labelledby="section-exec-plans-heading">
        <h2
          id="section-exec-plans-heading"
          className="text-xl font-bold border-b border-gray-300 pb-2 mb-3"
        >
          Exec Plans
        </h2>
        {execPlans.status === 'loading' && <p className="text-gray-500 text-sm">読み込み中…</p>}
        {execPlans.status === 'error' && (
          <p className="text-red-600 text-sm">
            Exec Plans を取得できませんでした（{execPlans.message}）
          </p>
        )}
        {execPlans.status === 'success' && (
          <div className="flex flex-col gap-4 text-sm">
            {(['active', 'completed'] as const).map((group) => {
              const entries = execPlans.data[group];
              return (
                <div key={group}>
                  <h3 className="font-semibold mb-1 capitalize">{group}</h3>
                  {entries.length === 0 ? (
                    <p className="text-gray-500">（該当なし）</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {entries.map((e) => (
                        <li key={e.file} className="flex flex-wrap items-baseline gap-2">
                          <span className="font-medium">{e.title}</span>
                          {e.status !== null && (
                            <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-700">
                              {e.status}
                            </span>
                          )}
                          {e.createdAt !== null && (
                            <span className="text-xs text-gray-500">作成 {e.createdAt}</span>
                          )}
                          {e.completedAt !== null && (
                            <span className="text-xs text-gray-500">完了 {e.completedAt}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- Section 3: Core Beliefs -------------------------------------- */}
      <section data-testid="section-core-beliefs" aria-labelledby="section-core-beliefs-heading">
        <h2
          id="section-core-beliefs-heading"
          className="text-xl font-bold border-b border-gray-300 pb-2 mb-3"
        >
          Core Beliefs
        </h2>
        {coreBeliefs.status === 'loading' && <p className="text-gray-500 text-sm">読み込み中…</p>}
        {coreBeliefs.status === 'error' && (
          <p className="text-red-600 text-sm">
            Core Beliefs を取得できませんでした（{coreBeliefs.message}）
          </p>
        )}
        {coreBeliefs.status === 'success' && (
          <ul className="flex flex-col gap-2 text-sm">
            {coreBeliefs.data.entries.map((e) => (
              <li key={e.file} className="flex flex-wrap items-baseline gap-3">
                <span className="font-mono font-semibold">{e.category}</span>
                <span className="text-xs text-gray-600">
                  確立済み <span className="font-bold text-gray-800">{e.established}</span>
                </span>
                <span className="text-xs text-gray-600">
                  検討中 <span className="font-bold text-gray-800">{e.candidates}</span>
                </span>
              </li>
            ))}
            {coreBeliefs.data.entries.length === 0 && (
              <li className="text-gray-500">（該当なし）</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
