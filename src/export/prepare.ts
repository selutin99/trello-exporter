import type { CapturedBoard } from '../snapshot/capture';
import { ExportFormat } from '../snapshot/codes';
import type { CaptureOptions } from '../snapshot/types';
import type { BoardReader } from '../api/reader';
import type { Locale } from '../i18n';
import { buildArchive } from '../snapshot/archive';
import { jsonBytes } from '../snapshot/encoding';

/**
 * Loads format-specific libraries only when selected and preserves one capture model
 * @param capture - Fresh active-board capture
 * @param format - Requested output
 * @param reader - Scoped file boundary used only for ZIP
 * @param locale - Language for generated labels
 * @param options - Cancellation and progress
 * @returns Prepared file bytes with an appropriate MIME type
 * @throws Format/transport errors or the cancellation signal reason
 */
export async function prepareExport(
  capture: CapturedBoard,
  format: ExportFormat,
  reader: Pick<BoardReader, 'file'>,
  locale: Locale,
  options: CaptureOptions = {},
): Promise<Blob> {
  options.signal?.throwIfAborted();
  switch (format) {
    case ExportFormat.Zip:
      return buildArchive(capture, reader, options);
    case ExportFormat.Json:
      return new Blob([jsonBytes(capture.snapshot)], { type: 'application/json;charset=utf-8' });
    case ExportFormat.Markdown:
      return (await import('./markdown')).markdownExport(capture.snapshot, locale);
    case ExportFormat.Csv:
      return (await import('./csv')).csvExport(capture.snapshot);
    case ExportFormat.Xlsx:
      return (await import('./xlsx')).xlsxExport(capture.snapshot, locale);
    case ExportFormat.Pdf:
      return (await import('./pdf')).pdfExport(capture.snapshot, locale);
  }
}
