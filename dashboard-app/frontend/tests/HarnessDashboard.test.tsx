import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HarnessDashboard } from '../src/components/HarnessDashboard';
import App from '../src/App';

/**
 * HarnessDashboard の unit test。
 *
 * AC-R1: /api/harness/failure-log fetch 失敗時、該当セクションにエラー表記が出つつ
 *        他セクション（Exec Plans / Core Beliefs）はアンマウントされていないこと。
 * AC-R2: /api/harness/exec-plans が `{}` 等の想定外 shape を返した場合でも
 *        クラッシュせず、ユーザー向けエラー表示が出ること。
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// URL 別に fetch レスポンスを返す supervisor。
type FetchHandler = (url: string) => Response | Promise<Response>;
function installFetch(handler: FetchHandler): void {
  mockFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return Promise.resolve(handler(url));
  });
}

/** Standard mock responses for all harness endpoints */
const MOCK_FAILURE_LOG = {
  byStatus: { open: 2, promoted: 3 },
  byCategory: { frontend: 1, backend: 0, tooling: 1, process: 3 },
  totalValid: 5,
  totalInvalid: 0,
};

const MOCK_TIMELINE = {
  entries: [
    { date: '2026-04-09', count: 1 },
    { date: '2026-04-10', count: 3 },
  ],
};

const MOCK_EXEC_PLANS = {
  active: [],
  completed: [],
};

const MOCK_CORE_BELIEFS = {
  entries: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function textResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('HarnessDashboard (standalone)', () => {
  it('renders all three section headings (Failure Log / Exec Plans / Core Beliefs)', async () => {
    installFetch((url) => {
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse(MOCK_TIMELINE);
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse({
          byStatus: { open: 2, promoted: 3 },
          byCategory: { frontend: 1, backend: 0, tooling: 1, process: 3 },
          totalValid: 5,
          totalInvalid: 0,
        });
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse({
          active: [
            {
              file: 'harness-dashboard.md',
              title: 'ハーネス観測ダッシュボード',
              status: 'planned',
              createdAt: '2026-04-12',
              completedAt: null,
            },
          ],
          completed: [
            {
              file: 'file-timestamp.md',
              title: 'サイドバー最終更新',
              status: 'completed',
              createdAt: '2026-04-11',
              completedAt: '2026-04-12',
            },
          ],
        });
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse({
          entries: [
            { file: 'frontend.md', category: 'frontend', established: 7, candidates: 1 },
            { file: 'backend.md', category: 'backend', established: 5, candidates: 3 },
            { file: 'index.md', category: 'index', established: 0, candidates: 0 },
          ],
        });
      }
      return jsonResponse({ error: 'not mocked' }, 500);
    });

    render(<HarnessDashboard />);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Failure Log' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Exec Plans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Core Beliefs' })).toBeInTheDocument();

    // Failure Log の status/category が表示される
    await waitFor(() => {
      expect(screen.getByText('open')).toBeInTheDocument();
    });
    // 'frontend' は Failure Log カテゴリと Core Beliefs 行の両方で現れる
    const frontendTexts = screen.getAllByText('frontend');
    expect(frontendTexts.length).toBeGreaterThanOrEqual(2);

    // Exec Plans のタイトル + 状態
    expect(screen.getByText('ハーネス観測ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('planned')).toBeInTheDocument();
    // 'completed' は group 見出しと status バッジの双方で出現するので複数 OK
    expect(screen.getAllByText('completed').length).toBeGreaterThanOrEqual(1);

    // Core Beliefs の frontend 行で確立済み 7 が表示される
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  // AC-R1: failure-log の取得失敗が他セクションを巻き込まない
  it('AC-R1: shows a Japanese error in Failure Log while other sections still mount', async () => {
    installFetch((url) => {
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse({ entries: [] });
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse({ error: 'boom' }, 500);
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse(MOCK_EXEC_PLANS);
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });

    render(<HarnessDashboard />);

    // Failure Log セクション内にエラー表記（「取得できません」を含む）
    await waitFor(() => {
      const failureSection = screen.getByTestId('section-failure-log');
      expect(failureSection.textContent ?? '').toMatch(/取得できません/);
    });

    // 他 2 セクションの見出しがまだ DOM にある（=アンマウントされていない）
    expect(screen.getByRole('heading', { level: 2, name: 'Exec Plans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Core Beliefs' })).toBeInTheDocument();
    expect(screen.getByTestId('section-exec-plans')).toBeInTheDocument();
    expect(screen.getByTestId('section-core-beliefs')).toBeInTheDocument();
  });

  // AC-R1 補足: network error (reject)
  it('AC-R1b: handles network rejection on failure-log without crashing other sections', async () => {
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/harness/failure-log/timeline')) {
        return Promise.resolve(jsonResponse({ entries: [] }));
      }
      if (url.includes('/api/harness/failure-log')) {
        return Promise.reject(new Error('network down'));
      }
      if (url.includes('/api/harness/exec-plans')) {
        return Promise.resolve(jsonResponse(MOCK_EXEC_PLANS));
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return Promise.resolve(jsonResponse(MOCK_CORE_BELIEFS));
      }
      return Promise.resolve(jsonResponse({}, 500));
    });

    render(<HarnessDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('section-failure-log').textContent ?? '').toMatch(/取得できません/);
    });
    expect(screen.getByTestId('section-exec-plans')).toBeInTheDocument();
    expect(screen.getByTestId('section-core-beliefs')).toBeInTheDocument();
  });

  // AC-R2: exec-plans が `{}` を返しても FE がクラッシュしない
  it('AC-R2: renders an error in Exec Plans section when response shape is invalid ({})', async () => {
    installFetch((url) => {
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse(MOCK_TIMELINE);
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse(MOCK_FAILURE_LOG);
      }
      if (url.includes('/api/harness/exec-plans')) {
        // 想定外 shape
        return jsonResponse({});
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });

    render(<HarnessDashboard />);

    // Exec Plans セクションにエラー表記
    await waitFor(() => {
      expect(screen.getByTestId('section-exec-plans').textContent ?? '').toMatch(/取得できません/);
    });
    // Failure Log / Core Beliefs はクラッシュせず依然として DOM に存在
    expect(screen.getByTestId('section-failure-log')).toBeInTheDocument();
    expect(screen.getByTestId('section-core-beliefs')).toBeInTheDocument();
  });
});

