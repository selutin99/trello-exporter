import { documentBlocks, BlockKind } from './document';
import type { Snapshot } from '../snapshot/types';
import type { Locale } from '../i18n';

const literal = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replace(/[\\`*_{}[\]()#+.!|~-]/g, '\\$&');

/**
 * Exports a self-contained Markdown document with literal, safe user content
 * @param snapshot - Captured active board content
 * @param locale - Language for generated labels
 * @returns UTF-8 Markdown with no embedded files or executable board HTML
 */
export function markdownExport(snapshot: Snapshot, locale: Locale): Blob {
  const text =
    documentBlocks(snapshot, locale)
      .map((block) => {
        const value = literal(block.text);
        switch (block.kind) {
          case BlockKind.Title:
            return `# ${value.replaceAll('\n', ' ')}`;
          case BlockKind.Section:
            return `## ${value.replaceAll('\n', ' ')}`;
          case BlockKind.Heading:
            return `### ${value.replaceAll('\n', ' ')}`;
          case BlockKind.Item:
            return `- [${block.checked ? 'x' : ' '}] ${value.replaceAll('\n', '\n  ')}`;
          default:
            return value.replaceAll('\n', '  \n');
        }
      })
      .join('\n\n') + '\n';
  return new Blob([text], { type: 'text/markdown;charset=utf-8' });
}
