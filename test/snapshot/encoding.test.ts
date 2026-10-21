import { expect, test } from 'vitest';
import { jsonBytes, sha256 } from '../../src/snapshot/encoding';

test('snapshot encoding retains literal Unicode and stable JSON formatting', () => {
  const value = { name: 'Synthetic café 東京', description: '=literal' };
  expect(new TextDecoder().decode(jsonBytes(value))).toBe(JSON.stringify(value, null, 2));
});

test('checksums use original bytes and lowercase SHA-256', async () => {
  expect(await sha256(new TextEncoder().encode('abc'))).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});
