import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { HealthSchema, ErrorSchema, ContentMarkdownSchema } from './schemas/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// content/ is at backend/content (one level above src/)
const CONTENT_DIR = resolve(__dirname, '..', 'content');

const healthRoute = createRoute({
  method: 'get',
  path: '/api/health',
  tags: ['system'],
  summary: 'Liveness probe',
  responses: {
    200: {
      description: 'Service is up',
      content: {
        'application/json': {
          schema: HealthSchema,
        },
      },
    },
  },
});

const contentRoute = createRoute({
  method: 'get',
  path: '/api/content',
  tags: ['content'],
  summary: 'Get the welcome Markdown document',
  description:
    'Returns the contents of `backend/content/welcome.md` as raw Markdown. ' +
    'Phase 1 wires a single fixed file; multi-file support is deferred to Phase 3.',
  responses: {
    200: {
      description: 'Markdown body of the welcome file',
      content: {
        'text/markdown': {
          schema: ContentMarkdownSchema,
        },
      },
    },
    500: {
      description: 'Failed to read the file from disk',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const app = new OpenAPIHono();

app.openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200));

app.openapi(contentRoute, async (c) => {
  try {
    const filePath = resolve(CONTENT_DIR, 'welcome.md');
    const text = await readFile(filePath, 'utf-8');
    return c.body(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  } catch (err) {
    console.error('Failed to read content:', err);
    return c.json({ error: 'failed to read content' }, 500);
  }
});

// OpenAPI spec & Swagger UI (both under /api so the Vite dev proxy picks them up)
app.doc('/api/openapi.json', {
  openapi: '3.1.0',
  info: {
    version: '0.1.0',
    title: 'Claude Code Dashboard API',
    description:
      'Backend API for the Claude Code Dashboard. ' +
      'All routes are defined from Zod schemas in src/schemas/api.ts as the single source of truth.',
  },
});

// Swagger UI is mounted via raw app.get() because it serves static HTML, not a
// JSON API contract. This is the documented carve-out in
// docs/core-beliefs/backend.md ("API は Zod スキーマを source of truth とする" /
// "例外 (carve-out)"). Do not add new raw app.get() handlers for endpoints that
// return structured JSON — those must go through createRoute + app.openapi().
app.get('/api/doc', swaggerUI({ url: '/api/openapi.json' }));
