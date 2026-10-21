import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n/types';
import { ApiError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import { sha256, jsonBytes } from '../snapshot/encoding';
import { canResumeJournal, hasUncertainWrite } from './journal';
import { RestoreError, RestoreErrorCode, RestoreMode, RestoreStatus } from './codes';
import type {
  JournalStore,
  RestoreContext,
  RestoreJournal,
  RestoreOptions,
  RestoreWriter,
  MergeJournal,
} from './types';
import { RestoreCheckpoint } from './checkpoint';
import { restorationPlan } from './plan';
import { executeMerge } from './merge/execute';
import { buildMergePlan } from './merge/planner';
import { canonical } from './merge/values';
import { MergeActionKind } from './merge/types';
import type { MergeAction, MergePlan } from './merge/types';

export type { RestoreExecution, RestoreOptions } from './types';
export { commentSummaries } from './comments';

/** Applies reviewed snapshot content to the existing current board with durable write checkpoints */
export class RestoreEngine {
  /**
   * Binds a current-board writer and same-browser journal
   * @param api - SDK-scoped read/write boundary
   * @param store - Durable operation storage
   */
  constructor(
    private readonly api: RestoreWriter,
    private readonly store: JournalStore,
  ) {}

  /**
   * Revalidates and applies a resolved merge; boards are never created and current-only content is preserved
   * @param imported - Validated project JSON/ZIP content
   * @param context - Current SDK-bound board, independent of imported source IDs
   * @param options - Reviewed merge plan, language, cancellation, and continuation choice
   * @returns Token-free operation result, including partial and uncertain outcomes
   * @throws RestoreError before writes for stale/unresolved plans or unsafe continuation
   * @throws Propagates cancellation, context read, and storage failures before opening the operation
   */
  async run(
    imported: ImportedBoard,
    context: RestoreContext,
    options: RestoreOptions,
  ): Promise<RestoreJournal> {
    options.signal?.throwIfAborted();
    const reviewed = options.plan;
    if (
      !reviewed ||
      reviewed.unresolved ||
      reviewed.targetBoardId !== context.boardId ||
      reviewed.sourceBoardId !== imported.snapshot.board.id
    )
      throw new RestoreError(RestoreErrorCode.InvalidPlan);
    const previous = this.store.read();
    if (hasUncertainWrite(previous)) throw new RestoreError(RestoreErrorCode.UnknownWrite);
    const continuation = options.resume ? requireContinuation(previous, imported, context) : null;
    const fresh = await this.api.snapshot(context, { signal: options.signal });
    const plan = buildMergePlan(imported, fresh, reviewed.decisions, previous);
    assertReviewed(reviewed, plan);
    const planned = await operationHashes(plan.actions);
    if (continuation) validateContinuation(continuation, plan, planned);
    const target = await this.api.selectTarget(context, { signal: options.signal });
    options.signal?.throwIfAborted();
    const journal = continuation
      ? {
          ...continuation,
          target,
          decisions: { ...plan.decisions },
          commentLocale: continuation.commentLocale ?? options.locale,
          status: RestoreStatus.Running,
          error: null,
        }
      : newJournal(imported, context, target, plan, planned, options.locale, previous);
    const save = () => {
      journal.updatedAt = new Date().toISOString();
      this.store.save(journal);
    };
    save();
    try {
      const checkpoint = new RestoreCheckpoint(journal, save, options);
      await executeMerge({
        imported,
        journal,
        api: this.api,
        target,
        plan,
        checkpoint,
        options: { ...options, locale: journal.commentLocale ?? options.locale },
      });
      await this.api.verifyTarget({ signal: options.signal });
      options.signal?.throwIfAborted();
      journal.status =
        journal.warnings.length || journal.skipped.length
          ? RestoreStatus.Partial
          : RestoreStatus.Complete;
    } catch (error) {
      journal.status = failureStatus(error, options.signal);
      journal.error =
        error instanceof ApiError || error instanceof RestoreError
          ? error.code
          : RestoreErrorCode.Failed;
      if (journal.status !== RestoreStatus.Unknown) journal.pending = null;
    }
    try {
      save();
    } catch {
      journal.status = RestoreStatus.Unknown;
      journal.error = RestoreErrorCode.JournalUnavailable;
    }
    return journal;
  }
}
function requireContinuation(
  previous: RestoreJournal | null,
  imported: ImportedBoard,
  context: RestoreContext,
): MergeJournal {
  if (
    !canResumeJournal(previous, imported.checksum, context) ||
    previous.sourceBoardId !== imported.snapshot.board.id
  )
    throw new RestoreError(RestoreErrorCode.JournalMismatch);
  return previous;
}
function assertReviewed(reviewed: MergePlan, current: MergePlan): void {
  if (
    current.unresolved ||
    reviewed.targetState !== current.targetState ||
    canonical({ actions: reviewed.actions, bindings: reviewed.bindings }) !==
      canonical({ actions: current.actions, bindings: current.bindings })
  )
    throw new RestoreError(RestoreErrorCode.PlanStale);
}
async function operationHashes(actions: MergeAction[]): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      actions.map(async (action) => [action.key, await sha256(jsonBytes(action))] as const),
    ),
  );
}
function validateContinuation(
  previous: RestoreJournal,
  plan: MergePlan,
  hashes: Record<string, string>,
): void {
  if (plan.actions.some((action) => previous.planned?.[action.key] !== hashes[action.key]))
    throw new RestoreError(RestoreErrorCode.PlanStale);
  for (const [key, id] of Object.entries(previous.bindings ?? {}))
    if (plan.bindings[key] !== id) throw new RestoreError(RestoreErrorCode.PlanStale);
}
function newJournal(
  imported: ImportedBoard,
  context: RestoreContext,
  target: NonNullable<RestoreJournal['target']>,
  plan: MergePlan,
  planned: Record<string, string>,
  locale: Locale,
  previous: RestoreJournal | null,
): MergeJournal {
  const now = new Date().toISOString();
  const metadata = restorationPlan(imported);
  return {
    format: 'trello-exporter.restore-report',
    formatVersion: '0.1.0',
    operationId: crypto.randomUUID(),
    checksum: imported.checksum,
    snapshotId: imported.snapshot.snapshotId,
    sourceContextId: context.boardId,
    workspaceId: context.workspaceId,
    target,
    startedAt: now,
    updatedAt: now,
    status: RestoreStatus.Running,
    pending: null,
    completed: {},
    skipped: [],
    warnings: plan.actions.length ? metadata.warnings : [],
    error: null,
    commentLocale: locale,
    mode: RestoreMode.Merge,
    sourceBoardId: imported.snapshot.board.id,
    bindings: { ...plan.bindings },
    decisions: { ...plan.decisions },
    planned,
    commentParts: Object.fromEntries(
      Object.entries(previous?.commentParts ?? {}).filter(
        ([key]) => previous?.bindings?.[key] === plan.bindings[key],
      ),
    ),
    merge: {
      plannedCreates: plan.actions.filter((action) => action.kind !== MergeActionKind.Update)
        .length,
      plannedUpdates: plan.actions.filter((action) => action.kind === MergeActionKind.Update)
        .length,
      unchanged: plan.unchanged,
      retained: plan.retained,
    },
  };
}
function failureStatus(error: unknown, signal?: AbortSignal): RestoreStatus {
  if (
    (error instanceof ApiError && error.code === ApiErrorCode.WriteResultUnknown) ||
    (error instanceof RestoreError && error.code === RestoreErrorCode.UnknownWrite)
  )
    return RestoreStatus.Unknown;
  return signal?.aborted ? RestoreStatus.Cancelled : RestoreStatus.Failed;
}
