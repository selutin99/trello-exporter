// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { authorizeRestore, restoreConnection } from '../../../src/app/restore/connection';
import { RestoreErrorCode } from '../../../src/restore/codes';
import { deferred } from '../../helpers/deferred';
import { installSdk } from '../../helpers/browser';

afterEach(() => vi.unstubAllGlobals());

test('missing frame, source identity, or public configuration cannot resolve a restore writer', async () => {
  const { frame } = installSdk();
  const signal = new AbortController().signal;
  const href = 'https://example.invalid/export.html?board=TEST0001';
  for (const [sdk, url] of [
    [null, href],
    [frame, 'https://example.invalid/export.html'],
  ] as const)
    await expect(restoreConnection(sdk, url, signal)).rejects.toMatchObject({
      code: RestoreErrorCode.InvalidPlan,
    });
  frame.getContext.mockReturnValue({});
  await expect(restoreConnection(frame, href, signal)).rejects.toMatchObject({
    code: RestoreErrorCode.InvalidPlan,
  });
  await expect(authorizeRestore(null, signal)).rejects.toMatchObject({
    code: RestoreErrorCode.InvalidPlan,
  });
});

test.each([false, true])(
  'cancelled OAuth waits release the caller and consume late SDK results: reject=%s',
  async (reject) => {
    const { frame, client } = installSdk();
    const consent = deferred<void>();
    client.authorize.mockReturnValue(consent.promise);
    const active = new AbortController();
    const operation = authorizeRestore(frame, active.signal);
    active.abort();
    await expect(operation).rejects.toMatchObject({ name: 'AbortError' });
    if (reject) consent.reject(new Error('private-sdk-detail'));
    else consent.resolve();
    await Promise.resolve();
  },
);
