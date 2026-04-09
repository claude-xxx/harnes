import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

// Custom rule (Phase 2-D): forbid Node built-in imports from frontend source.
// Reason: the frontend runs in the browser and Vite cannot bundle Node built-ins.
// FE must talk to the backend exclusively via the /api HTTP boundary.
// See dashboard-app/docs/core-beliefs/infra.md.
//
// Error messages below are intentionally written for AI agents: every message
// states (1) what is wrong, (2) why it is forbidden, (3) the correct alternative,
// (4) which doc to read for context. Do not shorten them — that's the whole point.
const FORBIDDEN_NODE_BUILTINS = [
  'node:fs',
  'node:fs/promises',
  'node:path',
  'node:os',
  'node:child_process',
  'node:url',
  'fs',
  'fs/promises',
  'path',
  'os',
  'child_process',
];

const forbidNodeBuiltinsRule = [
  'error',
  {
    paths: FORBIDDEN_NODE_BUILTINS.map((name) => ({
      name,
      message:
        `Do not import "${name}" from frontend source. ` +
        'Reason: the frontend runs in the browser via Vite, which cannot bundle Node built-ins; ' +
        'this import will either fail at build time or silently break at runtime. ' +
        'Correct approach: call the backend through the /api HTTP boundary ' +
        '(e.g. `await fetch("/api/...")`), and have the backend perform any filesystem work. ' +
        'See dashboard-app/docs/core-beliefs/infra.md for the established dependency-direction rule.',
    })),
  },
];

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Apply only to runtime FE source. Build-time files like vite.config.ts
    // legitimately use Node built-ins and are intentionally excluded.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': forbidNodeBuiltinsRule,
    },
  },
]);
