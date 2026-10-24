import { expect, test, vi } from 'vitest';
import { zipSync, unzipSync, strFromU8 } from 'fflate';
import { createSyntheticCapture, syntheticFileReader } from '../helpers/board-capture';
import { buildArchive, jsonBytes, sha256 } from '../../src/snapshot/archive';
import { readImport } from '../../src/import/read';
import { ImportError, ImportErrorCode } from '../../src/import/codes';
import { MAXIMUM_IMPORT_BYTES, MAXIMUM_JSON_BYTES } from '../../src/import/zip';
import { ProductName } from '../../src/config/product';

const json = (value: unknown) => new Blob([jsonBytes(value)]);
async function archive() {
  return new Uint8Array(
    await (await buildArchive(createSyntheticCapture(), syntheticFileReader)).arrayBuffer(),
  );
}

test.each(Object.values(ProductName))(
  'JSON and ZIP retain compatible content and integrity for producer %s',
  async (name) => {
    for (const zipped of [false, true]) {
      const capture = createSyntheticCapture();
      capture.snapshot.exporter.name = name;
      const input = zipped
        ? await buildArchive(capture, syntheticFileReader)
        : json(capture.snapshot);
      const imported = await readImport(input);
      expect(imported.snapshot).toEqual(capture.snapshot);
      expect(imported.snapshot.exporter.name).toBe(name);
      expect(imported.files.size).toBe(zipped ? 3 : 0);
    }
  },
);

test('project JSON and ZIP exports round trip with checked original attachment bytes', async () => {
  const capture = createSyntheticCapture();
  const plain = await readImport(json(capture.snapshot));
  expect(plain.snapshot).toEqual(capture.snapshot);
  expect(plain.files.size).toBe(0);
  const bytes = await archive();
  const imported = await readImport(new Blob([bytes]));
  expect(imported.checksum).toBe(await sha256(bytes));
  expect(imported.files.size).toBe(3);
  expect(imported.snapshot.coverage.attachmentFiles?.count).toBe(3);
  for (const attachment of imported.snapshot.attachments)
    expect(imported.files.get(attachment.file!.path)?.length).toBe(attachment.size);
  await expect(readImport(json(imported.snapshot))).rejects.toMatchObject({
    code: ImportErrorCode.MissingData,
  });
});

test.each([
  null,
  {},
  { format: 'trello-exporter.snapshot', snapshotId: 'report-only', capture: {} },
  { ...createSyntheticCapture().snapshot, formatVersion: '2.0.0' },
  { ...createSyntheticCapture().snapshot, snapshotId: 'invalid' },
])('reports, invalid files, and unknown versions cannot enter restoration: %j', async (value) => {
  await expect(readImport(json(value))).rejects.toBeInstanceOf(ImportError);
});

test('invalid JSON, invalid UTF-8, and resource limits fail before content is returned', async () => {
  await expect(readImport(new Blob(['{invalid']))).rejects.toMatchObject({
    code: ImportErrorCode.InvalidSnapshot,
  });
  await expect(readImport(new Blob([new Uint8Array([0xff, 0xfe])]))).rejects.toBeInstanceOf(
    ImportError,
  );
  await expect(readImport(new Blob([' '.repeat(MAXIMUM_JSON_BYTES + 1)]))).rejects.toMatchObject({
    code: ImportErrorCode.LimitExceeded,
  });
  const oversized = new Blob();
  Object.defineProperty(oversized, 'size', { value: MAXIMUM_IMPORT_BYTES + 1 });
  await expect(readImport(oversized)).rejects.toMatchObject({
    code: ImportErrorCode.LimitExceeded,
  });
});

test('corrupt manifests, wrong sizes/digests, missing and unlisted files are rejected', async () => {
  const originals = unzipSync(await archive());
  const manifest = JSON.parse(strFromU8(originals['manifest.json']!)) as {
    snapshotId: string;
    files: { path: string; size: number; sha256: string }[];
  };
  const variants = [
    { ...originals, 'manifest.json': jsonBytes({}) },
    { ...originals, 'manifest.json': jsonBytes({ ...manifest, snapshotId: crypto.randomUUID() }) },
    {
      ...originals,
      'manifest.json': jsonBytes({ ...manifest, files: [...manifest.files, manifest.files[0]] }),
    },
    { ...originals, 'manifest.json': jsonBytes({ ...manifest, files: manifest.files.slice(1) }) },
    { ...originals, 'snapshot.json': new TextEncoder().encode('{}') },
    { ...originals, [manifest.files[1]!.path]: new TextEncoder().encode('changed') },
  ];
  for (const entries of variants)
    await expect(readImport(new Blob([zipSync(entries, { level: 0 })]))).rejects.toBeInstanceOf(
      ImportError,
    );
  const missing = { ...originals };
  delete missing['manifest.json'];
  await expect(readImport(new Blob([zipSync(missing)]))).rejects.toMatchObject({
    code: ImportErrorCode.MissingData,
  });
  const unknown = {
    ...originals,
    'attachments/orphan/content': new TextEncoder().encode('unknown'),
  };
  await expect(readImport(new Blob([zipSync(unknown)]))).rejects.toBeInstanceOf(ImportError);
});

test('attachment references must agree with the checked manifest, even when snapshot digest is updated', async () => {
  const originals = unzipSync(await archive());
  const snapshot = JSON.parse(strFromU8(originals['snapshot.json']!)) as ReturnType<
    typeof createSyntheticCapture
  >['snapshot'];
  const manifest = JSON.parse(strFromU8(originals['manifest.json']!)) as {
    files: { path: string; size: number; sha256: string }[];
  };
  snapshot.attachments[0]!.file!.sha256 = '0'.repeat(64);
  originals['snapshot.json'] = jsonBytes(snapshot);
  manifest.files[0] = {
    path: 'snapshot.json',
    size: originals['snapshot.json'].length,
    sha256: await sha256(originals['snapshot.json']),
  };
  originals['manifest.json'] = jsonBytes(manifest);
  await expect(readImport(new Blob([zipSync(originals, { level: 0 })]))).rejects.toMatchObject({
    code: ImportErrorCode.IntegrityFailed,
  });
});

test('compressed project ZIP entries are accepted, and cancellation returns no partial input', async () => {
  const entries = unzipSync(await archive());
  expect((await readImport(new Blob([zipSync(entries)]))).files.size).toBe(3);
  const active = new AbortController();
  active.abort();
  await expect(
    readImport(json(createSyntheticCapture().snapshot), active.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test('cancellation during the input checksum cannot publish a validated JSON import', async () => {
  const active = new AbortController();
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
    const result = await digest(...args);
    active.abort();
    return result;
  });
  await expect(
    readImport(json(createSyntheticCapture().snapshot), active.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test('cancellation during a ZIP entry checksum cannot publish a validated archive', async () => {
  const bytes = await archive();
  const active = new AbortController();
  const digest = crypto.subtle.digest.bind(crypto.subtle);
  let checks = 0;
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
    const result = await digest(...args);
    if (++checks === 2) active.abort();
    return result;
  });
  await expect(readImport(new Blob([bytes]), active.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});
