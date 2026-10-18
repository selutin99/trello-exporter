import { afterEach, expect, test, vi } from 'vitest';
import { TestBoardApi } from '../../src/api';

const board = { id: 'a'.repeat(24), shortLink: 'TEST0001', name: 'Synthetic', closed: false };
afterEach(() => vi.useRealTimers());

test('default backoff honors Retry-After before sending another request', async () => {
  vi.useFakeTimers();
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify(board)));
  const api = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl,
  });
  const pending = api.verifyBoard();
  await vi.advanceTimersByTimeAsync(1999);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(await pending).toEqual(board);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('cancelling default backoff clears the timer and never retries', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 }));
  const api = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl,
  });
  const pending = api.verifyBoard({ signal: controller.signal });
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(1);
  controller.abort();
  await rejected;
  await vi.runAllTimersAsync();
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
