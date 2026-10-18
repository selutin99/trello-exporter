import { expect, test } from 'vitest';
import { ApiErrorCode, ProbeErrorCode, ScopeErrorCode } from '../../src/shared/error-codes';

test('named error enums preserve the serialized diagnostic contract', () => {
  expect(Object.values(ApiErrorCode)).toEqual([
    'AUTH_REQUIRED',
    'NETWORK_ERROR',
    'WRITE_RESULT_UNKNOWN',
    'INVALID_RESPONSE',
    'RATE_LIMIT_WAIT',
    'API_REQUEST_FAILED',
  ]);
  expect(Object.values(ScopeErrorCode)).toEqual([
    'BOARD_SCOPE_BLOCKED',
    'BOARD_NOT_VERIFIED',
    'WRITES_DISABLED',
  ]);
  expect(Object.values(ProbeErrorCode)).toEqual([
    'CHECK_FAILED',
    'FILE_SIZE_MISMATCH',
    'INVALID_CONFIG',
  ]);
});
