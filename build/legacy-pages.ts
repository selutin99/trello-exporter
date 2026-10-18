import { copyFile, mkdir, rename, rmdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export const pageNames = ['connector', 'probe', 'authorize', 'privacy'] as const;

/** Keeps registered Power-Up and OAuth URLs valid after removing prototype sources.
 * Copies built HTML without redirects, so OAuth query/fragment data stays intact.
 */
export function legacyPages(outputDirectory: string): Plugin {
  return {
    name: 'legacy-power-up-pages',
    apply: 'build',
    async closeBundle() {
      await mkdir(resolve(outputDirectory, 'prototype'), { recursive: true });
      for (const page of pageNames) {
        await rename(resolve(outputDirectory, 'pages', `${page}.html`), resolve(outputDirectory, `${page}.html`));
        await copyFile(resolve(outputDirectory, `${page}.html`), resolve(outputDirectory, 'prototype', `${page}.html`));
      }
      await rmdir(resolve(outputDirectory, 'pages'));
      await writeFile(resolve(outputDirectory, '.nojekyll'), '');
    },
  };
}
