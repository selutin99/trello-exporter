import { canResumeJournal } from './journal';
import { snapshotRelations } from '../snapshot/relations';
import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n/types';
import { ApiError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import { RestoreError, RestoreErrorCode, RestoreStatus } from './codes';
import type {
  JournalStore,
  RestoreContext,
  RestoreJournal,
  RestoreOptions,
  RestoreWriter,
} from './types';
import { RestoreCheckpoint } from './checkpoint';
import { restorationPlan } from './plan';
import { restoreContent } from './content';

export type { RestoreExecution, RestoreOptions } from './types';
export { commentSummaries } from './comments';

/** Restores a validated export with durable checkpoints and no automatic ambiguous-write retries */
export class RestoreEngine {
  /**
   * Binds a target-only API and same-browser recovery journal
   * @param api - Scoped restoration writer
   * @param store - Durable operation storage
   */
  constructor(
    private readonly api: RestoreWriter,
    private readonly store: JournalStore,
  ) {}

  /**
   * Runs or resumes one explicitly reviewed new-board restoration
   * @param imported - Validated snapshot and checked file bytes
   * @param context - Verified live destination Workspace
   * @param options - Reviewed board name, language, recovery choice, and cancellation
   * @returns A token-free complete, partial, failed, cancelled, or uncertain report
   * @throws RestoreError before mutation when the plan or local journal cannot be trusted
   * @throws The signal reason when already cancelled before opening the journal
   */
  async run(
    imported: ImportedBoard,
    context: RestoreContext,
    options: RestoreOptions,
  ): Promise<RestoreJournal> {
    options.signal?.throwIfAborted();
    const name = options.name.trim();
    if (!name || name.length > 256) throw new RestoreError(RestoreErrorCode.InvalidPlan);
    const previous = this.store.read();
    const journal = options.resume
      ? this.#resume(previous, imported, context, options.locale)
      : this.#new(imported, context, options.locale);
    const save = () => {
      journal.updatedAt = new Date().toISOString();
      this.store.save(journal);
    };
    save();
    try {
      options.signal?.throwIfAborted();
      if (journal.target)
        await this.api.resumeTarget(journal.target, context, { signal: options.signal });
      else {
        journal.pending = 'board';
        save();
        journal.target = await this.api.createBoard(
          context,
          name,
          imported.snapshot.board.description,
          { signal: options.signal },
        );
        journal.pending = null;
        save();
      }
      const checkpoint = new RestoreCheckpoint(journal, save, options);
      await restoreContent({
        imported,
        journal,
        api: this.api,
        options: { ...options, locale: journal.commentLocale ?? options.locale },
        target: journal.target,
        checkpoint,
        relations: snapshotRelations(imported.snapshot),
      });
      await this.api.verifyTarget({ signal: options.signal });
      options.signal?.throwIfAborted();
      journal.status =
        journal.warnings.length || journal.skipped.length
          ? RestoreStatus.Partial
          : RestoreStatus.Complete;
    } catch (error) {
      journal.status = failureStatus(error, journal.pending, options.signal);
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

  #new(imported: ImportedBoard, context: RestoreContext, commentLocale: Locale): RestoreJournal {
    const now = new Date().toISOString();
    return {
      format: 'trello-exporter.restore-report',
      formatVersion: '0.1.0',
      operationId: crypto.randomUUID(),
      checksum: imported.checksum,
      snapshotId: imported.snapshot.snapshotId,
      sourceContextId: context.boardId,
      workspaceId: context.workspaceId,
      target: null,
      startedAt: now,
      updatedAt: now,
      status: RestoreStatus.Running,
      pending: null,
      completed: {},
      skipped: [],
      warnings: restorationPlan(imported).warnings,
      error: null,
      commentLocale,
    };
  }
  #resume(
    previous: RestoreJournal | null,
    imported: ImportedBoard,
    context: RestoreContext,
    locale: Locale,
  ): RestoreJournal {
    if (!canResumeJournal(previous, imported.checksum, context)) {
      const uncertain = previous?.pending || previous?.status === RestoreStatus.Unknown;
      throw new RestoreError(
        uncertain ? RestoreErrorCode.UnknownWrite : RestoreErrorCode.JournalMismatch,
      );
    }
    return {
      ...previous,
      status: RestoreStatus.Running,
      error: null,
      commentLocale: previous.commentLocale ?? locale,
    };
  }
}

function failureStatus(
  error: unknown,
  pending: string | null,
  signal?: AbortSignal,
): RestoreStatus {
  const unknownWrite = error instanceof ApiError && error.code === ApiErrorCode.WriteResultUnknown;
  const unresolvedWrite =
    error instanceof RestoreError &&
    (error.code === RestoreErrorCode.UnknownWrite ||
      (pending === 'board' && error.code === RestoreErrorCode.InvalidTarget));
  if (unknownWrite || unresolvedWrite) return RestoreStatus.Unknown;
  if (signal?.aborted) return RestoreStatus.Cancelled;
  return RestoreStatus.Failed;
}
