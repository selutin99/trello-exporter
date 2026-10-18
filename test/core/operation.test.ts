import { test } from 'vitest';
import assert from 'node:assert/strict';
import { waitForOperation } from '../../src/core';

test('cancel releases a check even when the OAuth SDK never settles', async () => {
  const controller = new AbortController();
  const pending = waitForOperation(new Promise(() => {}), controller.signal);
  const result = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  await result;
});

test('a late SDK failure after cancellation is consumed and cannot change the result', async () => {
  const controller = new AbortController();
  let rejectSdk: (reason: Error) => void = () => {};
  const sdk = new Promise((_, reject) => {
    rejectSdk = reject;
  });
  const pending = waitForOperation(sdk, controller.signal);
  const result = assert.rejects(pending, { name: 'AbortError' });
  controller.abort();
  rejectSdk(new Error('Late SDK failure'));
  await result;
});
