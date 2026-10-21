import { expect, test } from 'vitest';
import { canonicalJson } from '../../src/shared/json';

test('canonical JSON ignores object insertion order while preserving array order and literal text', () => {
  const left = { b: ['東京', { z: null, a: 'cards/source' }], a: true };
  const right = { a: true, b: ['東京', { a: 'cards/source', z: null }] };
  expect(canonicalJson(left)).toBe(canonicalJson(right));
  expect(canonicalJson(left)).not.toBe(canonicalJson({ ...left, b: [...left.b].reverse() }));
  expect(JSON.parse(canonicalJson(left))).toEqual(left);
  expect(canonicalJson(undefined)).toBe('null');
});
