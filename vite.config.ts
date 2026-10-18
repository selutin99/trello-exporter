import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { copyFile, mkdir, rename, rmdir } from 'node:fs/promises';
import type { Plugin } from 'vite';
import { htmlServiceUrls } from './src/config/services.ts';

export const pageNames = ['connector', 'export', 'probe', 'authorize', 'privacy'] as const;

/**
 * Resolves public service links consistently in HTML without runtime JavaScript
 * @param html - Source HTML containing known service URL placeholders
 * @returns HTML with reviewed service URLs substituted
 */
export function renderServiceUrls(html: string): string {
  for (const [placeholder, url] of Object.entries(htmlServiceUrls)) {
    html = html.replaceAll(placeholder, url);
  }
  return html;
}

/**
 * Creates compatible HTML paths without redirecting OAuth query or fragment data
 * @param outputDirectory - Absolute production output directory
 * @returns A build plugin that moves HTML and creates legacy aliases
 */
export function legacyPages(outputDirectory: string): Plugin {
  return {
    name: 'legacy-power-up-pages',
    apply: 'build',
    async closeBundle() {
      await mkdir(resolve(outputDirectory, 'prototype'), { recursive: true });
      for (const page of pageNames) {
        await rename(
          resolve(outputDirectory, 'pages', `${page}.html`),
          resolve(outputDirectory, `${page}.html`),
        );
        await copyFile(
          resolve(outputDirectory, `${page}.html`),
          resolve(outputDirectory, 'prototype', `${page}.html`),
        );
      }
      await rmdir(resolve(outputDirectory, 'pages'));
    },
  };
}

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const pagesRoot = resolve(projectRoot, 'src/pages');
const outputDirectory = resolve(projectRoot, 'dist');

export default defineConfig({
  root: resolve(projectRoot, 'src'),
  appType: 'mpa',
  base: '/trello-exporter/',
  publicDir: false,
  plugins: [
    {
      name: 'service-url-config',
      transformIndexHtml: { order: 'pre', handler: renderServiceUrls },
    },
    legacyPages(outputDirectory),
  ],
  server: {
    fs: {
      allow: ['src', 'node_modules'].map((directory) => resolve(projectRoot, directory)),
      deny: [
        '.env',
        '.env.*',
        '**/.git/**',
        '**/exports/**',
        '**/backups/**',
        '**/snapshots/**',
        '**/import-reports/**',
        '**/restore-jobs/**',
        '**/tmp/**',
      ],
    },
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: { input: pageNames.map((page) => resolve(pagesRoot, `${page}.html`)) },
  },
});
