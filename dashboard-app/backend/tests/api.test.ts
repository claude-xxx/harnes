import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';
import {
  HealthSchema,
  ContentMarkdownSchema,
  FileTreeSchema,
  type FileNode,
} from '../src/schemas/api.js';

/**
 * Contract tests: every assertion below validates that the live handler
 * returns a value matching the Zod schema in src/schemas/api.ts.
 *
 * If a future change makes the handler drift from the schema, these tests
 * fail BEFORE the OpenAPI spec drifts out of sync with reality.
 *
 * No HTTP server is started — we call app.fetch(new Request(...)) directly,
 * which avoids port conflicts and the Windows taskkill foot-gun (FL-001).
 */

const ORIGIN = 'http://localhost';

async function get(path: string): Promise<Response> {
  return app.fetch(new Request(`${ORIGIN}${path}`));
}

function flattenFilePaths(nodes: FileNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: FileNode[]) => {
    for (const n of ns) {
      if (n.type === 'file') out.push(n.path);
      else walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

describe('GET /api/health', () => {
  it('returns 200 with a body matching HealthSchema', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = HealthSchema.parse(json);
    expect(parsed.status).toBe('ok');
  });
});

describe('GET /api/files', () => {
  it('returns 200 with a tree matching FileTreeSchema and includes the sample files', async () => {
    const res = await get('/api/files');
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = FileTreeSchema.parse(json);

    const files = flattenFilePaths(parsed.root);
    expect(files).toContain('welcome.md');
    expect(files).toContain('commands/help.md');
    expect(files).toContain('tips/keybindings.md');
  });

  it('lists directories before files and returns forward-slash paths', async () => {
    const res = await get('/api/files');
    const json = (await res.json()) as { root: FileNode[] };
    const parsed = FileTreeSchema.parse(json);

    // ディレクトリが配列の先頭側に並ぶ (walkContent の仕様)
    const firstFileIdx = parsed.root.findIndex((n) => n.type === 'file');
    const lastDirIdx = parsed.root.map((n) => n.type).lastIndexOf('directory');
    if (firstFileIdx !== -1 && lastDirIdx !== -1) {
      expect(lastDirIdx).toBeLessThan(firstFileIdx);
    }

    // パスに逆スラッシュが混ざっていないこと (Windows で走らせたときの回帰防御)
    for (const p of flattenFilePaths(parsed.root)) {
      expect(p).not.toContain('\\');
    }
  });
});

describe('GET /api/content', () => {
  it('returns 200 text/markdown for ?path=welcome.md', async () => {
    const res = await get('/api/content?path=welcome.md');
    expect(res.status).toBe(200);

    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/markdown');

    const text = await res.text();
    const parsed = ContentMarkdownSchema.parse(text);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed).toContain('Welcome');
  });

  it('returns 200 for a nested file (subdirectory)', async () => {
    const res = await get('/api/content?path=commands/help.md');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('/help');
  });

  it('returns 400 when path query is missing', async () => {
    const res = await get('/api/content');
    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent file', async () => {
    const res = await get('/api/content?path=nope.md');
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('not found');
  });

  it('rejects path traversal with ../', async () => {
    const res = await get('/api/content?path=../../../etc/passwd');
    // 少なくとも CONTENT_DIR の外を読んでいないこと
    expect(res.status).not.toBe(200);
    // 具体的には 400 (invalid path) を期待
    expect(res.status).toBe(400);
  });

  it('rejects URL-encoded path traversal', async () => {
    const res = await get('/api/content?path=..%2F..%2Fetc%2Fpasswd');
    expect(res.status).not.toBe(200);
    expect(res.status).toBe(400);
  });

  it('rejects absolute paths', async () => {
    const res = await get('/api/content?path=/etc/passwd');
    expect(res.status).not.toBe(200);
    expect(res.status).toBe(400);
  });

  it('rejects UNC paths', async () => {
    const res = await get('/api/content?path=//server/share/file.md');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/openapi.json', () => {
  it('serves a valid OpenAPI 3.1 document covering all routes', async () => {
    const res = await get('/api/openapi.json');
    expect(res.status).toBe(200);

    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, { get?: { parameters?: Array<{ name: string; in: string }> } }>;
      components?: { schemas?: Record<string, unknown> };
    };

    expect(spec.openapi).toMatch(/^3\.1/);
    expect(spec.info.title).toBe('Claude Code Dashboard API');
    expect(spec.paths['/api/health']).toBeDefined();
    expect(spec.paths['/api/content']).toBeDefined();
    expect(spec.paths['/api/files']).toBeDefined();

    // /api/content の parameters に path クエリが含まれる
    const contentParams = spec.paths['/api/content']?.get?.parameters ?? [];
    const pathParam = contentParams.find((p) => p.name === 'path' && p.in === 'query');
    expect(pathParam).toBeDefined();

    // FileTree が components.schemas に登録されていること
    // (z.lazy + z.union で組んだ再帰スキーマが OpenAPI spec に漏れなく出ているかの回帰防御)
    const schemas = spec.components?.schemas ?? {};
    expect(schemas['FileTree']).toBeDefined();
  });
});
