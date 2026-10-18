import { ProbeError } from './errors';
import { ProbeErrorCode } from '../shared/error-codes';

export interface LocalFile {
  readonly size: number;
  stream(): ReadableStream<Uint8Array>;
}

/**
 * Counts bytes without buffering the entire file or uploading it
 * @param file - Local stream source and declared byte size
 * @param signal - Cancellation signal
 * @returns The verified number of bytes read
 * @throws ProbeError on a size mismatch; the stream error on read failure; the signal reason on cancellation
 */
export async function scanLocalFile(file: LocalFile, signal: AbortSignal): Promise<number> {
  signal.throwIfAborted();
  const reader = file.stream().getReader();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
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
    if (bytes !== file.size) throw new ProbeError(ProbeErrorCode.FileSizeMismatch);
    return bytes;
  } finally {
    signal.removeEventListener('abort', abort);
    // Also release the source on stream errors; cancellation failure is not diagnostic data.
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