describe('HarnessDashboard timeline section', () => {
  /** Default fetch handler that returns all harness mocks including timeline */
  function installAllHarnessMocks(overrides?: Partial<Record<string, unknown>>) {
    installFetch((url) => {
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse(overrides?.timeline ?? MOCK_TIMELINE);
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse(overrides?.failureLog ?? MOCK_FAILURE_LOG);
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse(overrides?.execPlans ?? MOCK_EXEC_PLANS);
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(overrides?.coreBeliefs ?? MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });
  }

  // AC-H1 + AC-A2: timeline section has a heading
  it('AC-H1/AC-A2: renders a "Failure Log タイムライン" heading (h2 or h3)', async () => {
    installAllHarnessMocks();
    render(<HarnessDashboard />);
    const heading = await screen.findByRole('heading', { name: /Failure Log タイムライン/ });
    expect(heading).toBeInTheDocument();
    // AC-A2: heading level is h2 or h3
    expect(['H2', 'H3']).toContain(heading.tagName);
  });

  // AC-H1: bar elements exist in a11y tree
  it('AC-H1: renders bar elements with accessible labels for each date', async () => {
    installAllHarnessMocks();
    render(<HarnessDashboard />);
    // Wait for bars to appear. Each bar should have an aria-label like "2026-04-09: 1件"
    const bar1 = await screen.findByLabelText('2026-04-09: 1件');
    const bar2 = screen.getByLabelText('2026-04-10: 3件');
    expect(bar1).toBeInTheDocument();
    expect(bar2).toBeInTheDocument();
  });

  // AC-E3: empty entries shows "No data" message
  it('AC-E3: shows "No data" message when entries is empty', async () => {
    installAllHarnessMocks({ timeline: { entries: [] } });
    render(<HarnessDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/No data/i)).toBeInTheDocument();
    });
  });

  // AC-R1: timeline fetch error shows error message
  it('AC-R1: shows error message when timeline fetch fails', async () => {
    installFetch((url) => {
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse({ error: 'boom' }, 500);
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse(MOCK_FAILURE_LOG);
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse(MOCK_EXEC_PLANS);
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });

    render(<HarnessDashboard />);

    await waitFor(() => {
      const section = screen.getByTestId('section-failure-log-timeline');
      expect(section.textContent ?? '').toMatch(/取得できません/);
    });
  });
});

describe('App navigation', () => {
  it('AC-H: renders a navigation with Docs and Harness labels inside a <nav>', async () => {
    installFetch((url) => {
      if (url.includes('/api/files')) {
        return jsonResponse({ root: [] });
      }
      if (url.includes('/api/content')) {
        return textResponse('# hello');
      }
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse({ entries: [] });
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse({
          byStatus: {},
          byCategory: {},
          totalValid: 0,
          totalInvalid: 0,
        });
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse(MOCK_EXEC_PLANS);
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });

    render(<App />);

    const nav = await screen.findByRole('navigation');
    expect(nav).toBeInTheDocument();

    // Docs / Harness ボタンが nav 内にある
    const docsBtn = screen.getByRole('button', { name: 'Docs' });
    const harnessBtn = screen.getByRole('button', { name: 'Harness' });
    expect(nav.contains(docsBtn)).toBe(true);
    expect(nav.contains(harnessBtn)).toBe(true);
  });

  it('switches from Docs to Harness view on click and back', async () => {
    installFetch((url) => {
      if (url.includes('/api/files')) {
        return jsonResponse({ root: [] });
      }
      if (url.includes('/api/content')) {
        return textResponse('# hello');
      }
      if (url.includes('/api/harness/failure-log/timeline')) {
        return jsonResponse(MOCK_TIMELINE);
      }
      if (url.includes('/api/harness/failure-log')) {
        return jsonResponse(MOCK_FAILURE_LOG);
      }
      if (url.includes('/api/harness/exec-plans')) {
        return jsonResponse(MOCK_EXEC_PLANS);
      }
      if (url.includes('/api/harness/core-beliefs')) {
        return jsonResponse(MOCK_CORE_BELIEFS);
      }
      return jsonResponse({}, 500);
    });

    render(<App />);

    const user = userEvent.setup();
    const harnessBtn = await screen.findByRole('button', { name: 'Harness' });
    await user.click(harnessBtn);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Failure Log' }),
    ).toBeInTheDocument();
    // Docs 側の sidebar は消えている
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();

    const docsBtn = screen.getByRole('button', { name: 'Docs' });
    await user.click(docsBtn);

    // 3 見出しは消えて sidebar が戻る
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Failure Log' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });
});
