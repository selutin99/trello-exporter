import { expect, test } from 'vitest';
import { boardSchema, parseResponse } from '../../src/api/schemas';
import { sourceBoard } from '../helpers/snapshot';

test('response projection strips private unknown properties and hides invalid response details', () => {
  expect(parseResponse(boardSchema, { ...sourceBoard, token: 'private' })).toEqual(sourceBoard);
  expect(() => parseResponse(boardSchema, { id: 'private-malformed-response' })).toThrow(
    'INVALID_RESPONSE',
  );
});
