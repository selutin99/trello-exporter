import { RestoreResource } from '../codes';
import { MergeChoice, MergeField } from './types';
import type { MergeRecord } from './types';
import { canonical, resolveValue } from './values';

interface MatchContext {
  records: MergeRecord[];
  bindings: Record<string, string>;
  remembered: Record<string, string>;
  claimed: Set<string>;
}
function compatible(source: MergeRecord, target: MergeRecord, context: MatchContext): boolean {
  if (source.resource !== target.resource || context.claimed.has(target.key)) return false;
  if (
    source.resource === RestoreResource.Field &&
    source.fields[MergeField.Type] !== target.fields[MergeField.Type]
  )
    return false;
  if (source.resource === RestoreResource.Card) return true;
  if (
    source.resource === RestoreResource.Value &&
    valueField(source, context.bindings) !== valueField(target, {})
  )
    return false;
  if (!source.parent || !target.parent) return source.parent === target.parent;
  return context.bindings[source.parent] === target.parent.slice(target.parent.indexOf('/') + 1);
}

/**
 * Finds verified identities and explicit same-name candidates without merging by name automatically
 * @param source - Incoming record
 * @param context - Current records, prior mappings, and identities already consumed
 * @returns A direct match, explicit alternatives, or an intentional skip marker
 */
export function matchRecord(
  source: MergeRecord,
  context: MatchContext,
): {
  direct: MergeRecord | null;
  candidates: MergeRecord[];
  incompatible: boolean;
} {
  const remembered = context.remembered[source.key];
  const direct =
    context.records.find(
      (target) => target.sourceId === remembered && compatible(source, target, context),
    ) ??
    context.records.find(
      (target) => target.key === source.key && compatible(source, target, context),
    );
  const candidates = context.records.filter((target) => {
    if (!compatible(source, target, context)) return false;
    if (source.resource === RestoreResource.Value)
      return (
        canonical(resolveValue(source.fields[MergeField.Value] ?? null, context.bindings)) ===
          canonical(resolveValue(target.fields[MergeField.Value] ?? null, {})) ||
        valueField(source, context.bindings) === valueField(target, {})
      );
    const sameParent =
      source.parent === null ||
      context.bindings[source.parent] === target.parent?.slice(target.parent.indexOf('/') + 1);
    return sameParent && target.name === source.name;
  });
  const incompatible =
    source.resource !== RestoreResource.Value &&
    !direct &&
    context.records.some(
      (target) =>
        target.key === source.key ||
        (target.resource === source.resource && target.sourceId === remembered),
    );
  return { direct: direct ?? null, candidates, incompatible };
}
function valueField(record: MergeRecord, bindings: Record<string, string>): string {
  const value = record.fields[MergeField.Value];
  if (!value || Array.isArray(value) || typeof value !== 'object') return '';
  const field = value.field;
  if (!field || Array.isArray(field) || typeof field !== 'object' || typeof field.ref !== 'string')
    return '';
  const id = bindings[field.ref];
  return id ? `customFields/${id}` : field.ref;
}

/**
 * Validates an explicit match against current candidates
 * @param decision - User choice, never an API endpoint
 * @param candidates - Candidates from the current board only
 * @returns The selected current record or null for creation, skipping, or an invalid choice
 */
export function selectedMatch(
  decision: string | undefined,
  candidates: MergeRecord[],
): MergeRecord | null {
  if (decision === MergeChoice.Create || decision === MergeChoice.Skip) return null;
  return candidates.find((candidate) => candidate.sourceId === decision) ?? null;
}
