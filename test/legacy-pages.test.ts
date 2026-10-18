import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { legacyPages, pageNames } from '../build/legacy-pages';

test('legacy pages are identical built HTML, retaining absolute assets without redirects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trello-exporter-build-test-'));
  try {
    await mkdir(join(directory, 'assets'));
    for (const page of pageNames) {
      await writeFile(join(directory, `${page}.html`), `<script src="/trello-exporter/assets/${page}-hashed.js"></script>`);
    }
    const close = legacyPages(directory).closeBundle;
    expect(typeof close).toBe('function');
    if (typeof close !== 'function') throw new Error('Missing build hook');
    await (close as () => Promise<void>)();
    for (const page of pageNames) {
      expect(await readFile(join(directory, 'prototype', `${page}.html`), 'utf8'))
        .toBe(await readFile(join(directory, `${page}.html`), 'utf8'));
    }
    expect(await readFile(join(directory, '.nojekyll'), 'utf8')).toBe('');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
