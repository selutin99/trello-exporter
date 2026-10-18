export interface LocalFile {
  readonly size: number;
  stream(): ReadableStream<Uint8Array>;
}

/** Counts bytes without loading the entire file in memory or uploading it. */
export async function scanLocalFile(file: LocalFile, signal: AbortSignal): Promise<number> {
  signal.throwIfAborted();
  const reader = file.stream().getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
    }
    if (bytes !== file.size) throw Object.assign(new Error('FILE_SIZE_MISMATCH'), { code: 'FILE_SIZE_MISMATCH' });
    return bytes;
  } finally {
    signal.removeEventListener('abort', abort);
    // Also release the source on stream errors; cancellation failure is not diagnostic data.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
