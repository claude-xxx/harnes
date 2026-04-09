import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// content/ is at backend/content (one level above src/)
const CONTENT_DIR = resolve(__dirname, '..', 'content');

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/api/content', async (c) => {
  try {
    const filePath = resolve(CONTENT_DIR, 'welcome.md');
    const text = await readFile(filePath, 'utf-8');
    return c.body(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  } catch (err) {
    console.error('Failed to read content:', err);
    return c.json({ error: 'failed to read content' }, 500);
  }
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[backend] listening on http://localhost:${info.port}`);
});
