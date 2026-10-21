import { z } from 'zod';
import type { Snapshot } from '../snapshot/types';
import { sha256 } from '../snapshot/encoding';
import { ImportError, ImportErrorCode } from './codes';
import { fileSchema, parseSnapshot } from './schema';
import { MAXIMUM_IMPORT_BYTES, MAXIMUM_JSON_BYTES, readZip } from './zip';

export interface ImportedBoard {
  snapshot: Snapshot;
  checksum: string;
  files: Map<string, Uint8Array<ArrayBuffer>>;
}
const manifestSchema = z.object({
  format: z.literal('trello-exporter.archive'),
  formatVersion: z.literal('0.1.0'),
  snapshotId: z.uuid(),
  files: z.array(fileSchema).max(10_000),
});

function json(bytes: Uint8Array): unknown {
  if (bytes.length > MAXIMUM_JSON_BYTES) throw new ImportError(ImportErrorCode.LimitExceeded);
  try {
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return value;
  } catch {
    throw new ImportError(ImportErrorCode.InvalidSnapshot);
  }
}

/**
 * Opens a project JSON/ZIP file and validates every manifest entry and attachment digest
 * @param file - User-selected local export
 * @param signal - Optional cancellation signal
 * @returns Validated board content and private file bytes
 * @throws ImportError for missing board data, unsupported versions, corrupt archives, or invalid integrity
 * @throws The signal reason on cancellation
 */
export async function readImport(file: Blob, signal?: AbortSignal): Promise<ImportedBoard> {
  signal?.throwIfAborted();
  if (file.size > MAXIMUM_IMPORT_BYTES) throw new ImportError(ImportErrorCode.LimitExceeded);
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  const checksum = await sha256(bytes);
  signal?.throwIfAborted();
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    const snapshot = parseSnapshot(json(bytes));
    if (snapshot.attachments.some((attachment) => attachment.file))
      throw new ImportError(ImportErrorCode.MissingData);
    return { snapshot, checksum, files: new Map() };
  }
  const entries = await readZip(bytes, signal);
  const manifestBytes = entries.get('manifest.json');
  const snapshotBytes = entries.get('snapshot.json');
  if (!manifestBytes || !snapshotBytes) throw new ImportError(ImportErrorCode.MissingData);
  const manifest = manifestSchema.safeParse(json(manifestBytes));
  if (!manifest.success) throw new ImportError(ImportErrorCode.InvalidArchive);
  const expected = new Set(manifest.data.files.map((entry) => entry.path));
  if (
    expected.size !== manifest.data.files.length ||
    expected.size !== entries.size - 1 ||
    !expected.has('snapshot.json')
  )
    throw new ImportError(ImportErrorCode.IntegrityFailed);
  for (const entry of manifest.data.files) {
    signal?.throwIfAborted();
    const value = entries.get(entry.path);
    if (!value || value.length !== entry.size)
      throw new ImportError(ImportErrorCode.IntegrityFailed);
    const digest = await sha256(value);
    signal?.throwIfAborted();
    if (digest !== entry.sha256) throw new ImportError(ImportErrorCode.IntegrityFailed);
  }
  const snapshot = parseSnapshot(json(snapshotBytes));
  if (manifest.data.snapshotId !== snapshot.snapshotId)
    throw new ImportError(ImportErrorCode.IntegrityFailed);
  validateInventory(snapshot, manifest.data.files, expected);
  signal?.throwIfAborted();
  entries.delete('manifest.json');
  entries.delete('snapshot.json');
  return { snapshot, checksum, files: entries };
}

function validateInventory(
  snapshot: Snapshot,
  files: z.infer<typeof fileSchema>[],
  expected: Set<string>,
): void {
  const inventory = new Map(files.map((entry) => [entry.path, entry]));
  const referenced = new Set(['snapshot.json']);
  for (const attachment of snapshot.attachments) {
    if (!attachment.file) continue;
    const fileEntry = inventory.get(attachment.file.path);
    if (
      !fileEntry ||
      referenced.has(fileEntry.path) ||
      fileEntry.sha256 !== attachment.file.sha256 ||
      fileEntry.size !== attachment.file.size ||
      attachment.size !== fileEntry.size
    )
      throw new ImportError(ImportErrorCode.IntegrityFailed);
    referenced.add(fileEntry.path);
  }
  if (referenced.size !== expected.size) throw new ImportError(ImportErrorCode.IntegrityFailed);
}
