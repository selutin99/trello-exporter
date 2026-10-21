import type { SourceChecklist, SourceComment } from '../../src/api/schemas';
import { CheckItemState, TrelloActionType } from '../../src/api/types';
import { BoardReader } from '../../src/api/reader';
import type { ClientOptions } from '../../src/api';

export const id = (value: number) => value.toString(16).padStart(24, '0');
export const sourceBoard = {
  id: id(1),
  shortLink: 'TEST0001',
  name: 'Synthetic board',
  desc: 'A synthetic board',
  closed: false,
  dateLastActivity: '2026-10-18T10:00:00Z',
};
export const sourceList = {
  id: id(2),
  idBoard: id(1),
  name: 'In progress',
  closed: false,
  pos: 16384,
};
export const sourceAttachment = {
  id: id(4),
  name: 'note.txt',
  isUpload: true,
  mimeType: 'text/plain',
  bytes: 4,
  pos: 1,
  url: 'https://trello.com/private?token=never-export',
};
export const sourceCard = {
  id: id(3),
  idBoard: id(1),
  idList: id(2),
  name: 'Synthetic card',
  desc: '**Unicode** café · 東京 · ✓',
  closed: false,
  pos: 100,
  start: null,
  due: '2026-11-20T12:00:00Z',
  dueComplete: true,
  idLabels: [id(5)],
  idMembers: [id(6)],
  cover: { idAttachment: id(4), color: null, size: 'normal', brightness: 'light' },
};
export const sourceChecklist: SourceChecklist = {
  id: id(7),
  idCard: id(3),
  name: 'Tasks',
  pos: 1,
  checkItems: [
    {
      id: id(8),
      name: 'Done ✓',
      pos: 2,
      state: CheckItemState.Complete,
      due: null,
      idMember: id(6),
    },
    { id: id(9), name: 'Next', pos: 1, state: CheckItemState.Incomplete },
  ],
};
export const sourceComment: SourceComment = {
  id: id(10),
  type: TrelloActionType.Comment,
  date: '2026-10-18T09:00:00Z',
  data: { text: 'A synthetic comment', board: { id: id(1) }, card: { id: id(3) } },
  memberCreator: { id: id(6), fullName: 'Demo reviewer' },
};
export const sourceField = {
  id: id(11),
  name: 'Priority',
  type: 'list',
  pos: 1,
  options: [{ id: id(12), value: { text: 'High' }, color: 'red', pos: 1 }],
};
export const sourceTextField = { id: id(13), name: 'Note', type: 'text', pos: 2 };

export const fixtureResponses: Record<string, unknown> = {
  '/1/boards/TEST0001': sourceBoard,
  [`/1/boards/${id(1)}`]: sourceBoard,
  [`/1/boards/${id(1)}/lists`]: [sourceList],
  [`/1/boards/${id(1)}/cards`]: [sourceCard],
  [`/1/boards/${id(1)}/labels`]: [{ id: id(5), name: 'Review', color: 'blue' }],
  [`/1/boards/${id(1)}/members`]: [
    {
      id: id(6),
      username: 'demo-reviewer',
      fullName: 'Demo reviewer',
      email: 'must-not-export@example.com',
    },
  ],
  [`/1/boards/${id(1)}/customFields`]: [sourceField, sourceTextField],
  [`/1/cards/${id(3)}`]: sourceCard,
  [`/1/cards/${id(3)}/checklists`]: [sourceChecklist],
  [`/1/cards/${id(3)}/actions`]: [sourceComment],
  [`/1/cards/${id(3)}/attachments`]: [sourceAttachment],
  [`/1/cards/${id(3)}/customFieldItems`]: [
    { idCustomField: id(11), idValue: id(12) },
    { idCustomField: id(13), value: { text: 'Synthetic value' } },
  ],
};

export function readerFixture(
  overrides: Record<string, unknown> = {},
  options: Partial<ClientOptions> = {},
) {
  const calls: URL[] = [];
  const responses = { ...fixtureResponses, ...overrides };
  const reader = new BoardReader({
    boardReference: sourceBoard.shortLink,
    getAccessToken: async () => 'synthetic-token',
    pauseImpl: async () => {},
    fetchImpl: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      calls.push(url);
      if (init?.method !== 'GET') throw new Error('Export attempted a write');
      const value: unknown = responses[url.pathname];
      if (value instanceof Error) throw value;
      if (value instanceof Response) return value.clone();
      if (value === undefined) throw new Error(`Unexpected fixture path: ${url.pathname}`);
      return new Response(JSON.stringify(value));
    },
    ...options,
  });
  return { reader, calls };
}

export async function verifiedReader(overrides: Record<string, unknown> = {}) {
  const fixture = readerFixture(overrides);
  await fixture.reader.board(sourceBoard.id);
  await fixture.reader.lists();
  await fixture.reader.cards();
  return fixture;
}
