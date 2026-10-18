import js from '@eslint/js';
import css from '@eslint/css';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.idea/**',
    'exports/**',
    'backups/**',
    'snapshots/**',
    'import-reports/**',
    'restore-jobs/**',
    'tmp/**',
  ]),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/require-await': 'off' }, // Promise-shaped SDK/HTTP stubs.
  },
  { files: ['*.mjs'], extends: [js.configs.recommended] },
  { files: ['src/**/*.css'], language: 'css/css', plugins: { css }, extends: ['css/recommended'] },
]);
