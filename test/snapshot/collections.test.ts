import { expect, test } from 'vitest';
import { groupRecords, orderedRecords } from '../../src/snapshot/collections';

test('grouping preserves source order and handles arbitrary parent identities safely', () => {
  const records = Object.freeze([
    { parent: '__proto__', order: 2 },
    { parent: 'other', order: 0 },
    { parent: '__proto__', order: 1 },
  ]);
  const groups = groupRecords(records, (record) => record.parent);
  expect([...groups.keys()]).toEqual(['__proto__', 'other']);
  expect(groups.get('__proto__')).toEqual([records[0], records[2]]);
  expect(orderedRecords(groups.get('__proto__') ?? [])).toEqual([records[2], records[0]]);
  expect(groups.get('__proto__')).toEqual([records[0], records[2]]);
  expect(groupRecords([], () => '')).toEqual(new Map());
});
