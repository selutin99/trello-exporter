/**
 * Orders normalized siblings without mutating their source collection
 * @param values - Records with zero-based sibling order
 * @returns A sorted copy in snapshot order
 */
export function orderedRecords<T extends { order: number }>(values: readonly T[]): T[] {
  return [...values].sort((a, b) => a.order - b.order);
}

/**
 * Groups related records in one pass while retaining their original order
 * @param values - Source collection
 * @param parent - Parent identity of each record
 * @returns Independent groups keyed by parent identity
 */
export function groupRecords<T>(
  values: readonly T[],
  parent: (value: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = parent(value);
    const group = groups.get(key);
    if (group) group.push(value);
    else groups.set(key, [value]);
  }
  return groups;
}
