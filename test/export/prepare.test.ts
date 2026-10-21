import { expect, test, vi } from 'vitest';
import { prepareExport } from '../../src/export/prepare';
import { ExportFormat } from '../../src/snapshot/codes';
import { Locale } from '../../src/i18n';
import { createSyntheticCapture, syntheticFileReader } from '../helpers/board-capture';
vi.mock('../../src/export/pdf', () => ({
  pdfExport: vi.fn(() =>
    Promise.resolve(new Blob(['%PDF-synthetic'], { type: 'application/pdf' })),
  ),
}));

test.each([
  ExportFormat.Json,
  ExportFormat.Zip,
  ExportFormat.Markdown,
  ExportFormat.Csv,
  ExportFormat.Xlsx,
  ExportFormat.Pdf,
])('format %s shares one capture and downloads files only for ZIP', async (format) => {
  const file = vi.fn(syntheticFileReader.file);
  const blob = await prepareExport(createSyntheticCapture(), format, { file }, Locale.English);
  expect(blob.size).toBeGreaterThan(0);
  expect(file).toHaveBeenCalledTimes(format === ExportFormat.Zip ? 3 : 0);
});
test('cancelled format preparation cannot return file bytes', async () => {
  const active = new AbortController();
  active.abort();
  await expect(
    prepareExport(
      createSyntheticCapture(),
      ExportFormat.Json,
      syntheticFileReader,
      Locale.English,
      {
        signal: active.signal,
      },
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
});
