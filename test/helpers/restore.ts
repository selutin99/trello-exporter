import { RestoreStatus } from '../../src/restore/codes';
import { RestoreApi } from '../../src/restore/api';
import type { JournalStore, RestoreJournal } from '../../src/restore/types';
import { id, sourceBoard } from './snapshot';

export const workspaceId = id(700);
export const targetId = id(701);
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
  };
}

export function restorationFixture(intercept?: (call: RestoreCall) => Response | undefined) {
  const records = new Map<string, Record<string, unknown>>();
  const calls: RestoreCall[] = [];
  const source = {
    ...sourceBoard,
    idOrganization: workspaceId,
    organization: { id: workspaceId, displayName: 'Synthetic test Workspace' },
  };
  let sequence = 1000;
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
    if (call.method === 'GET') {
      if ([`/boards/${sourceBoard.id}`, '/boards/TEST0001'].includes(call.path)) result = source;
      else result = records.get(call.path);
    } else if (call.path === '/boards') {
      result = {
        id: targetId,
        shortLink: 'NEW00001',
        idOrganization: workspaceId,
        prefs: { permissionLevel: 'private' },
        closed: false,
        name: (body as Record<string, unknown>).name,
      };
      records.set(`/boards/${targetId}`, result as Record<string, unknown>);
    } else if (call.method === 'PUT') result = {};
    else {
      const created = id(sequence++);
      const data = body instanceof FormData ? { name: body.get('name') } : body;
      const type = call.path.split('/').at(-1)!;
      const parent = call.path.split('/')[2];
      const record: Record<string, unknown> = { ...data, id: created, idBoard: targetId };
      if (type === 'checklists') record.idCard = parent;
      if (type === 'customFields') {
        record.idModel = targetId;
        const options = JSON.parse((data as { options?: string }).options ?? '[]') as Record<
          string,
          unknown
        >[];
        record.options = options.map((option) => ({ ...option, id: id(sequence++) }));
      }
      records.set(`/${type}/${created}`, record);
      result = record;
    }
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
  return { api, store, records, calls, fetchImpl };
}
