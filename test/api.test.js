import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, TestBoardApi } from '../prototype/api.js';

const board = { id: 'a'.repeat(24), shortLink: 'TEST0001', name: 'Synthetic', closed: false };
const list = { id: 'b'.repeat(24), idBoard: board.id };
const token = 'synthetic-test-token';
const ok = (value) => new Response(JSON.stringify(value), { status: 200 });

function setup(responses, extra = {}) {
  const calls = [];
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => token,
    pauseImpl: async () => {},
    fetchImpl: async (url, options) => {
      calls.push({ url, ...options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.ok(response, `Unexpected request: ${options.method} ${new URL(url).pathname}`);
      return response;
    },
    ...extra,
  });
  return { client, calls };
}

test('no collection calls occur before board verification; tokens stay out of URLs', async () => {
  const { client, calls } = setup([ok(board), ok([list])]);
  await assert.rejects(() => client.readLists(), { code: 'BOARD_NOT_VERIFIED' });
  assert.equal(calls.length, 0);
  await client.verifyBoard({ contextBoardId: board.id });
  await client.readLists();
  assert.ok(calls.every(call => !call.url.includes(token)));
  assert.equal(calls[0].headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[1].redirect, 'error');
  assert.equal(new URL(calls[1].url).searchParams.get('filter'), 'all');
});

test('writes are disabled by default, including for the test board', async () => {
  const { client, calls } = setup([ok(board)]);
  await client.verifyBoard();
  await assert.rejects(() => client.createTestList(), { code: 'WRITES_DISABLED' });
  assert.equal(calls.length, 1);
});

test('unknown list IDs cannot trigger even a read or write request', async () => {
  const { client, calls } = setup([ok(board)], { writesEnabled: true });
  await client.verifyBoard();
  await assert.rejects(() => client.createTestCard('f'.repeat(24)), { code: 'BOARD_SCOPE_BLOCKED' });
  assert.equal(calls.length, 1);
});

test('a previously known list moved to another board cannot receive a card', async () => {
  const { client, calls } = setup([ok(board), ok([list]),
    ok({ ...list, idBoard: 'f'.repeat(24) })], { writesEnabled: true });
  await client.verifyBoard();
  await client.readLists();
  await assert.rejects(() => client.createTestCard(list.id), { code: 'BOARD_SCOPE_BLOCKED' });
  assert.ok(calls.every(call => call.method === 'GET'));
});

test('read 429 retries are bounded; an uncertain POST is never retried', async () => {
  const { client, calls } = setup([
    new Response('', { status: 429, headers: { 'Retry-After': '0' } }), ok(board),
    new Response('', { status: 503 }),
  ], { writesEnabled: true });
  await client.verifyBoard();
  await assert.rejects(() => client.createTestList(), { code: 'WRITE_RESULT_UNKNOWN' });
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
});

test('long Retry-After stops the request instead of silently retrying early', async () => {
  const { client, calls } = setup([
    new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
  ]);
  await assert.rejects(() => client.verifyBoard(), { code: 'RATE_LIMIT_WAIT' });
  assert.equal(calls.length, 1);
});

test('network errors never leak transport details or tokens', async () => {
  const { client } = setup([new Error(`failed with ${token}`)]);
  await assert.rejects(() => client.verifyBoard(), error =>
    error instanceof ApiError && error.code === 'NETWORK_ERROR' && !error.message.includes(token));
});

test('a card is created only in a freshly verified source list', async () => {
  const card = { id: 'c'.repeat(24), idBoard: board.id, idList: list.id };
  const { client, calls } = setup([ok(board), ok([list]), ok(list), ok(card)], { writesEnabled: true });
  await client.verifyBoard();
  await client.readLists();
  assert.deepEqual(await client.createTestCard(list.id), card);
  assert.equal(JSON.parse(calls.at(-1).body).idList, list.id);
  assert.equal(new URL(calls.at(-1).url).pathname, '/1/cards');
});
