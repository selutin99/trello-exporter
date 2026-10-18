import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { legacyPages, pageNames } from './build/legacy-pages.ts';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const pagesRoot = resolve(projectRoot, 'src/pages');
const outputDirectory = resolve(projectRoot, 'dist');

export default defineConfig({
  root: pagesRoot,
  base: '/trello-exporter/',
  publicDir: false,
  plugins: [legacyPages(outputDirectory)],
  server: {
    fs: {
      allow: ['src', 'packages', 'node_modules'].map(directory => resolve(projectRoot, directory)),
      deny: ['.env', '.env.*', '**/.git/**', '**/exports/**', '**/backups/**', '**/snapshots/**', '**/import-reports/**', '**/restore-jobs/**', '**/tmp/**'],
    },
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: { input: pageNames.map(page => resolve(pagesRoot, `${page}.html`)) },
  },
});
