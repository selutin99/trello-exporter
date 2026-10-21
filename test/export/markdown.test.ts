import { expect, test } from 'vitest';
import { markdownExport } from '../../src/export/markdown';
import { createSyntheticCapture } from '../helpers/board-capture';
import { Locale } from '../../src/i18n';

test('Markdown includes board/list/card structure and checkboxes while escaping active user markup', async () => {
  const snapshot = createSyntheticCapture().snapshot;
  snapshot.cards[0]!.description = '<script>alert(1)</script> [bad](javascript:alert(1))';
  const blob = markdownExport(snapshot, Locale.English);
  const text = await blob.text();
  expect(blob.type).toContain('text/markdown');
  expect(text).toContain('# Studio launch');
  expect(text).toContain('## Ideas');
  expect(text).toContain('### Plan the studio launch');
  expect(text.match(/^- \[[x ]\]/gm)).toHaveLength(19);
  expect(text).not.toContain('<script>');
  expect(text).toContain('&lt;script&gt;');
  expect(text).toContain('\\[bad\\]\\(javascript:alert\\(1\\)\\)');
});
