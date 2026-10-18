import { test } from 'vitest';
import assert from 'node:assert/strict';
import { callbackStage, saveCallbackStage } from '../../src/core';

test('callback diagnostics accept only fixed stages and never persist arbitrary errors or URLs', () => {
  const saved: string[][] = [];
  const storage = { setItem: (...args: string[]) => saved.push(args) };
  saveCallbackStage('https://example.com/?code=secret', storage);
  saveCallbackStage(new Error('secret'), storage);
  saveCallbackStage('CALLBACK_COMPLETED', storage);
  assert.deepEqual(saved, [['exporter-callback-stage', 'CALLBACK_COMPLETED']]);
  assert.equal(callbackStage('secret'), null);
});
