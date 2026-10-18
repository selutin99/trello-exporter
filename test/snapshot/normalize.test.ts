import { expect, test } from 'vitest';
import {
  appendChecklists,
  appendComments,
  normalizeAttachment,
  normalizeCards,
  ordered,
  safeLink,
} from '../../src/snapshot/normalize';
import { createDemoCapture } from '../../src/demo/preview';
import {
  id,
  sourceAttachment,
  sourceCard,
  sourceChecklist,
  sourceComment,
} from '../helpers/snapshot';

test('safe links exclude executable URLs, credentials, signed queries, and malformed links', () => {
  for (const url of [
    'javascript:alert(1)',
    'file:///tmp/private',
    'https://user:pass@example.com',
    'https://example.com?X-Amz-Signature=secret',
    'https://example.com?token=secret',
    'bad',
  ])
    expect(safeLink(url)).toBeNull();
  expect(safeLink('https://example.com/docs?q=board')).toBe('https://example.com/docs?q=board');
  expect(safeLink('http://example.com')).toBe('http://example.com/');
});

test('upload metadata has a canonical link and does not serialize signed source URLs', () => {
  const upload = normalizeAttachment(sourceAttachment, id(3));
  expect(upload.url).toContain(`/cards/${id(3)}/attachments/${id(4)}/download/note.txt`);
  expect(JSON.stringify(upload)).not.toContain('never-export');
  expect(
    normalizeAttachment(
      { ...sourceAttachment, isUpload: false, url: 'https://example.com' },
      id(3),
    ),
  ).toMatchObject({ kind: 'external-link', size: null, url: 'https://example.com/' });
});

test('positions and ties produce contiguous, deterministic sibling order', () => {
  expect(
    ordered([
      { id: 'b', pos: 1 },
      { id: 'a', pos: 1 },
    ]).map((item) => item.id),
  ).toEqual(['a', 'b']);
  const cards = normalizeCards([
    sourceCard,
    { ...sourceCard, id: id(99), pos: 0 },
    { ...sourceCard, id: id(100), idList: id(999) },
  ]);
  expect(cards.map((card) => card.order)).toEqual([0, 1, 0]);
  expect(cards[0]?.id).toBe(id(99));
});

test('checklist membership and comment authors tolerate departed users without broken references', () => {
  const { snapshot } = createDemoCapture();
  snapshot.checklists = [];
  snapshot.checklistItems = [];
  snapshot.comments = [];
  appendChecklists(snapshot, [sourceChecklist]);
  expect(snapshot.checklistItems.every((item) => item.memberId === null)).toBe(true);
  appendComments(
    snapshot,
    [
      sourceComment,
      { ...sourceComment, id: id(99), date: '2020-01-01', memberCreator: null },
      { ...sourceComment, id: id(100) },
    ],
    id(3),
  );
  expect(snapshot.comments[0]).toMatchObject({
    id: id(99),
    authorId: null,
    authorDisplayName: null,
    order: 0,
  });
  expect(snapshot.comments.map((comment) => comment.order)).toEqual([0, 1, 2]);
});
