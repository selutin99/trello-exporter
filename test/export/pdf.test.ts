import { afterEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { pdfExport } from '../../src/export/pdf';
import { createSyntheticCapture } from '../helpers/board-capture';
import { Locale } from '../../src/i18n';

afterEach(() => vi.unstubAllGlobals());
test('PDF embeds bundled fonts and produces paginated downloadable bytes for Russian and Japanese content', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const name = input.includes('symbols') ? 'noto-sans-symbols-2' : 'noto-sans-jp';
      const subset = input.includes('symbols') ? 'symbols' : 'japanese';
      return Promise.resolve(
        new Response(
          readFileSync(
            new URL(
              `../../node_modules/@fontsource/${name}/files/${name}-${subset}-400-normal.woff`,
              import.meta.url,
            ),
          ),
        ),
      );
    }),
  );
  const snapshot = createSyntheticCapture().snapshot;
  snapshot.board.name = 'Экспорт доски · café · 東京';
  snapshot.cards[0]!.description = 'Описание карточки\nПроверка переноса строк\n\u{1FFFF}';
  const blob = await pdfExport(snapshot, Locale.Russian);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(5000);
  if (process.env.EXPORT_QA_DIRECTORY) {
    await mkdir(process.env.EXPORT_QA_DIRECTORY, { recursive: true });
    await writeFile(`${process.env.EXPORT_QA_DIRECTORY}/board.pdf`, bytes);
  }
}, 15_000);
