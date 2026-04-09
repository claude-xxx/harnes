import { resolve, relative, sep, isAbsolute } from 'node:path';
import { realpath } from 'node:fs/promises';

/**
 * Path traversal 防御。
 *
 * ユーザー入力の相対パスを `backend/content/` 配下に閉じ込める唯一の関数。
 * API ハンドラ (/api/content, /api/files) と再帰走査の両方で使い、
 * 判定ロジックの差分を作らないために 1 箇所に集約している。
 *
 * 拒否するパターン:
 *  - 絶対パス ("/etc/passwd", "C:\\Windows\\...")
 *  - `..` による親ディレクトリ参照（URL エンコード済みは hono 側がデコード）
 *  - シンボリックリンクで CONTENT_DIR の外に出るもの (realpath で検出)
 *  - null byte を含むパス
 *
 * 成功時は `backend/content/` 配下に解決済みの絶対パスを返す。
 * 失敗時は `InvalidPathError` を throw する。I/O エラー (ENOENT) は呼び出し側で扱う。
 *
 * core-beliefs/backend.md: "ファイルシステムアクセスは backend/content/ 以下に限定する"
 */

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

/**
 * 入力 `userPath` が `contentDir` のサブツリーに収まるかを静的に検証する。
 * シンボリックリンクは見ない (resolveWithinContent が別途 realpath する)。
 */
export function assertWithinContentDir(contentDir: string, userPath: string): string {
  if (userPath.length === 0) {
    throw new InvalidPathError('path is required');
  }
  if (userPath.includes('\0')) {
    throw new InvalidPathError('invalid path');
  }
  // UNC パスを明示拒否。Node の isAbsolute は POSIX ランタイムだと
  // "\\\\server\\share" を false と判定するため、ランタイム非依存にここで止める。
  // "//server/share" も同様 (path.posix.isAbsolute は true だが念のため明示)。
  if (userPath.startsWith('\\\\') || userPath.startsWith('//')) {
    throw new InvalidPathError('invalid path');
  }
  // 絶対パスは即拒否 (POSIX の "/foo" も Windows の "C:\\foo" も)
  if (isAbsolute(userPath)) {
    throw new InvalidPathError('invalid path');
  }

  const resolved = resolve(contentDir, userPath);
  // `contentDir` 自身 or その配下でなければ NG
  const rel = relative(contentDir, resolved);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new InvalidPathError('invalid path');
  }
  // rel にセパレータ越しの `..` が紛れ込まないこと (念のための二重チェック)
  if (rel.split(sep).includes('..')) {
    throw new InvalidPathError('invalid path');
  }
  return resolved;
}

/**
 * `assertWithinContentDir` に加えてシンボリックリンクを realpath で解決し、
 * 解決後も `contentDir` 配下であることを確認する。
 *
 * ファイルが存在しない場合 realpath が ENOENT を投げるので、呼び出し側は
 * NotFound として扱ってよい。
 */
export async function resolveWithinContent(contentDir: string, userPath: string): Promise<string> {
  const staticallySafe = assertWithinContentDir(contentDir, userPath);

  // contentDir 自体の realpath も解決しておかないと、contentDir 側がリンクのとき
  // 配下判定が壊れる。
  const realContentDir = await realpath(contentDir);
  const realResolved = await realpath(staticallySafe);

  const rel = relative(realContentDir, realResolved);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new InvalidPathError('invalid path');
  }
  return realResolved;
}
