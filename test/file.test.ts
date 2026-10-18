import { expect, test, vi } from 'vitest';
import { scanLocalFile } from '../src/core';

test('streams a 200 MiB synthetic file with at most one chunk queued', async () => {
  const size = 200 * 1024 * 1024;
  const chunk = new Uint8Array(64 * 1024);
  let emitted = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (emitted === size) { controller.close(); return; }
      emitted += chunk.byteLength;
      controller.enqueue(chunk);
    },
  }, { highWaterMark: 1 });
  expect(await scanLocalFile({ size, stream: () => stream }, new AbortController().signal)).toBe(size);
  expect(stream.locked).toBe(false);
});

test('an incomplete stream fails the declared size check and releases its lock', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(2)); controller.close(); } });
  await expect(scanLocalFile({ size: 3, stream: () => stream }, new AbortController().signal)).rejects.toMatchObject({ code: 'FILE_SIZE_MISMATCH' });
  expect(stream.locked).toBe(false);
});

test('cancellation interrupts a pending stream read and cancels the source', async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({ cancel });
  const controller = new AbortController();
  const result = scanLocalFile({ size: 1, stream: () => stream }, controller.signal);
  controller.abort();
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(stream.locked).toBe(false);
});

test('an already cancelled check never opens the file', async () => {
  const controller = new AbortController();
  controller.abort();
  const stream = vi.fn();
  await expect(scanLocalFile({ size: 0, stream }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(stream).not.toHaveBeenCalled();
});

test('stream errors release the reader lock', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('synthetic failure')); } });
  await expect(scanLocalFile({ size: 1, stream: () => stream }, new AbortController().signal)).rejects.toThrow('synthetic failure');
  expect(stream.locked).toBe(false);
});
