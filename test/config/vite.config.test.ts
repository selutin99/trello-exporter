import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { legacyPages, pageNames, renderServiceUrls } from '../../vite.config';
import { serviceUrls } from '../../src/config/services';

test('HTML service placeholders resolve in scripts and repeated links without browser code', () => {
  const html =
    '<script src="%POWER_UP_SDK_URL%"></script><a href="%CONNECTED_APPS_URL%"></a><a href="%CONNECTED_APPS_URL%"></a><a href="%SUPPORT_ISSUES_URL%"></a>';
  const rendered = renderServiceUrls(html);
  expect(rendered).not.toContain('%');
  expect(rendered).toContain(`src="${serviceUrls.powerUpSdk}"`);
  expect(rendered.match(/manage-profile\/apps/g)).toHaveLength(2);
  expect(rendered).toContain(`href="${serviceUrls.supportIssues}"`);
});

test('legacy pages are identical built HTML, retaining absolute assets without redirects', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trello-exporter-build-test-'));
  try {
    await mkdir(join(directory, 'assets'));
    await mkdir(join(directory, 'pages'));
    for (const page of pageNames) {
      await writeFile(
        join(directory, 'pages', `${page}.html`),
        `<script src="/trello-exporter/assets/${page}-hashed.js"></script>`,
      );
    }
    const close = legacyPages(directory).closeBundle;
    expect(typeof close).toBe('function');
    if (typeof close !== 'function') throw new Error('Missing build hook');
    await (close as () => Promise<void>)();
    for (const page of pageNames) {
      expect(await readFile(join(directory, 'prototype', `${page}.html`), 'utf8')).toBe(
        await readFile(join(directory, `${page}.html`), 'utf8'),
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
