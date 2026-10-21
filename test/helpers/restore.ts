import { Locale } from '../../src/i18n';
import { buildMergePlan } from '../../src/restore/merge/planner';
import { MergeChoice, MergeConflictKind } from '../../src/restore/merge/types';
import type { ImportedBoard } from '../../src/import/read';
import type { Snapshot } from '../../src/snapshot/types';
import {
  children,
  seedRestoreRecords,
  readRestoreRecord,
  createRestoreRecord,
  updateRestoreRecord,
} from './restore-records';
import { RestoreMode, RestoreStatus } from '../../src/restore/codes';
import { RestoreApi } from '../../src/restore/api';
import type { JournalStore, RestoreJournal } from '../../src/restore/types';
import { id, sourceBoard } from './snapshot';

export const workspaceId = id(700);
export const targetId = sourceBoard.id;
export interface RestoreCall {
  method: string;
  path: string;
  body: Record<string, unknown> | FormData;
  headers: Headers;
}
export class MemoryJournal implements JournalStore {
  value: RestoreJournal | null = null;
  read(): RestoreJournal | null {
    return this.value ? structuredClone(this.value) : null;
  }
  save(journal: RestoreJournal): void {
    this.value = structuredClone(journal);
  }
}

export function restoreJournal(): RestoreJournal {
  const now = new Date().toISOString();
  return {
    format: 'trello-exporter.restore-report',
    formatVersion: '0.1.0',
    operationId: crypto.randomUUID(),
    checksum: 'a'.repeat(64),
    snapshotId: crypto.randomUUID(),
    sourceContextId: sourceBoard.id,
    workspaceId,
    target: {
      id: targetId,
      name: 'Synthetic restored board',
      workspaceId,
      url: 'https://trello.com/b/NEW00001',
    },
    startedAt: now,
    updatedAt: now,
    status: RestoreStatus.Running,
    pending: null,
    completed: {},
    skipped: [],
    warnings: [],
    error: null,
    mode: RestoreMode.Merge,
    sourceBoardId: sourceBoard.id,
    bindings: {},
    decisions: {},
    planned: {},
    commentParts: {},
    commentLocale: Locale.English,
  };
}

export function restorationFixture(
  intercept?: (call: RestoreCall) => Response | undefined,
  initial?: Snapshot,
) {
  const records = new Map<string, Record<string, unknown>>();
  const calls: RestoreCall[] = [];
  const source = {
    ...sourceBoard,
    desc: initial?.board.description ?? 'Synthetic preview board',
    name: initial?.board.name ?? 'Studio launch',
    idOrganization: workspaceId,
    organization: { id: workspaceId, displayName: 'Synthetic test Workspace' },
  };
  records.set(`/boards/${targetId}`, source);
  if (initial) seedRestoreRecords(records, initial);
  let sequence = 10000;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin !== 'https://api.trello.com') throw new Error('Foreign API origin');
    const body: Record<string, unknown> | FormData =
      init?.body instanceof FormData
        ? init.body
        : (JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<
            string,
            unknown
          >);
    const call = {
      method: init?.method ?? 'GET',
      path: url.pathname.slice(2),
      body,
      headers: new Headers(init?.headers),
    };
    calls.push(call);
    const interrupted = intercept?.(call);
    if (interrupted) return interrupted;
    let result: unknown;
    if (call.path === '/boards' || call.method === 'DELETE')
      throw new Error('Forbidden fixture mutation');
    if (call.method === 'GET') {
      if (call.path === '/boards/TEST0001') result = source;
      else result = readRestoreRecord(records, call.path);
      if (Array.isArray(result)) {
        const before = url.searchParams.get('before');
        if (before) result = result.filter((item: { id: string }) => item.id < before);
      }
    } else if (call.method === 'PUT')
      result = updateRestoreRecord(records, call.path, body as Record<string, unknown>);
    else result = createRestoreRecord(records, call.path, body, id(sequence++));
    if (result === undefined)
      throw new Error(`Unexpected fixture request: ${call.method} ${call.path}`);
    return new Response(JSON.stringify(result));
  };
  const api = new RestoreApi({
    boardReference: 'TEST0001',
    getAccessToken: async () => 'synthetic-token',
    fetchImpl,
    pauseImpl: async () => {},
  });
  const store = new MemoryJournal();
  const plan = async (input: ImportedBoard, choice = MergeChoice.Snapshot) => {
    const context = await api.context(sourceBoard.id);
    const current = await api.snapshot(context);
    const previous = store.read();
    let result = buildMergePlan(input, current, previous?.decisions ?? {}, previous);
    const decisions = { ...result.decisions };
    for (const conflict of result.conflicts)
      if (conflict.kind === MergeConflictKind.Value) decisions[conflict.key] = choice;
    result = buildMergePlan(input, current, decisions, previous);
    return result;
  };
  return {
    api,
    store,
    records,
    calls,
    fetchImpl,
    plan,
    children: (path: string) => children(records, path),
  };
}
