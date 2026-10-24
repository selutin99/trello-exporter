import { ProbeError } from './errors';
import { ProbeErrorCode } from '../shared/error-codes';
import { readByteChunks } from './stream';

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
  let bytes = 0;
  for await (const chunk of readByteChunks(file.stream(), signal)) bytes += chunk.byteLength;
  if (bytes !== file.size) throw new ProbeError(ProbeErrorCode.FileSizeMismatch);
  return bytes;
}
