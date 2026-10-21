import { expect, test, vi } from 'vitest';
import { ExportSession } from '../../../src/app/export/session';
import { ExportFormat } from '../../../src/snapshot/codes';
import { ExportState } from '../../../src/app/export/types';
import { id, readerFixture } from '../../helpers/snapshot';

test('a session rejects concurrent work and late results after cancellation', async () => {
  const changed = vi.fn();
  const session = new ExportSession(changed);
  await session.prepare(null, '');
  session.selectFormat(ExportFormat.Json);
  const active = new AbortController();
  const { reader } = readerFixture(
    {},
    {
      getAccessToken: () =>
        new Promise((resolve) =>
          active.signal.addEventListener('abort', () => resolve('synthetic')),
        ),
    },
  );
  const pending = session.load(reader, id(1));
  expect(session.busy).toBe(true);
  session.selectFormat(ExportFormat.Zip);
  await session.load(reader, id(1));
  expect(session.model.format).toBe(ExportFormat.Json);
  session.cancel();
  active.abort();
  await pending;
  expect(session.model.state).toBe(ExportState.Cancelled);
  expect(session.model.board).toBeNull();
});

test('scope failure is distinct from a transport failure and no download is retained', async () => {
  const session = new ExportSession(() => {});
  await session.load(readerFixture().reader, id(99));
  expect(session.model.state).toBe(ExportState.ScopeFailed);
  const { reader } = readerFixture({}, { getAccessToken: async () => null });
  await session.load(reader, id(1));
  expect(session.model.state).toBe(ExportState.Failed);
  expect(session.model.result).toBeNull();
});

test('refreshing board information clears a previously prepared download', async () => {
  const session = new ExportSession(() => {});
  const { reader } = readerFixture();
  await session.load(reader, id(1));
  session.selectFormat(ExportFormat.Json);
  await session.prepare(reader, id(1));
  expect(session.model.result).not.toBeNull();
  await session.load(reader, id(1));
  expect(session.model.state).toBe(ExportState.Ready);
  expect(session.model.result).toBeNull();
});

test('format selection preserves an unavailable board outcome until the board can be loaded', async () => {
  const session = new ExportSession(() => {});
  await session.load(readerFixture().reader, id(99));
  session.selectFormat(ExportFormat.Csv);
  expect(session.model.state).toBe(ExportState.ScopeFailed);
  expect(session.model.board).toBeNull();
});
