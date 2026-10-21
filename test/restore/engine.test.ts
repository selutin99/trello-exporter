import { expect, test, vi } from 'vitest';
import { CoverageStatus } from '../../src/snapshot/codes';
import { ApiErrorCode } from '../../src/shared/error-codes';
import { commentSummaries } from '../../src/restore/comments';
import { RestoreEngine } from '../../src/restore/engine';
import {
  RestoreResource,
  RestoreStatus,
  RestoreWarning,
  RestoreErrorCode,
} from '../../src/restore/codes';
import { createSyntheticCapture, syntheticFileReader } from '../helpers/board-capture';
import { buildArchive, jsonBytes } from '../../src/snapshot/archive';
import { readImport } from '../../src/import/read';
import { Locale } from '../../src/i18n';
import { MemoryJournal, restorationFixture, targetId } from '../helpers/restore';
import { sourceBoard } from '../helpers/snapshot';

async function imported(zip = false) {
  const capture = createSyntheticCapture();
  return readImport(
    zip
      ? await buildArchive(capture, syntheticFileReader)
      : new Blob([jsonBytes(capture.snapshot)]),
  );
}
const options = { name: 'Restored synthetic board', locale: Locale.English };

test('JSON and ZIP restore content only into a new private board with mapped IDs', async () => {
  for (const zip of [false, true]) {
    const fixture = restorationFixture();
    const input = await imported(zip);
    const engine = new RestoreEngine(fixture.api, fixture.store);
    const report = await engine.run(input, await fixture.api.context(sourceBoard.id), options);
    expect(report.target?.id).toBe(targetId);
    expect(report.status).toBe(RestoreStatus.Partial);
    expect(Object.keys(report.completed).filter((key) => key.startsWith('cards/'))).toHaveLength(6);
    expect(
      Object.keys(report.completed).filter((key) => key.startsWith('checkItems/')),
    ).toHaveLength(19);
    expect(report.pending).toBeNull();
    const writes = fixture.calls.filter((call) => call.method !== 'GET');
    expect(writes.some((call) => call.path.includes(sourceBoard.id))).toBe(false);
    expect(writes.filter((call) => call.path.endsWith('/attachments'))).toHaveLength(zip ? 3 : 0);
    for (const call of writes.filter((call) => call.body instanceof FormData))
      expect(call.headers.has('Content-Type')).toBe(false);
    expect(JSON.stringify(report)).not.toContain('synthetic-token');
  }
});

test('an export without fidelity limitations can finish completely', async () => {
  const input = await imported();
  input.snapshot.cards.forEach((card) => {
    card.memberIds = [];
    card.cover = null;
  });
  input.snapshot.comments = [];
  input.snapshot.attachments = [];
  const fixture = restorationFixture();
  const report = await new RestoreEngine(fixture.api, fixture.store).run(
    input,
    await fixture.api.context(sourceBoard.id),
    options,
  );
  expect(report.status).toBe(RestoreStatus.Complete);
});

test('known failures retain the board and resume without creating duplicate objects', async () => {
  let blocked = true;
  const fixture = restorationFixture((call) =>
    call.method === 'POST' && call.path === '/cards' && blocked
      ? new Response('', { status: 403 })
      : undefined,
  );
  const input = await imported();
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const context = await fixture.api.context(sourceBoard.id);
  const failed = await engine.run(input, context, options);
  expect(failed.status).toBe(RestoreStatus.Failed);
  expect(failed.target?.id).toBe(targetId);
  blocked = false;
  const resumed = await engine.run(input, context, { ...options, resume: true });
  expect(resumed.status).toBe(RestoreStatus.Partial);
  expect(
    fixture.calls.filter((call) => call.path === '/boards' && call.method === 'POST'),
  ).toHaveLength(1);
  expect(
    fixture.calls.filter((call) => call.path.endsWith('/lists') && call.method === 'POST'),
  ).toHaveLength(3);
});

