import { expect, test } from 'vitest';
import { referencedKeys, resolveValue } from '../../../src/restore/merge/values';

test('only tagged relationships resolve; user-authored IDs remain literal in nested values', () => {
  const value = { text: 'cards/source', values: [{ ref: 'cards/source' }, null, 42] };
  const bindings = { 'cards/source': 'target' };
  expect(referencedKeys(value)).toEqual(['cards/source']);
  expect(resolveValue(value, bindings)).toEqual({
    text: 'cards/source',
    values: ['cards/target', null, 42],
  });
  expect(resolveValue(value, bindings, new Set(['cards/source']))).toEqual({
    text: 'cards/source',
    values: ['pending:cards/source', null, 42],
  });
  expect(value.values[0]).toEqual({ ref: 'cards/source' });
  expect(referencedKeys('customFields/source')).toEqual([]);
  expect(referencedKeys(null)).toEqual([]);
});
