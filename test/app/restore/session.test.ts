import { deferred } from '../../helpers/deferred';
import { expect, test, vi } from 'vitest';
import { RestoreSession } from '../../../src/app/restore/session';
import { RestoreMessage } from '../../../src/app/restore/types';
import { RestoreError, RestoreErrorCode, RestoreStatus } from '../../../src/restore/codes';
import { Locale } from '../../../src/i18n';
import { createSyntheticCapture } from '../../helpers/board-capture';
import { jsonBytes } from '../../../src/snapshot/encoding';
import { restorationFixture } from '../../helpers/restore';
import { sourceBoard } from '../../helpers/snapshot';

const file = () => new Blob([jsonBytes(createSyntheticCapture().snapshot)]);
async function setup() {
  const fixture = restorationFixture();
  const connection = { api: fixture.api, context: await fixture.api.context(sourceBoard.id) };
  const dependencies = {
    context: vi.fn(async () => connection),
    authorize: vi.fn(async (signal: AbortSignal) => {
      signal.throwIfAborted();
    }),
    store: () => fixture.store,
    changed: vi.fn(),
  };
  return { fixture, dependencies, session: new RestoreSession(dependencies) };
}

test('a restoration lifecycle can validate, connect, and run without a DOM or SDK', async () => {
  const { session, fixture, dependencies } = await setup();
  expect(await session.run(Locale.English)).toBe(false);
  await session.load(file());
  expect(session.model.context?.boardId).toBe(sourceBoard.id);
  expect(fixture.calls.every((call) => call.method === 'GET')).toBe(true);
  expect(dependencies.authorize).not.toHaveBeenCalled();
  await session.connect();
  expect(await session.run(Locale.English)).toBe(true);
  expect(session.model.report?.status).toBe(RestoreStatus.Partial);
  expect(session.model.previous).toEqual(session.model.report);
  expect(dependencies.authorize).toHaveBeenCalledTimes(2);
});

test('a late context response cannot turn cancelled file validation into a ready plan', async () => {
  const { session, dependencies, fixture } = await setup();
  const context = await fixture.api.context(sourceBoard.id);
  const pending = deferred<{ api: typeof fixture.api; context: typeof context }>();
  dependencies.context.mockReturnValueOnce(pending.promise);
  const loading = session.load(file());
  await vi.waitFor(() => expect(dependencies.context).toHaveBeenCalledOnce());
  const originalCalls = fixture.calls.length;
  await session.connect();
  expect(dependencies.authorize).not.toHaveBeenCalled();
  session.cancel();
  pending.resolve({ api: fixture.api, context });
  await loading;
  expect(session.model.busy).toBe(false);
  expect(session.model.message).toBe(RestoreMessage.Cancelled);
  expect(session.model.plan).toBeNull();
  expect(session.model.context).toBeNull();
  expect(fixture.calls).toHaveLength(originalCalls);
});

test('a cancelled consent cannot reach the engine even if its provider completes late', async () => {
  const { session, dependencies, fixture } = await setup();
  await session.load(file());
  const consent = deferred<void>();
  dependencies.authorize.mockReturnValueOnce(consent.promise);
  const running = session.run(Locale.English);
  session.cancel();
  consent.resolve();
  expect(await running).toBe(false);
  expect(session.model.message).toBe(RestoreMessage.Cancelled);
  expect(fixture.calls.every((call) => call.method === 'GET')).toBe(true);
});

test('journal read failure is visible while local preview remains available and writes stay blocked', async () => {
  const { session, fixture } = await setup();
  vi.spyOn(fixture.store, 'read').mockImplementation(() => {
    throw new Error('private-storage-detail');
  });
  expect(await session.load(file())).not.toBeNull();
  expect(session.model.message).toBe(RestoreMessage.JournalUnavailable);
  expect(await session.run(Locale.English)).toBe(false);
  expect(session.model.message).toBe(RestoreMessage.JournalUnavailable);
  expect(fixture.calls.every((call) => call.method === 'GET')).toBe(true);
});

test('cancelling a pending local file read releases the session and ignores its late result', async () => {
  const { session } = await setup();
  const input = file();
  const bytes = await input.arrayBuffer();
  const reading = deferred<ArrayBuffer>();
  vi.spyOn(input, 'arrayBuffer').mockReturnValue(reading.promise);
  const loading = session.load(input);
  session.cancel();
  expect(await loading).toBeNull();
  expect(session.busy).toBe(false);
  expect(session.model.message).toBe(RestoreMessage.Cancelled);
  const accepted = await session.load(file());
  expect(accepted).not.toBeNull();
  reading.resolve(bytes);
  await Promise.resolve();
  expect(session.model.imported).toBe(accepted);
  expect(session.model.message).toBe(RestoreMessage.Ready);
});

test('failed reanalysis invalidates the previous review and retains only local input', async () => {
  const { session, dependencies } = await setup();
  const input = await session.load(file());
  expect(session.model.plan).not.toBeNull();
  dependencies.context.mockRejectedValueOnce(new Error('private-context-detail'));
  await session.analyze();
  expect(session.model).toMatchObject({
    imported: input,
    current: null,
    context: null,
    plan: null,
    report: null,
    message: RestoreMessage.Unavailable,
  });
  expect(await session.run(Locale.English)).toBe(false);
  expect(dependencies.authorize).not.toHaveBeenCalled();
});

test('journal failure during comparison retains its distinct message', async () => {
  const { session, fixture } = await setup();
  vi.spyOn(fixture.store, 'read')
    .mockImplementation(() => {
      throw new RestoreError(RestoreErrorCode.JournalUnavailable);
    })
    .mockReturnValueOnce(null);
  expect(await session.load(file())).not.toBeNull();
  expect(session.model.message).toBe(RestoreMessage.JournalUnavailable);
  expect(session.model.plan).toBeNull();
  expect(await session.run(Locale.English)).toBe(false);
});
