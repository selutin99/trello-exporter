import { expect, test } from 'vitest';
import { textChunks } from '../../src/shared/text';

test.each(['', 'abc', 'a🙂b🙂c', '🙂🙂🙂', 'a\n東京\r\n'])(
  'bounded text chunks preserve every code unit: %j',
  (text) => {
    for (const maximum of [2, 3, 4, 1000]) {
      const chunks = textChunks(text, maximum);
      expect(chunks.join('')).toBe(text);
      expect(chunks.every((chunk) => chunk.length <= maximum)).toBe(true);
      for (const chunk of chunks)
        expect(new TextDecoder().decode(new TextEncoder().encode(chunk))).toBe(chunk);
    }
  },
);

test.each([0, 1, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'invalid text limits are rejected: %j',
  (limit) => {
    expect(() => textChunks('text', limit)).toThrow(RangeError);
  },
);
