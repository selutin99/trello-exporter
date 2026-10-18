/**
 * Narrows an unknown value to a non-array object
 * @param value - Untrusted response value
 * @returns Whether value can be inspected as a record
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks the canonical Trello identity shape
 * @param value - Untrusted identity
 * @returns Whether value is a lowercase 24-character hexadecimal ID
 */
export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
}
