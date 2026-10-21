import { expect, test } from 'vitest';
import { zipSync } from 'fflate';
import { readZip } from '../../src/import/zip';
import { ImportError } from '../../src/import/codes';

test.each([
  '../snapshot.json',
  '/snapshot.json',
  'attachments/../content',
  'C:\\snapshot.json',
  'other.txt',
])('ZIP path %s is refused', async (path) => {
  await expect(readZip(zipSync({ [path]: new Uint8Array([1]) }))).rejects.toThrow(ImportError);
});
test.each([
  'symlink',
  'encrypted',
  'compression',
  'size',
  'actualSize',
  'count',
  'offset',
  'localName',
])('unsafe ZIP metadata is refused: %s', async (kind) => {
  const bytes = zipSync({ 'snapshot.json': new TextEncoder().encode('test') }, { level: 0 });
  const view = new DataView(bytes.buffer);
  const end = bytes.length - 22;
  const central = view.getUint32(end + 16, true);
  if (kind === 'symlink') view.setUint32(central + 38, 0xa000 << 16, true);
  if (kind === 'encrypted') view.setUint16(central + 8, 1, true);
  if (kind === 'compression') view.setUint16(central + 10, 12, true);
  if (kind === 'size') view.setUint32(central + 24, 0xffffffff, true);
  if (kind === 'actualSize') view.setUint32(central + 24, 0, true);
  if (kind === 'count') view.setUint16(end + 10, 0xffff, true);
  if (kind === 'offset') view.setUint32(central + 42, 0xffffffff, true);
  if (kind === 'localName') bytes[30] = 0x78;
  await expect(readZip(bytes)).rejects.toThrow(ImportError);
});
test('duplicate entries and expansion bombs are refused before unrestricted inflation', async () => {
  const bytes = zipSync({
    'snapshot.json': new Uint8Array([1]),
    'manifest.json': new Uint8Array([2]),
  });
  const name = new TextEncoder().encode('manifest.json');
  for (let i = 0; i < bytes.length - name.length; i++)
    if (name.every((byte, n) => bytes[i + n] === byte))
      bytes.set(new TextEncoder().encode('snapshot.json'), i);
  await expect(readZip(bytes)).rejects.toThrow(ImportError);
  await expect(readZip(zipSync({ 'snapshot.json': new Uint8Array(1_000_000) }))).rejects.toThrow(
    ImportError,
  );
  await expect(readZip(new Uint8Array([1, 2, 3]))).rejects.toThrow(ImportError);
});
