import { expect, test, vi } from 'vitest';
import { readByteChunks } from '../../src/core/stream';

test('byte chunks retain source order and release the reader after completion', async () => {
  const chunks = [new Uint8Array([1, 2]), new Uint8Array([3])];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
  const received: Uint8Array[] = [];
  for await (const chunk of readByteChunks(stream)) received.push(chunk);
  expect(received).toEqual(chunks);
  expect(stream.locked).toBe(false);
});

test('stopping consumption early cancels unread bytes and releases ownership', async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
    },
    cancel,
  });
  for await (const chunk of readByteChunks(stream)) {
    expect(chunk).toEqual(new Uint8Array([1]));
    break;
  }
  expect(cancel).toHaveBeenCalledOnce();
  expect(stream.locked).toBe(false);
});

test('cleanup failure preserves a consumer failure without keeping the stream locked', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1]));
    },
    cancel() {
      throw new Error('synthetic cleanup failure');
    },
  });
  const failure = new Error('consumer failure');
  const consume = async () => {
    for await (const chunk of readByteChunks(stream)) {
      expect(chunk).toHaveLength(1);
      throw failure;
    }
  };
  await expect(consume()).rejects.toBe(failure);
  expect(stream.locked).toBe(false);
});

test('an already cancelled consumer never acquires the source reader', async () => {
  const active = new AbortController();
  active.abort('synthetic cancellation');
  const stream = new ReadableStream<Uint8Array>();
  const acquire = vi.spyOn(stream, 'getReader');
  await expect(readByteChunks(stream, active.signal).next()).rejects.toBe(active.signal.reason);
  expect(acquire).not.toHaveBeenCalled();
});
