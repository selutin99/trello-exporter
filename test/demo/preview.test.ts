import { expect, test } from 'vitest';
import { createDemoCapture, demoFileReader } from '../../src/demo/preview';
import { demoFiles } from '../../src/demo/data';

test('synthetic preview contains rich linked content and independently created attachment bytes', async () => {
  const capture = createDemoCapture();
  expect(capture.snapshot.cards).toHaveLength(6);
  expect(capture.snapshot.checklistItems).toHaveLength(19);
  expect(capture.snapshot.comments).toHaveLength(3);
  expect(capture.snapshot.cards.some((card) => card.closed)).toBe(false);
  expect(new Set(capture.snapshot.cards.map((card) => card.id)).size).toBe(6);
  const original = demoFiles();
  for (const attachment of capture.uploads.values()) {
    expect(await demoFileReader.file('', attachment, 1000)).toEqual(
      original.find((file) => file.name === attachment.name)?.bytes,
    );
  }
  const first = capture.uploads.values().next().value!;
  await expect(demoFileReader.file('', { ...first, name: 'unknown' }, 1000)).rejects.toThrow(
    'Unknown synthetic file',
  );
  capture.snapshot.cards[0]!.name = 'Changed';
  expect(createDemoCapture().snapshot.cards[0]?.name).not.toBe('Changed');
});
