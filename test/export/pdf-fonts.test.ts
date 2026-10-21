import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';
import { FormatErrorCode } from '../../src/export/errors';

afterEach(() => vi.unstubAllGlobals());
function response(input: string): Response {
  const name = input.includes('symbols') ? 'noto-sans-symbols-2' : 'noto-sans-jp';
  const subset = input.includes('symbols') ? 'symbols' : 'japanese';
  return new Response(
    readFileSync(
      new URL(
        `../../node_modules/@fontsource/${name}/files/${name}-${subset}-400-normal.woff`,
        import.meta.url,
      ),
    ),
  );
}
test('font selection supplies real Latin/Cyrillic, Japanese, and symbol glyphs, with visible fallback for other code points', async () => {
  vi.resetModules();
  const fetcher = vi.fn((input: string) => Promise.resolve(response(input)));
  vi.stubGlobal('fetch', fetcher);
  const { pdfFonts, pdfText } = await import('../../src/export/pdf-fonts');
  const fonts = await pdfFonts();
  const text = pdfText('Русский café 東京 ✓\n\t', fonts);
  expect(text.fallback).toBe(false);
  expect(text.runs.map((run) => run.text).join('')).toBe('Русский café 東京 ✓\n\t');
  expect(
    pdfText('\u{1FFFF}', fonts)
      .runs.map((run) => run.text)
      .join(''),
  ).toBe('[U+1FFFF]');
  expect(pdfText('\u{1FFFF}', fonts).fallback).toBe(true);
  await pdfFonts();
  expect(fetcher).toHaveBeenCalledTimes(2);
});
test('failed font assets can be retried without caching a failed promise', async () => {
  vi.resetModules();
  const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
  vi.stubGlobal('fetch', fetcher);
  const { pdfFonts } = await import('../../src/export/pdf-fonts');
  await expect(pdfFonts()).rejects.toMatchObject({ code: FormatErrorCode.FontUnavailable });
  fetcher.mockImplementation((input: string) => Promise.resolve(response(input)));
  expect(await pdfFonts()).toHaveLength(3);
});
