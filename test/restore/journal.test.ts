import { Locale } from '../../src/i18n/types';
// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from 'vitest';
import { LocalJournalStore, canResumeJournal, hasUncertainWrite } from '../../src/restore/journal';
import { RestoreStatus, RestoreError } from '../../src/restore/codes';
import { restoreJournal, workspaceId } from '../helpers/restore';
import { sourceBoard } from '../helpers/snapshot';

beforeEach(() => localStorage.clear());
test('local checkpoints round trip without retaining imported bytes or token providers', () => {
  const store = new LocalJournalStore(localStorage);
  expect(store.read()).toBeNull();
  const journal = restoreJournal();
  store.save(journal);
  expect(store.read()).toEqual(journal);
});

test.each([RestoreStatus.Cancelled, RestoreStatus.Unknown])(
  'pre-rebrand %s journals keep their continuation or uncertainty guard',
  (status) => {
    const previous = restoreJournal();
    previous.status = status;
    previous.pending = status === RestoreStatus.Unknown ? 'cards/uncertain' : null;
    localStorage.setItem('trello-exporter-restore-journal', JSON.stringify(previous));
    const journal = new LocalJournalStore(localStorage).read();
    const context = { boardId: sourceBoard.id, workspaceId, workspaceName: 'Synthetic Workspace' };
    expect(journal).toEqual(previous);
    expect(canResumeJournal(journal, previous.checksum, context)).toBe(
      status === RestoreStatus.Cancelled,
    );
    expect(hasUncertainWrite(journal)).toBe(status === RestoreStatus.Unknown);
  },
);
test('corrupt or unavailable storage is rejected with fixed errors', () => {
  const store = new LocalJournalStore(localStorage);
  localStorage.setItem('trello-exporter-restore-journal', '{}');
  expect(() => store.read()).toThrow(RestoreError);
  const blocked = new LocalJournalStore({
    getItem: vi.fn(() => {
      throw new Error('blocked');
    }),
    setItem: vi.fn(() => {
      throw new Error('private storage error');
    }),
  });
  expect(() => blocked.read()).toThrow(RestoreError);
  expect(() => blocked.save(restoreJournal())).toThrow(RestoreError);
});

test('continuation requires the same file and live context, an existing target, and a known unfinished result', () => {
  const journal = restoreJournal();
  const context = { boardId: sourceBoard.id, workspaceId, workspaceName: 'Synthetic Workspace' };
  expect(canResumeJournal(null, journal.checksum, context)).toBe(false);
  expect(canResumeJournal(journal, journal.checksum, context)).toBe(true);
  expect(canResumeJournal({ ...journal, target: null }, journal.checksum, context)).toBe(false);
  expect(canResumeJournal(journal, 'b'.repeat(64), context)).toBe(false);
  expect(canResumeJournal(journal, journal.checksum, { ...context, boardId: 'b'.repeat(24) })).toBe(
    false,
  );
  expect(
    canResumeJournal(journal, journal.checksum, { ...context, workspaceId: 'c'.repeat(24) }),
  ).toBe(false);
  expect(canResumeJournal({ ...journal, pending: 'cards/source' }, journal.checksum, context)).toBe(
    false,
  );
  for (const status of [
    RestoreStatus.Ready,
    RestoreStatus.Complete,
    RestoreStatus.Partial,
    RestoreStatus.Unknown,
  ])
    expect(canResumeJournal({ ...journal, status }, journal.checksum, context)).toBe(false);
  for (const status of [RestoreStatus.Cancelled, RestoreStatus.Failed])
    expect(canResumeJournal({ ...journal, status }, journal.checksum, context)).toBe(true);
});

test('comment locale survives local storage and legacy comment progress cannot be resumed by guessing', () => {
  const journal = restoreJournal();
  delete journal.commentLocale;
  journal.completed['comments/card-0'] = sourceBoard.id;
  const context = { boardId: sourceBoard.id, workspaceId, workspaceName: 'Synthetic Workspace' };
  expect(canResumeJournal(journal, journal.checksum, context)).toBe(false);
  journal.commentLocale = Locale.Russian;
  const store = new LocalJournalStore(localStorage);
  store.save(journal);
  const restored = store.read();
  expect(restored?.commentLocale).toBe(Locale.Russian);
  expect(canResumeJournal(restored, journal.checksum, context)).toBe(true);
  delete journal.completed['comments/card-0'];
  delete journal.commentLocale;
  journal.skipped.push('comments/card-0');
  expect(canResumeJournal(journal, journal.checksum, context)).toBe(false);
});

test('pending or unknown operations stay blocked even in legacy reports without a current target', () => {
  expect(hasUncertainWrite(null)).toBe(false);
  const journal = restoreJournal();
  expect(hasUncertainWrite(journal)).toBe(false);
  delete journal.mode;
  journal.target = null;
  journal.pending = 'cards/uncertain';
  expect(hasUncertainWrite(journal)).toBe(true);
  journal.pending = null;
  journal.status = RestoreStatus.Unknown;
  expect(hasUncertainWrite(journal)).toBe(true);
});
