import { expect, test } from 'vitest';
import { writeValue } from '../../../src/restore/merge/writes';
import { RestoreErrorCode } from '../../../src/restore/codes';

test('write payloads resolve tagged relationships and preserve user-authored IDs as literal text', () => {
  const value = { text: 'cards/source', values: [{ ref: 'cards/source' }, null, 42] };
  expect(writeValue(value, { 'cards/source': 'target' })).toEqual({
    text: 'cards/source',
    values: ['target', null, 42],
  });
  expect(value.values[0]).toEqual({ ref: 'cards/source' });
});

test('write references cannot fall back to a source ID when the current-board mapping is missing', () => {
  const value = { field: { ref: 'customFields/source' }, payload: { text: 'Literal' } };
  expect(() => writeValue(value, {})).toThrow(RestoreErrorCode.InvalidPlan);
  expect(writeValue(value, {}, false)).toEqual({ field: 'source', payload: { text: 'Literal' } });
});
