import { HttpMethod } from '../../src/api/types';
import { expect, test, vi } from 'vitest';
import { RestoreCheckpoint } from '../../src/restore/checkpoint';
import { RestoreErrorCode, RestoreResource, RestoreWarning } from '../../src/restore/codes';
import { ApiError } from '../../src/api/errors';
import { ApiErrorCode } from '../../src/shared/error-codes';
import { Locale } from '../../src/i18n';
import { MemoryJournal, restoreJournal, targetId } from '../helpers/restore';

const options = { name: 'Synthetic restoration', locale: Locale.English };

test('a write is durably pending before creation, and a completed identity is reused', async () => {
  const journal = restoreJournal();
  const store = new MemoryJournal();
  const checkpoint = new RestoreCheckpoint(journal, () => store.save(journal), options);
  const create = vi.fn(async () => {
    expect(store.read()?.pending).toBe('lists/source');
    return targetId;
  });
  expect(await checkpoint.step(RestoreResource.List, 'source', create)).toBe(targetId);
  expect(store.read()?.pending).toBeNull();
  expect(checkpoint.mapped(RestoreResource.List, 'source')).toBe(targetId);
  expect(await checkpoint.step(RestoreResource.List, 'source', create)).toBe(targetId);
  expect(create).toHaveBeenCalledOnce();
  expect(() => checkpoint.mapped(RestoreResource.Card, 'missing')).toThrow(
    RestoreErrorCode.InvalidPlan,
  );
});

test('explicit optional omissions stay skipped while required resources reject inconsistent journals', async () => {
  const journal = restoreJournal();
  const checkpoint = new RestoreCheckpoint(journal, () => {}, options);
  const create = vi.fn(async () => {
    throw new ApiError(ApiErrorCode.RequestFailed, 403, HttpMethod.Post);
  });
  expect(await checkpoint.optionalStep(RestoreResource.Field, 'source', create)).toBeNull();
  expect(await checkpoint.optionalStep(RestoreResource.Field, 'source', create)).toBeNull();
  expect(journal.warnings).toEqual([RestoreWarning.Unsupported]);
  expect(journal.skipped).toEqual(['customFields/source']);
  expect(create).toHaveBeenCalledOnce();
  await expect(checkpoint.step(RestoreResource.Field, 'source', create)).rejects.toMatchObject({
    code: RestoreErrorCode.InvalidPlan,
  });
});

test('unknown writes remain pending, stop execution, and never become optional omissions', async () => {
  const journal = restoreJournal();
  const checkpoint = new RestoreCheckpoint(journal, () => {}, options);
  const create = vi.fn(async () => {
    throw new ApiError(ApiErrorCode.WriteResultUnknown);
  });
  await expect(
    checkpoint.optionalStep(RestoreResource.Attachment, 'source', create),
  ).rejects.toMatchObject({ code: ApiErrorCode.WriteResultUnknown });
  expect(create).toHaveBeenCalledOnce();
  expect(journal.pending).toBe('attachments/source');
  await expect(
    checkpoint.optionalStep(RestoreResource.Attachment, 'source', create),
  ).rejects.toMatchObject({ code: RestoreErrorCode.UnknownWrite });
  expect(create).toHaveBeenCalledOnce();
  expect(journal.skipped).toEqual([]);
});

test('progress observer failures cannot be mistaken for an optional content rejection', async () => {
  const journal = restoreJournal();
  const error = new ApiError(ApiErrorCode.RequestFailed, 403);
  const checkpoint = new RestoreCheckpoint(journal, () => {}, {
    ...options,
    onProgress: () => {
      throw error;
    },
  });
  const create = vi.fn(async () => targetId);
  await expect(checkpoint.optionalStep(RestoreResource.Field, 'source', create)).rejects.toBe(
    error,
  );
  expect(create).not.toHaveBeenCalled();
  expect(journal.skipped).toEqual([]);
});

test('cancellation from a progress observer never starts or checkpoints a write', async () => {
  const active = new AbortController();
  const journal = restoreJournal();
  const checkpoint = new RestoreCheckpoint(journal, () => {}, {
    ...options,
    signal: active.signal,
    onProgress: () => active.abort(),
  });
  const create = vi.fn(async () => targetId);
  await expect(checkpoint.step(RestoreResource.List, 'source', create)).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(create).not.toHaveBeenCalled();
  expect(journal.pending).toBeNull();
});
