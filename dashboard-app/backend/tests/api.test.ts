import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';
import { HealthSchema, ContentMarkdownSchema } from '../src/schemas/api.js';

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

describe('GET /api/health', () => {
  it('returns 200 with a body matching HealthSchema', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = HealthSchema.parse(json);
    expect(parsed.status).toBe('ok');
  });
});

describe('GET /api/content', () => {
  it('returns 200 text/markdown with a body matching ContentMarkdownSchema', async () => {
    const res = await get('/api/content');
    expect(res.status).toBe(200);

    const contentType = res.headers.get('content-type') ?? '';
    expect(contentType).toContain('text/markdown');

    const text = await res.text();
    const parsed = ContentMarkdownSchema.parse(text);
    expect(parsed.length).toBeGreaterThan(0);
  });
});

describe('GET /api/openapi.json', () => {
  it('serves a valid OpenAPI 3.1 document covering both routes', async () => {
    const res = await get('/api/openapi.json');
    expect(res.status).toBe(200);

    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, unknown>;
    };

    expect(spec.openapi).toMatch(/^3\.1/);
    expect(spec.info.title).toBe('Claude Code Dashboard API');
    expect(spec.paths['/api/health']).toBeDefined();
    expect(spec.paths['/api/content']).toBeDefined();
  });
});