test('uncertain POST results are journalled and cannot be retried by continuation', async () => {
  const fixture = restorationFixture((call) =>
    call.method === 'POST' && call.path === '/cards'
      ? new Response('', { status: 503 })
      : undefined,
  );
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const report = await engine.run(input, context, options);
  expect(report.status).toBe(RestoreStatus.Unknown);
  expect(report.pending).toMatch(/^cards\//);
  await expect(engine.run(input, context, { ...options, resume: true })).rejects.toMatchObject({
    code: RestoreErrorCode.UnknownWrite,
  });
  expect(
    fixture.calls.filter((call) => call.path === '/cards' && call.method === 'POST'),
  ).toHaveLength(1);
});

test('optional destination restrictions produce explicit skipped content and partial status', async () => {
  const fixture = restorationFixture((call) =>
    call.method === 'POST' && call.path === '/customFields'
      ? new Response('', { status: 403 })
      : undefined,
  );
  const report = await new RestoreEngine(fixture.api, fixture.store).run(
    await imported(),
    await fixture.api.context(sourceBoard.id),
    options,
  );
  expect(report.status).toBe(RestoreStatus.Partial);
  expect(report.warnings).toContain(RestoreWarning.Unsupported);
  expect(report.skipped.some((key) => key.startsWith(RestoreResource.Field))).toBe(true);
});

test('unavailable storage and mismatched recovery input cannot create a board', async () => {
  const fixture = restorationFixture();
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const store = new MemoryJournal();
  store.save = () => {
    throw new Error('storage blocked');
  };
  await expect(
    new RestoreEngine(fixture.api, store).run(input, context, options),
  ).rejects.toThrow();
  await expect(
    new RestoreEngine(fixture.api, fixture.store).run(input, context, { ...options, resume: true }),
  ).rejects.toThrow();
  await expect(
    new RestoreEngine(fixture.api, fixture.store).run(input, context, { ...options, name: ' ' }),
  ).rejects.toThrow();
  expect(fixture.calls.every((call) => call.method === 'GET')).toBe(true);
});

test('cancellation keeps created content and stores a safe resumable checkpoint', async () => {
  const active = new AbortController();
  const fixture = restorationFixture();
  const report = await new RestoreEngine(fixture.api, fixture.store).run(
    await imported(),
    await fixture.api.context(sourceBoard.id),
    { ...options, signal: active.signal, onProgress: () => active.abort() },
  );
  expect([RestoreStatus.Cancelled, RestoreStatus.Unknown]).toContain(report.status);
  expect(report.target?.id).toBe(targetId);
  expect(fixture.calls.some((call) => call.method === 'DELETE')).toBe(false);
});

test('unset custom fields remain unset without sending a clearing update', async () => {
  const input = await imported();
  for (const value of input.snapshot.customFieldValues) {
    delete value.value;
    delete value.optionId;
  }
  const validated = await readImport(new Blob([jsonBytes(input.snapshot)]));
  const fixture = restorationFixture();
  const report = await new RestoreEngine(fixture.api, fixture.store).run(
    validated,
    await fixture.api.context(sourceBoard.id),
    options,
  );
  expect(report.status).toBe(RestoreStatus.Partial);
  expect(fixture.calls.some((call) => call.method === 'PUT')).toBe(false);
});

test('lost journal storage after creation keeps the target link and blocks blind continuation', async () => {
  const fixture = restorationFixture();
  const store = new MemoryJournal();
  const persist = store.save.bind(store);
  store.save = (journal) => {
    if (journal.target) throw new Error('Storage quota');
    persist(journal);
  };
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, store);
  const report = await engine.run(input, context, options);
  expect(report.status).toBe(RestoreStatus.Unknown);
  expect(report.target?.id).toBe(targetId);
  await expect(engine.run(input, context, { ...options, resume: true })).rejects.toThrow();
  expect(fixture.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
});

test('an uncertain journal cannot resume even when its pending key is absent', async () => {
  const fixture = restorationFixture((call) =>
    call.path === '/cards' && call.method === 'POST'
      ? new Response('', { status: 403 })
      : undefined,
  );
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(input, context, options);
  fixture.store.save({ ...report, status: RestoreStatus.Unknown, pending: null });
  const writes = fixture.calls.filter((call) => call.method !== 'GET').length;
  await expect(engine.run(input, context, { ...options, resume: true })).rejects.toMatchObject({
    code: RestoreErrorCode.UnknownWrite,
  });
  expect(fixture.calls.filter((call) => call.method !== 'GET')).toHaveLength(writes);
});

test('cancellation during a parent read is resumable without duplicating the board', async () => {
  const active = new AbortController();
  let cancelRead = true;
  const fixture = restorationFixture((call) => {
    if (cancelRead && call.method === 'GET' && call.path === `/boards/${targetId}`) {
      cancelRead = false;
      active.abort();
    }
  });
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(input, context, { ...options, signal: active.signal });
  expect(report.status).toBe(RestoreStatus.Cancelled);
  expect(report.pending).toBeNull();
  expect(fixture.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  const resumed = await engine.run(input, context, { ...options, resume: true });
  expect(resumed.status).toBe(RestoreStatus.Partial);
  expect(
    fixture.calls.filter((call) => call.method === 'POST' && call.path === '/boards'),
  ).toHaveLength(1);
});

test.each([false, true])(
  'cancellation after POST distinguishes observed and lost responses: lost=%s',
  async (lost) => {
    const active = new AbortController();
    const fixture = restorationFixture((call) => {
      if (call.method === 'POST' && call.path === '/cards') {
        active.abort();
        if (lost) throw new Error('Synthetic disconnected write');
      }
    });
    const input = await imported();
    const context = await fixture.api.context(sourceBoard.id);
    const engine = new RestoreEngine(fixture.api, fixture.store);
    const report = await engine.run(input, context, { ...options, signal: active.signal });
    const completedCards = Object.keys(report.completed).filter((key) => key.startsWith('cards/'));
    expect(report.status).toBe(lost ? RestoreStatus.Unknown : RestoreStatus.Cancelled);
    expect(completedCards).toHaveLength(lost ? 0 : 1);
    if (lost) {
      expect(report.error).toBe(ApiErrorCode.WriteResultUnknown);
      expect(report.pending).toMatch(/^cards\//);
      await expect(engine.run(input, context, { ...options, resume: true })).rejects.toMatchObject({
        code: RestoreErrorCode.UnknownWrite,
      });
    } else expect(report.pending).toBeNull();
    expect(
      fixture.calls.filter((call) => call.method === 'POST' && call.path === '/cards'),
    ).toHaveLength(1);
  },
);

test('rate-limited optional writes stop for continuation instead of becoming permanent omissions', async () => {
  let limited = true;
  const fixture = restorationFixture((call) =>
    limited && call.method === 'POST' && call.path === '/customFields'
      ? new Response('', { status: 429 })
      : undefined,
  );
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(input, context, options);
  expect(report.status).toBe(RestoreStatus.Failed);
  expect(report.skipped).toEqual([]);
  expect(report.pending).toBeNull();
  limited = false;
  const resumed = await engine.run(input, context, { ...options, resume: true });
  expect(resumed.status).toBe(RestoreStatus.Partial);
  expect(
    Object.keys(resumed.completed).filter((key) => key.startsWith('customFields/')),
  ).toHaveLength(2);
});

test('a temporary parent-read failure never skips an optional object', async () => {
  let failReads = false;
  const fixture = restorationFixture((call) =>
    failReads && call.method === 'GET' && call.path === `/boards/${targetId}`
      ? new Response('', { status: 503 })
      : undefined,
  );
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(input, context, {
    ...options,
    onProgress: ({ resource }) => {
      if (resource === RestoreResource.Field) failReads = true;
    },
  });
  expect(report.status).toBe(RestoreStatus.Failed);
  expect(report.skipped).toEqual([]);
  failReads = false;
  const resumed = await engine.run(input, context, { ...options, resume: true });
  expect(
    Object.keys(resumed.completed).filter((key) => key.startsWith('customFields/')),
  ).toHaveLength(2);
});

test('a timed-out optional POST remains unknown and cannot be continued blindly', async () => {
  const fixture = restorationFixture((call) =>
    call.method === 'POST' && call.path === '/customFields'
      ? new Response('', { status: 408 })
      : undefined,
  );
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(input, context, options);
  expect(report.status).toBe(RestoreStatus.Unknown);
  expect(report.pending).toMatch(/^customFields\//);
  expect(report.skipped).toEqual([]);
  await expect(engine.run(input, context, { ...options, resume: true })).rejects.toMatchObject({
    code: RestoreErrorCode.UnknownWrite,
  });
});

test('comment chunk continuation retains its original language and exact text boundaries', async () => {
  let writes = 0;
  const accepted = new Map<string, string[]>();
  const fixture = restorationFixture((call) => {
    if (call.method !== 'POST' || !call.path.endsWith('/actions/comments')) return;
    if (++writes === 2) return new Response('', { status: 401 });
    if (!(call.body instanceof FormData) && typeof call.body.text === 'string')
      accepted.set(call.path, [...(accepted.get(call.path) ?? []), call.body.text]);
  });
  const input = await imported();
  const comment = input.snapshot.comments[0]!;
  comment.text = '0123456789'.repeat(2500);
  const expected = commentSummaries(input, comment.cardId, Locale.English).join('');
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const failed = await engine.run(input, context, options);
  expect(failed.status).toBe(RestoreStatus.Failed);
  const resumed = await engine.run(input, context, {
    ...options,
    locale: Locale.Russian,
    resume: true,
  });
  expect(resumed.status).toBe(RestoreStatus.Partial);
  const cardId = failed.completed[`cards/${comment.cardId}`];
  expect(accepted.get(`/cards/${cardId}/actions/comments`)?.join('')).toBe(expected);
});

test('an unsafe successful board creation response retains an unresolved board checkpoint', async () => {
  const fixture = restorationFixture((call) =>
    call.method === 'POST' && call.path === '/boards'
      ? new Response(
          JSON.stringify({
            id: targetId,
            shortLink: 'NEW00001',
            idOrganization: sourceBoard.id,
            prefs: { permissionLevel: 'private' },
          }),
        )
      : undefined,
  );
  const report = await new RestoreEngine(fixture.api, fixture.store).run(
    await imported(),
    await fixture.api.context(sourceBoard.id),
    options,
  );
  expect(report.status).toBe(RestoreStatus.Unknown);
  expect(report.pending).toBe('board');
  expect(fixture.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
});

test('an already cancelled run cannot overwrite a previous recovery journal', async () => {
  const fixture = restorationFixture();
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const previous = {
    ...(await new RestoreEngine(fixture.api, fixture.store).run(input, context, options)),
    status: RestoreStatus.Unknown,
    pending: 'cards/unresolved',
  };
  fixture.store.save(previous);
  const active = new AbortController();
  active.abort();
  const before = fixture.calls.length;
  await expect(
    new RestoreEngine(fixture.api, fixture.store).run(input, context, {
      ...options,
      signal: active.signal,
    }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(fixture.store.read()).toEqual(previous);
  expect(fixture.calls).toHaveLength(before);
});

test('cancellation at the final verification cannot publish a successful result', async () => {
  const input = await imported();
  for (const section of [
    'lists',
    'cards',
    'labels',
    'members',
    'customFields',
    'customFieldValues',
    'checklists',
    'checklistItems',
    'comments',
    'attachments',
  ] as const) {
    input.snapshot[section] = [];
    input.snapshot.coverage[section] = { status: CoverageStatus.Complete, count: 0 };
  }
  const validated = await readImport(new Blob([jsonBytes(input.snapshot)]));
  const fixture = restorationFixture();
  const active = new AbortController();
  const verifyTarget = fixture.api.verifyTarget.bind(fixture.api);
  const verification = vi.spyOn(fixture.api, 'verifyTarget').mockImplementation(async (request) => {
    await verifyTarget(request);
    active.abort();
  });
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const report = await engine.run(validated, context, { ...options, signal: active.signal });
  expect(report.status).toBe(RestoreStatus.Cancelled);
  expect(report.pending).toBeNull();
  expect(report.target?.id).toBe(targetId);
  verification.mockRestore();
  expect((await engine.run(validated, context, { ...options, resume: true })).status).toBe(
    RestoreStatus.Complete,
  );
  expect(fixture.calls.filter((call) => call.method === 'POST')).toHaveLength(1);
});

test('repeated continuation never duplicates omissions from already visited cards', async () => {
  let cards = 0;
  const fixture = restorationFixture((call) => {
    if (call.method !== 'POST') return;
    if (call.path === '/customFields' || (call.path === '/cards' && ++cards > 1))
      return new Response('', { status: 403 });
  });
  const input = await imported();
  const context = await fixture.api.context(sourceBoard.id);
  const engine = new RestoreEngine(fixture.api, fixture.store);
  const failed = await engine.run(input, context, options);
  expect(failed.status).toBe(RestoreStatus.Failed);
  expect(failed.skipped.length).toBeGreaterThan(0);
  const resumed = await engine.run(input, context, { ...options, resume: true });
  expect(resumed.status).toBe(RestoreStatus.Failed);
  expect(resumed.skipped).toEqual(failed.skipped);
  expect(new Set(resumed.skipped).size).toBe(resumed.skipped.length);
});
