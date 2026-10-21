/**
 * Splits text into bounded UTF-16 chunks without separating a surrogate pair
 * @param value - Literal source text
 * @param maximumLength - Maximum code units per chunk, at least two
 * @returns Contiguous chunks whose concatenation equals the original text
 * @throws RangeError for a non-integer limit or a limit smaller than a surrogate pair
 */
export function textChunks(value: string, maximumLength: number): string[] {
  if (!Number.isInteger(maximumLength) || maximumLength < 2)
    throw new RangeError('Invalid text limit');
  const chunks: string[] = [];
  let offset = 0;
  while (offset < value.length) {
    let end = Math.min(offset + maximumLength, value.length);
    const last = value.charCodeAt(end - 1);
    if (end < value.length && last >= 0xd800 && last <= 0xdbff) end--;
    chunks.push(value.slice(offset, end));
    offset = end;
  }
  return chunks;
}
