/**
 * Requests a local JSON download and later revokes its object URL
 * @param value - JSON-serializable diagnostic data
 * @param filename - Suggested local filename
 * @param document - Document used to create the temporary download link
 * @throws TypeError if value is not JSON-serializable; a browser error if download setup fails
 */
export function downloadJson(
  value: unknown,
  filename: string,
  document: Document = window.document,
): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
