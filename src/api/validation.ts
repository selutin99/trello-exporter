export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
}
