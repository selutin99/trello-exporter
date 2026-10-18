import { Zip, ZipPassThrough } from 'fflate';
import type { BoardReader } from '../api/reader';
import type { CapturedBoard } from './capture';
import { finishCapture } from './capture';
import { AttachmentKind, CoverageStatus, ExportStage, IssueCode } from './codes';
import { issue } from './normalize';
import { ApiError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import type { CaptureOptions, SnapshotFile } from './types';

export const MAXIMUM_ARCHIVE_BYTES = 250 * 1024 * 1024;

/**
 * Computes the digest of original, uncompressed file bytes
 * @param bytes - Bytes to hash
 * @returns Lowercase SHA-256 hexadecimal digest
 */
export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Packages a snapshot and available uploads with an integrity manifest
 * @param capture - Snapshot and private source metadata
 * @param reader - Scoped attachment download boundary
 * @param options - Cancellation and progress observer
 * @returns A ZIP blob; missing uploads are recorded as warnings inside the snapshot
 * @throws ScopeError for foreign ownership; the signal reason on cancellation
 */
export async function buildArchive(
  capture: CapturedBoard,
  reader: Pick<BoardReader, 'file'>,
  options: CaptureOptions = {},
): Promise<Blob> {
  const parts: BlobPart[] = [];
  const zip = new Zip((error, chunk) => {
    if (error) throw error;
    parts.push(new Uint8Array(chunk));
  });
  const files: SnapshotFile[] = [];
  const { snapshot } = capture;
  const uploads = snapshot.attachments.filter(
    (attachment) => attachment.kind === AttachmentKind.Upload,
  );
  let used = 0;
  let downloaded = 0;
  try {
    for (const [index, attachment] of uploads.entries()) {
      options.signal?.throwIfAborted();
      options.onProgress?.({ stage: ExportStage.Files, current: index, total: uploads.length });
      const source = capture.uploads.get(attachment.id)!;
      try {
        const bytes = await reader.file(attachment.cardId, source, MAXIMUM_ARCHIVE_BYTES - used, {
          signal: options.signal,
        });
        options.signal?.throwIfAborted();
        if (bytes.length !== attachment.size) throw new ApiError(ApiErrorCode.InvalidResponse);
        const file = {
          path: `attachments/${attachment.id}/content`,
          size: bytes.length,
          sha256: await sha256(bytes),
        };
        attachment.file = file;
        files.push(file);
        addFile(zip, file.path, bytes);
        used += bytes.length;
        downloaded++;
      } catch (error) {
        options.signal?.throwIfAborted();
        if (!(error instanceof ApiError)) throw error;
        snapshot.issues.push(issue(IssueCode.FileUnavailable, 'attachmentFiles', attachment.id));
      }
    }
    snapshot.coverage.attachmentFiles = {
      status: downloaded === uploads.length ? CoverageStatus.Complete : CoverageStatus.Partial,
      count: downloaded,
    };
    finishCapture(snapshot);
    options.onProgress?.({ stage: ExportStage.Package, current: 0, total: 1 });
    const snapshotBytes = jsonBytes(snapshot);
    files.unshift({
      path: 'snapshot.json',
      size: snapshotBytes.length,
      sha256: await sha256(snapshotBytes),
    });
    addFile(zip, 'snapshot.json', snapshotBytes);
    addFile(
      zip,
      'manifest.json',
      jsonBytes({
        format: 'trello-exporter.archive',
        formatVersion: '0.1.0',
        snapshotId: snapshot.snapshotId,
        files,
      }),
    );
    options.signal?.throwIfAborted();
    zip.end();
    return new Blob(parts, { type: 'application/zip' });
  } catch (error) {
    zip.terminate();
    throw error;
  }
}

function addFile(zip: Zip, path: string, bytes: Uint8Array): void {
  const file = new ZipPassThrough(path);
  zip.add(file);
  file.push(bytes, true);
}

/**
 * Encodes portable JSON as UTF-8 without embedding file bytes
 * @param value - Serializable snapshot or manifest
 * @returns UTF-8 JSON bytes
 */
export function jsonBytes(value: unknown): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}
