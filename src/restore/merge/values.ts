import type { MergeValue } from './types';

/**
 * Lists internal relationships without treating literal content as an identity
 * @param value - Internally projected merge content
 * @returns Namespaced reference keys, including nested relationships
 */
export function referencedKeys(value: MergeValue): string[] {
  if (Array.isArray(value)) return value.flatMap(referencedKeys);
  if (value === null || typeof value !== 'object') return [];
  if (typeof value.ref === 'string') return [value.ref];
  return Object.values(value).flatMap(referencedKeys);
}

export { canonicalJson as canonical } from '../../shared/json';

/**
 * Resolves only internally tagged relationships, keeping user-authored text literal
 * @param value - Projected content
 * @param bindings - Source-to-current identity mappings
 * @param pending - Relationships whose destination will be created by this plan
 * @returns Comparable values with resolved relationships
 */
export function resolveValue(
  value: MergeValue,
  bindings: Record<string, string>,
  pending: ReadonlySet<string> = new Set(),
): MergeValue {
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, bindings, pending));
  if (value !== null && typeof value === 'object') {
    if (typeof value.ref === 'string') {
      const key = value.ref;
      if (pending.has(key)) return `pending:${key}`;
      return `${key.split('/')[0]}/${bindings[key] ?? key.slice(key.indexOf('/') + 1)}`;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveValue(item, bindings, pending)]),
    );
  }
  return value;
}
