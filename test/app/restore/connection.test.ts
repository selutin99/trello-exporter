// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { authorizeRestore, restoreConnection } from '../../../src/app/restore/connection';
import { RestoreErrorCode } from '../../../src/restore/codes';
import { deferred } from '../../helpers/deferred';
import { installSdk } from '../../helpers/browser';

afterEach(() => vi.unstubAllGlobals());

test('missing frame or SDK identity cannot resolve a merge writer', async () => {
  const { frame } = installSdk();
  const signal = new AbortController().signal;
  await expect(restoreConnection(null, signal)).rejects.toMatchObject({
    code: RestoreErrorCode.InvalidPlan,
  });
  frame.getContext.mockReturnValue({});
  await expect(restoreConnection(frame, signal)).rejects.toMatchObject({
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

test('the SDK board is the destination regardless of a previously configured board URL', async () => {
  const { restorationFixture } = await import('../../helpers/restore');
  const { sourceBoard } = await import('../../helpers/snapshot');
  const { frame } = installSdk();
  const fixture = restorationFixture();
  frame.getContext.mockReturnValue({ board: sourceBoard.id });
  vi.stubGlobal('fetch', fixture.fetchImpl);
  window.history.replaceState(null, '', '/export.html?board=OTHER001');
  const connection = await restoreConnection(frame, new AbortController().signal);
  expect(connection.context.boardId).toBe(sourceBoard.id);
  expect(fixture.calls.every((call) => !call.path.includes('OTHER001'))).toBe(true);
});
