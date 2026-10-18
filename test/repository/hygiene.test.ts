import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { expect, test } from 'vitest';

test('tracked files exclude generated dependencies, runtime data, and large binaries', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
  const forbidden =
    /(^|\/)(node_modules|dist|build|coverage|exports|backups|snapshots|import-reports|restore-jobs|tmp|\.idea|\.git)(\/|$)|(^|\/)\.env(?!\.example$)(\.|$)|\.(zip|pdf|xlsx|png|jpe?g|mp4|tsbuildinfo)$/i;
  for (const file of files) {
    const productIcon = /^src\/assets\/icons\/[a-z0-9-]+\.png$/.test(file);
    if (!productIcon)
      expect(file, `Unexpected tracked runtime/generated file: ${file}`).not.toMatch(forbidden);
    let size: number;
    try {
      size = statSync(file).size;
    } catch {
      continue;
    } // Staged removals during refactoring.
    expect(size, `Oversized tracked file: ${file}`).toBeLessThan(1024 * 1024);
  }
});
