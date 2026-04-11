import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchFileTree,
  fetchContent,
  searchContent,
  fetchHarnessFailureLog,
  fetchHarnessExecPlans,
  fetchHarnessCoreBeliefs,
} from '../src/api';

// Global fetch のモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe('fetchFileTree', () => {
  it('returns parsed FileTree on 200', async () => {
    const tree = { root: [{ type: 'file', name: 'welcome.md', path: 'welcome.md' }] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(tree),
    });

    const result = await fetchFileTree();
    expect(result).toEqual(tree);
    expect(mockFetch).toHaveBeenCalledWith('/api/files');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fetchFileTree()).rejects.toThrow('HTTP 500');
  });
});

describe('fetchContent', () => {
  it('returns text on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('# Hello'),
    });

    const result = await fetchContent('welcome.md');
    expect(result).toBe('# Hello');
    expect(mockFetch).toHaveBeenCalledWith('/api/content?path=welcome.md');
  });

  it('URL-encodes the path parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('content'),
    });

    await fetchContent('commands/help.md');
    expect(mockFetch).toHaveBeenCalledWith('/api/content?path=commands%2Fhelp.md');
  });

  it('throws on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(fetchContent('nope.md')).rejects.toThrow('HTTP 404');
  });
});

describe('searchContent', () => {
  it('returns parsed SearchResult on 200', async () => {
    const result = { query: 'help', hits: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(result),
    });

    const res = await searchContent('help');
    expect(res).toEqual(result);
    expect(mockFetch).toHaveBeenCalledWith('/api/search?q=help');
  });

  it('URL-encodes the query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ query: 'キー', hits: [] }),
    });

    await searchContent('キー');
    expect(mockFetch).toHaveBeenCalledWith('/api/search?q=%E3%82%AD%E3%83%BC');
  });
});

describe('fetchHarnessFailureLog', () => {
  it('returns parsed body on 200', async () => {
    const body = {
      byStatus: { open: 1 },
      byCategory: { frontend: 1 },
      totalValid: 1,
      totalInvalid: 0,
    };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(body) });
    const res = await fetchHarnessFailureLog();
    expect(res).toEqual(body);
    expect(mockFetch).toHaveBeenCalledWith('/api/harness/failure-log');
  });

  it('throws on non-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });
    await expect(fetchHarnessFailureLog()).rejects.toThrow('HTTP 500');
  });

  it('throws on invalid shape', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await expect(fetchHarnessFailureLog()).rejects.toThrow(/invalid response shape/);
  });
});

describe('fetchHarnessExecPlans', () => {
  it('returns parsed body on 200', async () => {
    const body = { active: [], completed: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(body) });
    const res = await fetchHarnessExecPlans();
    expect(res).toEqual(body);
  });

  it('throws on invalid shape ({})', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await expect(fetchHarnessExecPlans()).rejects.toThrow(/invalid response shape/);
  });

  it('throws when active is not an array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ active: 'nope', completed: [] }),
    });
    await expect(fetchHarnessExecPlans()).rejects.toThrow(/invalid response shape/);
  });
});

describe('fetchHarnessCoreBeliefs', () => {
  it('returns parsed body on 200', async () => {
    const body = { entries: [] };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(body) });
    const res = await fetchHarnessCoreBeliefs();
    expect(res).toEqual(body);
  });

  it('throws on invalid shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ foo: 1 }),
    });
    await expect(fetchHarnessCoreBeliefs()).rejects.toThrow(/invalid response shape/);
  });
});
