import { HttpMethod } from '../../src/api/types';
import { ApiErrorCode } from '../../src/shared/error-codes';
import { expect, test, vi } from 'vitest';
import { ApiError, TestBoardApi } from '../../src/api';
import { Transport } from '../../src/api/transport';

const board = { id: 'a'.repeat(24), shortLink: 'TEST0001', name: 'Synthetic', closed: false };
const ok = (value: unknown) => new Response(JSON.stringify(value));

test('binary downloads enforce their byte budget and release the stream on failure', async () => {
  const transport = (response: Response) =>
    new Transport({
      boardReference: 'TEST0001',
      getAccessToken: async () => 'synthetic',
      fetchImpl: async () => response,
    });
  await expect(
    transport(new Response('oversized')).download('/scoped-test-download', 3),
  ).rejects.toMatchObject({ code: ApiErrorCode.InvalidResponse });
  await expect(
    transport(new Response(null)).download('/scoped-test-download', 3),
  ).rejects.toMatchObject({ code: ApiErrorCode.InvalidResponse });
  expect(await transport(new Response('abc')).download('/scoped-test-download', 3)).toEqual(
    new TextEncoder().encode('abc'),
  );
});

test('cancellation while acquiring a token prevents all HTTP requests', async () => {
  const controller = new AbortController();
  const fetchImpl = vi.fn<typeof fetch>();
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    fetchImpl,
    getAccessToken: async () => {
      controller.abort();
      return 'synthetic';
    },
  });
  await expect(client.verifyBoard({ signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('SDK errors containing credentials become a fixed authentication error', async () => {
  const fetchImpl = vi.fn<typeof fetch>();
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    fetchImpl,
    getAccessToken: async () => {
      throw new Error('https://example.invalid?code=synthetic-secret');
    },
  });
  await expect(client.verifyBoard()).rejects.toEqual(new ApiError(ApiErrorCode.AuthRequired));
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('cancellation while reading the response body preserves AbortError', async () => {
  const controller = new AbortController();
  const response = ok(board);
  vi.spyOn(response, 'json').mockImplementation(async () => {
    controller.abort();
    throw new Error('body aborted');
  });
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl: async () => response,
  });
  await expect(client.verifyBoard({ signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  });
});

test('retries stop after three GET attempts and never copy server error text', async () => {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response('synthetic-private-data', { status: 503 }));
  const pauseImpl = vi.fn(async () => {});
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl,
    pauseImpl,
  });
  await expect(client.verifyBoard()).rejects.toEqual(
    new ApiError(ApiErrorCode.RequestFailed, 503, HttpMethod.Get),
  );
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(pauseImpl.mock.calls).toHaveLength(2);
});

test('abort during retry backoff prevents a subsequent request', async () => {
  const controller = new AbortController();
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response('', { status: 429 }));
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl,
    pauseImpl: async () => {
      controller.abort();
    },
  });
  await expect(client.verifyBoard({ signal: controller.signal })).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test('only validated board fields leave the API facade', async () => {
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl: async () => ok({ ...board, privateField: 'excluded' }),
  });
  expect(await client.verifyBoard()).toEqual(board);
});

test.each([null, {}, { ...board, closed: 'false' }, { ...board, name: null }])(
  'malformed board response cannot bind scope: %j',
  async (value) => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => ok(value));
    const client = new TestBoardApi({
      boardReference: board.shortLink,
      getAccessToken: async () => 'synthetic',
      fetchImpl,
    });
    await expect(client.verifyBoard()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(client.readLists()).rejects.toMatchObject({ code: 'BOARD_NOT_VERIFIED' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  },
);

test('a malformed successful POST is uncertain and is never retried', async () => {
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(ok(board))
    .mockResolvedValueOnce(ok(null));
  const client = new TestBoardApi({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl,
    writesEnabled: true,
  });
  await client.verifyBoard();
  await expect(client.createTestList()).rejects.toMatchObject({ code: 'WRITE_RESULT_UNKNOWN' });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
});

test('cancellation when the final binary read completes cannot return a successful download', async () => {
  const active = new AbortController();
  const response = new Response(
    new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          active.abort();
          controller.close();
        },
      },
      { highWaterMark: 0 },
    ),
  );
  const transport = new Transport({
    boardReference: board.shortLink,
    getAccessToken: async () => 'synthetic',
    fetchImpl: async () => response,
  });
  await expect(
    transport.download('/scoped-test-download', 10, { signal: active.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test.each([HttpMethod.Post, HttpMethod.Put])(
  'cancellation during token acquisition never dispatches %s',
  async (method) => {
    const active = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>();
    const transport = new Transport({
      boardReference: board.shortLink,
      fetchImpl,
      getAccessToken: async () => {
        active.abort();
        return 'synthetic';
      },
    });
    await expect(
      transport.request(method, '/scoped-test-write', { signal: active.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  },
);

test.each([HttpMethod.Post, HttpMethod.Put])(
  'a cancelled body read after %s preserves write uncertainty without retries',
  async (method) => {
    const active = new AbortController();
    const response = ok({ id: board.id });
    vi.spyOn(response, 'json').mockImplementation(async () => {
      active.abort();
      throw new Error('Synthetic lost body');
    });
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
    const transport = new Transport({
      boardReference: board.shortLink,
      fetchImpl,
      getAccessToken: async () => 'synthetic',
    });
    await expect(
      transport.request(method, '/scoped-test-write', { signal: active.signal }),
    ).rejects.toMatchObject({ code: ApiErrorCode.WriteResultUnknown });
    expect(fetchImpl).toHaveBeenCalledOnce();
  },
);

test.each([HttpMethod.Post, HttpMethod.Put])(
  'an observed %s result is retained if cancellation follows dispatch',
  async (method) => {
    const active = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => {
      active.abort();
      return ok({ id: board.id });
    });
    const transport = new Transport({
      boardReference: board.shortLink,
      fetchImpl,
      getAccessToken: async () => 'synthetic',
    });
    expect(
      await transport.request(method, '/scoped-test-write', { signal: active.signal }),
    ).toEqual({ id: board.id });
    expect(fetchImpl).toHaveBeenCalledOnce();
  },
);
