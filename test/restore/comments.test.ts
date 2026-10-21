import { expect, test } from 'vitest';
import { commentSummaries } from '../../src/restore/comments';
import { createSyntheticCapture } from '../helpers/board-capture';
import { readImport } from '../../src/import/read';
import { jsonBytes } from '../../src/snapshot/encoding';
import { Locale } from '../../src/i18n';

test('comment summaries retain original text and attribution, splitting long comments without dropping content', async () => {
  const capture = createSyntheticCapture();
  const input = await readImport(new Blob([jsonBytes(capture.snapshot)]));
  const first = input.snapshot.comments[0]!;
  first.authorDisplayName = null;
  first.text = 'x'.repeat(25_000) + '🙂'.repeat(10_000);
  const chunks = commentSummaries(input, first.cardId, Locale.Russian);
  expect(chunks.length).toBe(5);
  expect(chunks.every((chunk) => chunk.length <= 10_000)).toBe(true);
  expect(chunks.join('')).toContain(first.text);
  for (const chunk of chunks)
    expect(new TextDecoder().decode(new TextEncoder().encode(chunk))).toBe(chunk);
});
