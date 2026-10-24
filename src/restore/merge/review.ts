import type { ImportedBoard } from '../../import/read';
import { jsonBytes, sha256 } from '../../snapshot/encoding';
import type { Snapshot } from '../../snapshot/types';
import { RestoreError, RestoreErrorCode } from '../codes';
import type { MergeJournal, RestoreJournal } from '../types';
import { buildMergePlan } from './planner';
import type { MergePlan } from './types';
import { canonical } from './values';

interface ReviewInput {
  imported: ImportedBoard;
  current: Snapshot;
  reviewed: MergePlan;
  previous: RestoreJournal | null;
  continuation: MergeJournal | null;
}

/**
 * Rebuilds a reviewed merge against fresh content and verifies durable continuation boundaries
 * @param input - Validated input, fresh current content, explicit review, and same-browser history
 * @returns A matching plan and deterministic hashes for its remaining writes
 * @throws RestoreError for incomplete current content, changed review, or mismatched continuation
 */
export async function reviewMergePlan({
  imported,
  current,
  reviewed,
  previous,
  continuation,
}: ReviewInput): Promise<{ plan: MergePlan; planned: Record<string, string> }> {
  const plan = buildMergePlan(imported, current, reviewed.decisions, previous);
  if (
    plan.unresolved ||
    reviewed.targetState !== plan.targetState ||
    canonical({ actions: reviewed.actions, bindings: reviewed.bindings }) !==
      canonical({ actions: plan.actions, bindings: plan.bindings })
  )
    throw new RestoreError(RestoreErrorCode.PlanStale);
  const planned = Object.fromEntries(
    await Promise.all(
      plan.actions.map(async (action) => [action.key, await sha256(jsonBytes(action))] as const),
    ),
  );
  if (continuation) {
    if (plan.actions.some((action) => continuation.planned[action.key] !== planned[action.key]))
      throw new RestoreError(RestoreErrorCode.PlanStale);
    for (const [key, id] of Object.entries(continuation.bindings))
      if (plan.bindings[key] !== id) throw new RestoreError(RestoreErrorCode.PlanStale);
  }
  return { plan, planned };
}
