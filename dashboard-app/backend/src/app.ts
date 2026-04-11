import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, posix } from 'node:path';
import {
  HealthSchema,
  ErrorSchema,
  ContentMarkdownSchema,
  ContentQuerySchema,
  FileTreeSchema,
  SearchQuerySchema,
  SearchResultSchema,
  HarnessFailureLogSchema,
  HarnessExecPlansSchema,
  HarnessCoreBeliefsSchema,
  type FileNode,
} from './schemas/api.js';
import { resolveWithinContent, InvalidPathError } from './lib/safePath.js';
import {
  aggregateFailureLog,
  parseExecPlan,
  aggregateCoreBeliefs,
  type ExecPlanSummary,
  type CoreBeliefSummary,
} from './lib/harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// content/ is at backend/content (one level above src/)
const CONTENT_DIR = resolve(__dirname, '..', 'content');

// docs/ is at dashboard-app/docs (two levels above src/: src/ -> backend/ -> dashboard-app/)
const DOCS_DIR = resolve(__dirname, '..', '..', 'docs');

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
  summary: 'Get a Markdown file by relative path',
  description:
    'Returns the contents of `backend/content/<path>` as raw Markdown. ' +
    'The `path` query parameter is required and must be a forward-slash ' +
    'relative path within `backend/content/`. Path traversal (`..`, absolute ' +
    'paths, symlink escape) is rejected with 400.',
  request: {
    query: ContentQuerySchema,
  },
  responses: {
    200: {
      description: 'Markdown body of the requested file',
      content: {
        'text/markdown': {
          schema: ContentMarkdownSchema,
        },
      },
    },
    400: {
      description: 'Missing or invalid path',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: 'File not found',
      content: {
        'application/json': {
          schema: ErrorSchema,
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

const filesRoute = createRoute({
  method: 'get',
  path: '/api/files',
  tags: ['content'],
  summary: 'List the content tree',
  description:
    'Recursively enumerates Markdown files under `backend/content/` as a tree. ' +
    'Only `.md` files are listed. Dotfiles and symlinks escaping the content ' +
    'directory are ignored. Paths are forward-slash relative to content root.',
  responses: {
    200: {
      description: 'The file tree',
      content: {
        'application/json': {
          schema: FileTreeSchema,
        },
      },
    },
    500: {
      description: 'Failed to enumerate the content directory',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

/**
 * `backend/content/` を再帰的に走査して FileNode の配列を返す。
 * - `.md` 以外は列挙しない
 * - dotfile (`.` で始まるもの) は無視
 * - シンボリックリンクで CONTENT_DIR の外に出るエントリは走査から除外
 *   (resolveWithinContent が InvalidPathError を投げるのを catch する)
 */
async function walkContent(dirAbs: string, relDirPosix: string): Promise<FileNode[]> {
  const entries = await readdir(dirAbs, { withFileTypes: true });
  const nodes: FileNode[] = [];

  // 安定した順序で返す: ディレクトリ先 → ファイル、それぞれ名前順
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) {
      return a.isDirectory() ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    if (entry.name.startsWith('.')) continue;

    const childRel = relDirPosix === '' ? entry.name : posix.join(relDirPosix, entry.name);

    // resolveWithinContent に通すことで symlink 脱出を検出
    let safeAbs: string;
    try {
      safeAbs = await resolveWithinContent(CONTENT_DIR, childRel);
    } catch {
      // 外に出るリンクや壊れたリンクは静かにスキップ
      continue;
    }

    if (entry.isDirectory()) {
      const children = await walkContent(safeAbs, childRel);
      nodes.push({
        type: 'directory',
        name: entry.name,
        path: childRel,
        children,
      });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const fileStat = await stat(safeAbs);
      nodes.push({
        type: 'file',
        name: entry.name,
        path: childRel,
        modifiedAt: fileStat.mtime.toISOString(),
      });
    }
  }

  return nodes;
}

const searchRoute = createRoute({
  method: 'get',
  path: '/api/search',
  tags: ['content'],
  summary: 'Search content files by keyword',
  description:
    'Performs a case-insensitive keyword search across all Markdown files ' +
    'in `backend/content/`. Returns file paths, titles (first `# ` heading), ' +
    'and up to 3 matching lines per file.',
  request: {
    query: SearchQuerySchema,
  },
  responses: {
    200: {
      description: 'Search results (may be empty)',
      content: {
        'application/json': {
          schema: SearchResultSchema,
        },
      },
    },
    400: {
      description: 'Missing or empty query',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: 'Failed to search content',
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
    },
  },
});

/** ツリーからファイルの相対パスを平坦に集める */
function collectFilePaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  const walk = (ns: FileNode[]) => {
    for (const n of ns) {
      if (n.type === 'file') paths.push(n.path);
      else walk(n.children);
    }
  };
  walk(nodes);
  return paths;
}

/** Markdown の最初の `# ` 見出しを取得。なければファイル名を返す */
function extractTitle(text: string, fileName: string): string {
  for (const line of text.split('\n')) {
    if (line.startsWith('# ')) {
      return line.slice(2).trim();
    }
  }
  return fileName;
}

const MAX_MATCHES_PER_FILE = 3;

export const app = new OpenAPIHono();

app.openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200));

app.openapi(contentRoute, async (c) => {
  const { path: userPath } = c.req.valid('query');
  try {
    const filePath = await resolveWithinContent(CONTENT_DIR, userPath);
    const text = await readFile(filePath, 'utf-8');
    return c.body(text, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  } catch (err) {
    if (err instanceof InvalidPathError) {
      return c.json({ error: 'invalid path' }, 400);
    }
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json({ error: 'not found' }, 404);
    }
    console.error('Failed to read content:', err);
    return c.json({ error: 'failed to read content' }, 500);
  }
});

app.openapi(filesRoute, async (c) => {
  try {
    const root = await walkContent(CONTENT_DIR, '');
    return c.json({ root }, 200);
  } catch (err) {
    console.error('Failed to enumerate content:', err);
    return c.json({ error: 'failed to enumerate content' }, 500);
  }
});

app.openapi(searchRoute, async (c) => {
  const { q } = c.req.valid('query');
  try {
    const tree = await walkContent(CONTENT_DIR, '');
    const filePaths = collectFilePaths(tree);
    const queryLower = q.toLowerCase();

    const hits: Array<{ path: string; title: string; matches: string[] }> = [];

    for (const relPath of filePaths) {
      const absPath = await resolveWithinContent(CONTENT_DIR, relPath);
      const text = await readFile(absPath, 'utf-8');
      const lines = text.split('\n');
      const matchedLines: string[] = [];

      for (const line of lines) {
        if (line.toLowerCase().includes(queryLower)) {
          matchedLines.push(line.trim());
          if (matchedLines.length >= MAX_MATCHES_PER_FILE) break;
        }
      }

      if (matchedLines.length > 0) {
        const fileName = relPath.split('/').pop() ?? relPath;
        hits.push({
          path: relPath,
          title: extractTitle(text, fileName),
          matches: matchedLines,
        });
      }
    }

    return c.json({ query: q, hits }, 200);
  } catch (err) {
    console.error('Failed to search content:', err);
    return c.json({ error: 'failed to search content' }, 500);
  }
});

/* ------------------------------------------------------------------ */
/*                     /api/harness/* endpoints                        */
/* ------------------------------------------------------------------ */

const harnessFailureLogRoute = createRoute({
  method: 'get',
  path: '/api/harness/failure-log',
  tags: ['harness'],
  summary: 'Failure log aggregation',
  description:
    'Reads docs/failure-log.jsonl and returns counts aggregated by status and category. ' +
    'Malformed JSON lines are skipped silently.',
  responses: {
    200: {
      description: 'Aggregated failure log counts',
      content: { 'application/json': { schema: HarnessFailureLogSchema } },
    },
    500: {
      description: 'Failed to read or aggregate the failure log',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

const harnessExecPlansRoute = createRoute({
  method: 'get',
  path: '/api/harness/exec-plans',
  tags: ['harness'],
  summary: 'Exec plans summary',
  description:
    "Walks docs/exec-plans/active/ and docs/exec-plans/completed/ and returns each plan's " +
    'title, status, creation date, and completion date (when present).',
  responses: {
    200: {
      description: 'Exec plan entries grouped by active / completed',
      content: { 'application/json': { schema: HarnessExecPlansSchema } },
    },
    500: {
      description: 'Failed to walk the exec-plans directory',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

const harnessCoreBeliefsRoute = createRoute({
  method: 'get',
  path: '/api/harness/core-beliefs',
  tags: ['harness'],
  summary: 'Core beliefs summary',
  description:
    'Walks docs/core-beliefs/*.md and returns per-file counts of established principles and ' +
    'promotion candidates (top-level bullets under the respective sections).',
  responses: {
    200: {
      description: 'Per-file core-belief counts',
      content: { 'application/json': { schema: HarnessCoreBeliefsSchema } },
    },
    500: {
      description: 'Failed to walk the core-beliefs directory',
      content: { 'application/json': { schema: ErrorSchema } },
    },
  },
});

/** ENOENT を empty として扱いつつ、それ以外は呼び出し元に投げる readdir wrapper */
async function readdirOrEmpty(absDir: string): Promise<string[]> {
  try {
    const entries = await readdir(absDir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

app.openapi(harnessFailureLogRoute, async (c) => {
  try {
    // resolveWithinContent は realpath を呼ぶため存在しないパスで ENOENT を throw する。
    // exec-plans / core-beliefs ハンドラと同じく ENOENT を空入力として扱い、
    // 集計結果が常に一本道 (aggregateFailureLog(text)) になるようにする。
    let text = '';
    try {
      const absPath = await resolveWithinContent(DOCS_DIR, 'failure-log.jsonl');
      text = await readFile(absPath, 'utf-8');
    } catch (err) {
      if (
        !(err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT')
      ) {
        throw err;
      }
    }
    const agg = aggregateFailureLog(text);
    return c.json(agg, 200);
  } catch (err) {
    console.error('Failed to aggregate failure log:', err);
    return c.json({ error: 'failed to aggregate failure log' }, 500);
  }
});

app.openapi(harnessExecPlansRoute, async (c) => {
  try {
    const loadGroup = async (group: 'active' | 'completed'): Promise<ExecPlanSummary[]> => {
      const relDir = posix.join('exec-plans', group);
      // 静的 traversal check（ディレクトリ自体の検証）
      let absDir: string;
      try {
        absDir = await resolveWithinContent(DOCS_DIR, relDir);
      } catch (err) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          return [];
        }
        throw err;
      }
      const names = await readdirOrEmpty(absDir);
      names.sort((a, b) => a.localeCompare(b));
      const entries: ExecPlanSummary[] = [];
      for (const name of names) {
        const rel = posix.join(relDir, name);
        const fileAbs = await resolveWithinContent(DOCS_DIR, rel);
        const text = await readFile(fileAbs, 'utf-8');
        entries.push(parseExecPlan(text, name));
      }
      return entries;
    };

    const active = await loadGroup('active');
    const completed = await loadGroup('completed');
    return c.json({ active, completed }, 200);
  } catch (err) {
    console.error('Failed to load exec-plans:', err);
    return c.json({ error: 'failed to load exec-plans' }, 500);
  }
});

app.openapi(harnessCoreBeliefsRoute, async (c) => {
  try {
    let absDir: string;
    try {
      absDir = await resolveWithinContent(DOCS_DIR, 'core-beliefs');
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return c.json({ entries: [] }, 200);
      }
      throw err;
    }
    const names = await readdirOrEmpty(absDir);
    names.sort((a, b) => a.localeCompare(b));
    const entries: Array<CoreBeliefSummary & { file: string }> = [];
    for (const name of names) {
      const rel = posix.join('core-beliefs', name);
      const fileAbs = await resolveWithinContent(DOCS_DIR, rel);
      const text = await readFile(fileAbs, 'utf-8');
      const summary = aggregateCoreBeliefs(text, name);
      entries.push({ file: name, ...summary });
    }
    return c.json({ entries }, 200);
  } catch (err) {
    console.error('Failed to load core-beliefs:', err);
    return c.json({ error: 'failed to load core-beliefs' }, 500);
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
