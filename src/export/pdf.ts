import pdfMake from 'pdfmake/build/pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Snapshot } from '../snapshot/types';
import type { Locale } from '../i18n';
import { BlockKind, documentBlocks } from './document';
import { pdfFonts, pdfText } from './pdf-fonts';
import { translations } from '../i18n';

/**
 * Builds a locally rendered, paginated PDF with embedded Latin/Cyrillic and Japanese fonts
 * @param snapshot - Captured active board content
 * @param locale - Language for generated document labels
 * @returns A downloadable PDF; attachment names/links are text, without embedded files
 * @throws Error when bundled fonts or PDF generation are unavailable
 */
export async function pdfExport(snapshot: Snapshot, locale: Locale): Promise<Blob> {
  const fonts = await pdfFonts();
  let fallback = false;
  const content: Content[] = documentBlocks(snapshot, locale).map((block) => {
    let text = block.text;
    if (block.kind === BlockKind.Item) text = `[${block.checked ? 'x' : ' '}] ${text}`;
    const rendered = pdfText(text, fonts);
    fallback ||= rendered.fallback;
    return {
      text: rendered.runs,
      style: block.kind,
      margin: [0, 0, 0, 8],
      preserveLeadingSpaces: true,
    };
  });
  if (fallback)
    content.push({
      text: translations[locale].formatGlyphFallback,
      fontSize: 9,
      color: '#626f86',
      margin: [0, 16, 0, 0],
    });
  const definition: TDocumentDefinitions = {
    info: { title: snapshot.board.name, author: 'trello-exporter', subject: 'Board export' },
    pageSize: 'A4',
    pageMargins: [42, 42, 42, 44],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25, color: '#172b4d' },
    styles: {
      [BlockKind.Title]: { fontSize: 24, bold: true, margin: [0, 0, 0, 16] },
      [BlockKind.Section]: { fontSize: 18, bold: true, color: '#0c66e4', margin: [0, 16, 0, 10] },
      [BlockKind.Heading]: { fontSize: 13, bold: true, margin: [0, 12, 0, 8] },
      [BlockKind.Item]: { margin: [10, 0, 0, 4] },
    },
    footer: (current, total) => ({
      text: `${current} / ${total}`,
      alignment: 'right',
      margin: [42, 10, 42, 0],
      fontSize: 9,
      color: '#626f86',
    }),
    content,
  };
  return pdfMake.createPdf(definition).getBlob();
}
