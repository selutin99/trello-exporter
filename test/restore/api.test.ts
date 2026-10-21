import { expect, test } from 'vitest';
import { restorationFixture, targetId, workspaceId } from '../helpers/restore';
import { sourceBoard, id } from '../helpers/snapshot';
import { RestoreResource } from '../../src/restore/codes';
import { ScopeError } from '../../src/api/errors';

test('context reads only the configured board and creation requests private empty defaults', async () => {
  const { api, calls } = restorationFixture();
  const context = await api.context(sourceBoard.id);
  expect(context.workspaceId).toBe(workspaceId);
  const target = await api.createBoard(context, 'Restored', 'Description');
  expect(target.id).toBe(targetId);
  expect(calls.find((call) => call.path === '/boards')?.body).toMatchObject({
    prefs_permissionLevel: 'private',
    defaultLists: false,
    defaultLabels: false,
    idOrganization: workspaceId,
  });
  expect(calls.some((call) => call.path.includes('/organizations/'))).toBe(false);
  await expect(api.context(id(999))).rejects.toThrow(ScopeError);
});

test('foreign parent IDs and moved cards cannot receive restored content', async () => {
  const { api, records, calls } = restorationFixture();
  const context = await api.context(sourceBoard.id);
  await api.createBoard(context, 'Restored', '');
  await expect(
    api.create(RestoreResource.List, sourceBoard.id, { name: 'blocked' }),
  ).rejects.toThrow(ScopeError);
  records.set(`/cards/${id(888)}`, { id: id(888), idBoard: sourceBoard.id });
  const before = calls.filter((call) => call.method !== 'GET').length;
  await expect(api.create(RestoreResource.Attachment, id(888), new FormData())).rejects.toThrow(
    ScopeError,
  );
  expect(calls.filter((call) => call.method !== 'GET')).toHaveLength(before);
  await expect(
    api.resumeTarget({ id: sourceBoard.id, name: '', workspaceId, url: '' }, context),
  ).rejects.toThrow();
});

test.each(['public', 'workspace', 'invalid response'])(
  'unsafe board creation response stops restoration: %s',
  async (kind) => {
    const { api } = restorationFixture((call) => {
      if (call.path !== '/boards') return;
      if (kind === 'invalid response') return new Response('{}');
      return new Response(
        JSON.stringify({
          id: targetId,
          shortLink: 'NEW00001',
          idOrganization: kind === 'workspace' ? id(999) : workspaceId,
          prefs: { permissionLevel: kind === 'public' ? 'public' : 'private' },
        }),
      );
    });
    await expect(
      api.createBoard(await api.context(sourceBoard.id), 'Restored', ''),
    ).rejects.toThrow();
  },
);
