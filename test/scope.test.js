import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoardReference, ScopeError, TestBoardScope } from '../prototype/scope.js';

const board = { id: 'a'.repeat(24), shortLink: 'TEST0001' };
const list = { id: 'b'.repeat(24), idBoard: board.id };

test('only an exact Trello board reference is accepted', () => {
  assert.equal(parseBoardReference('https://trello.com/b/TEST0001/example'), 'TEST0001');
  for (const value of ['', '../cards', 'TEST0001/anything',
    'https://example.com/b/TEST0001', 'https://trello.com/b/TEST0001?other=1',
    'https://trello.com/b/TEST0001/one/two']) {
    assert.throws(() => parseBoardReference(value), ScopeError);
  }
});

test('board context and source identity must match before it is bound', () => {
  const scope = new TestBoardScope(board.shortLink);
  assert.throws(() => scope.boardId, ScopeError);
  assert.throws(() => scope.bind({ ...board, shortLink: 'OTHER001' }), ScopeError);
  assert.throws(() => scope.bind(board, 'f'.repeat(24)), ScopeError);
  scope.bind(board, board.id);
  assert.equal(scope.boardId, board.id);
  assert.throws(() => scope.bind({ ...board, id: 'f'.repeat(24) }), ScopeError);
});

test('a foreign list poisons neither the allowlist nor part of a mixed response', () => {
  const scope = new TestBoardScope(board.shortLink);
  scope.bind(board);
  assert.throws(() => scope.rememberLists([list,
    { id: 'c'.repeat(24), idBoard: 'f'.repeat(24) }]), ScopeError);
  assert.throws(() => scope.assertKnownList(list.id), ScopeError);
  scope.rememberLists([list]);
  scope.assertKnownList(list.id);
  assert.throws(() => scope.assertKnownList('c'.repeat(24)), ScopeError);
});
