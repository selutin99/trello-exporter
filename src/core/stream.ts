/**
 * Reads byte chunks with cancellation and exclusive ownership of the stream reader
 * @param stream - Local file or HTTP response body
 * @param signal - Optional cancellation of a pending read
 * @returns Chunks in source order without buffering the entire stream
 * @throws The source read error or signal reason; cleanup never replaces either
 */
export async function* readByteChunks(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<Uint8Array> {
  signal?.throwIfAborted();
  const reader = stream.getReader();
  // Cleanup discards unread bytes; its failure cannot recover data or replace the read outcome.
  const cancel = () => reader.cancel().catch(() => undefined);
  const abort = () => {
    void cancel();
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      signal?.throwIfAborted();
      const chunk = await reader.read();
      signal?.throwIfAborted();
      if (chunk.done) return;
      yield chunk.value;
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await cancel();
    reader.releaseLock();
  }
}
