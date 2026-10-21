import { Unzip, UnzipInflate } from 'fflate';
import { ImportError, ImportErrorCode } from './codes';

export const MAXIMUM_IMPORT_BYTES = 300 * 1024 * 1024;
export const MAXIMUM_JSON_BYTES = 16 * 1024 * 1024;
const MAXIMUM_ENTRIES = 10_000;
interface Entry {
  size: number;
  compressed: number;
  method: number;
}

function archiveError(): never {
  throw new ImportError(ImportErrorCode.InvalidArchive);
}
function limit(condition: boolean): void {
  if (!condition) throw new ImportError(ImportErrorCode.LimitExceeded);
}

function directory(bytes: Uint8Array<ArrayBuffer>): Map<string, Entry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  let end = bytes.length - 22;
  for (; end >= Math.max(0, bytes.length - 65557); end--) {
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
  }
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50) archiveError();
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    view.getUint16(end + 8, true) !== view.getUint16(end + 10, true)
  )
    archiveError();
  const count = view.getUint16(end + 10, true);
  limit(count > 0 && count <= MAXIMUM_ENTRIES);
  let offset = view.getUint32(end + 16, true);
  if (offset + view.getUint32(end + 12, true) !== end) archiveError();
  const entries = new Map<string, Entry>();
  let total = 0;
  for (let index = 0; index < count; index++) {
    const parsed = directoryEntry(bytes, view, offset, end, entries);
    total += parsed.entry.size;
    limit(total <= MAXIMUM_IMPORT_BYTES);
    entries.set(parsed.name, parsed.entry);
    offset = parsed.next;
  }
  if (offset !== end) archiveError();
  return entries;
}

function directoryEntry(
  bytes: Uint8Array<ArrayBuffer>,
  view: DataView,
  offset: number,
  end: number,
  existing: Map<string, Entry>,
): { name: string; entry: Entry; next: number } {
  if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) archiveError();
  const flags = view.getUint16(offset + 8, true);
  const method = view.getUint16(offset + 10, true);
  const compressed = view.getUint32(offset + 20, true);
  const size = view.getUint32(offset + 24, true);
  const nameSize = view.getUint16(offset + 28, true);
  const next =
    offset + 46 + nameSize + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  if (next > end || flags & 1 || ![0, 8].includes(method)) archiveError();
  const unixMode = view.getUint32(offset + 38, true) >>> 16;
  if ((unixMode & 0xf000) === 0xa000) archiveError();
  const name = new TextDecoder('utf-8', { fatal: true }).decode(
    bytes.subarray(offset + 46, offset + 46 + nameSize),
  );
  if (
    !/^(manifest\.json|snapshot\.json|attachments\/[a-zA-Z0-9_-]{1,128}\/content)$/.test(name) ||
    existing.has(name)
  )
    archiveError();
  const local = view.getUint32(offset + 42, true);
  if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) archiveError();
  const localNameSize = view.getUint16(local + 26, true);
  const localName = new TextDecoder('utf-8', { fatal: true }).decode(
    bytes.subarray(local + 30, local + 30 + localNameSize),
  );
  if (
    localName !== name ||
    view.getUint16(local + 8, true) !== method ||
    view.getUint16(local + 6, true) & 1
  )
    archiveError();
  if (local + 30 + localNameSize + view.getUint16(local + 28, true) + compressed > offset)
    archiveError();
  limit(size <= MAXIMUM_IMPORT_BYTES && size <= Math.max(1, compressed) * 200);
  if (name.endsWith('.json')) limit(size <= MAXIMUM_JSON_BYTES);
  return { name, entry: { size, compressed, method }, next };
}

/**
 * Extracts only bounded, unique project archive entries without touching the filesystem
 * @param bytes - Complete ZIP bytes
 * @param signal - Optional cancellation signal
 * @returns Original bytes keyed by validated relative paths
 * @throws ImportError for unsafe paths, symlinks, encryption, duplicate entries, bombs, or corrupt ZIP data
 * @throws The signal reason on cancellation
 */
export async function readZip(
  bytes: Uint8Array<ArrayBuffer>,
  signal?: AbortSignal,
): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
  try {
    limit(bytes.length <= MAXIMUM_IMPORT_BYTES);
    const expected = directory(bytes);
    const result = new Map<string, Uint8Array<ArrayBuffer>>();
    const started = new Set<string>();
    const unzip = new Unzip((file) => {
      const entry = expected.get(file.name);
      if (!entry || started.has(file.name) || file.compression !== entry.method) archiveError();
      started.add(file.name);
      const chunks: Uint8Array[] = [];
      let size = 0;
      file.ondata = (error, chunk, final) => {
        signal?.throwIfAborted();
        if (error) archiveError();
        size += chunk.length;
        if (size > entry.size) {
          file.terminate();
          archiveError();
        }
        chunks.push(chunk);
        if (final) {
          if (size !== entry.size) archiveError();
          const output = new Uint8Array(size);
          let offset = 0;
          for (const part of chunks) {
            output.set(part, offset);
            offset += part.length;
          }
          result.set(file.name, output);
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    const step = 64 * 1024;
    for (let offset = 0; offset < bytes.length; offset += step) {
      signal?.throwIfAborted();
      unzip.push(bytes.subarray(offset, offset + step), offset + step >= bytes.length);
      if (offset > 0 && offset % (step * 16) === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    if (result.size !== expected.size) archiveError();
    return result;
  } catch (error) {
    signal?.throwIfAborted();
    if (error instanceof ImportError) throw error;
    throw new ImportError(ImportErrorCode.InvalidArchive);
  }
}
