import { ApiError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import { HttpMethod } from '../api/types';
import { RestoreError, RestoreErrorCode, RestoreResource, RestoreWarning } from './codes';
import type { RestoreJournal, RestoreOptions, RestoreSteps } from './types';

const optionalRejectionStatuses = new Set([400, 403, 404, 405, 413, 422]);

/** Checkpoints one write at a time while retaining ambiguity for the engine to report */
export class RestoreCheckpoint implements RestoreSteps {
  /**
   * Binds the operation's durable write boundary
   * @param journal - Current operation and mapped target identities
   * @param save - Persists a checkpoint or throws before further writes
   * @param options - Cancellation and progress observer
   */
  constructor(
    private readonly journal: RestoreJournal,
    readonly save: () => void,
    private readonly options: RestoreOptions,
  ) {}

  /**
   * Resolves a required identity recorded by this operation
   * @param resource - Mapped resource kind
   * @param sourceId - Source object identity
   * @returns The previously created target identity
   * @throws RestoreError when a required mapping is missing
   */
  mapped(resource: RestoreResource, sourceId: string): string {
    const id = this.journal.completed[`${resource}/${sourceId}`];
    if (!id) throw new RestoreError(RestoreErrorCode.InvalidPlan);
    return id;
  }

  /**
   * Creates or reuses a required object with a non-null target identity
   * @param resource - Target resource kind
   * @param sourceId - Source identity used as the recovery key
   * @param create - Exactly one write attempt after a durable pending checkpoint
   * @returns The created or previously recorded target identity
   * @throws RestoreError for pending writes or a skipped required object; propagates write, storage, and cancellation failures
   */
  async step(
    resource: RestoreResource,
    sourceId: string,
    create: () => Promise<string>,
  ): Promise<string> {
    const id = await this.#run(resource, sourceId, create);
    if (id === null) throw new RestoreError(RestoreErrorCode.InvalidPlan);
    return id;
  }

  /**
   * Records a known optional rejection as an omission without retrying the write
   * @param resource - Optional target resource kind
   * @param sourceId - Source identity used as the recovery key
   * @param create - Exactly one write attempt after a durable pending checkpoint
   * @returns The mapped identity or null for explicitly skipped content
   * @throws Propagates uncertain writes, storage failures, ownership errors, and cancellation
   */
  optionalStep(
    resource: RestoreResource,
    sourceId: string,
    create: () => Promise<string>,
  ): Promise<string | null> {
    return this.#run(resource, sourceId, async () => {
      try {
        return await create();
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.code !== ApiErrorCode.RequestFailed ||
          (error.method !== HttpMethod.Post && error.method !== HttpMethod.Put) ||
          error.status === null ||
          !optionalRejectionStatuses.has(error.status)
        )
          throw error;
        this.journal.skipped.push(`${resource}/${sourceId}`);
        this.journal.warnings.push(RestoreWarning.Unsupported);
        return null;
      }
    });
  }

  async #run(
    resource: RestoreResource,
    sourceId: string,
    create: () => Promise<string | null>,
  ): Promise<string | null> {
    this.options.signal?.throwIfAborted();
    if (this.journal.pending !== null) throw new RestoreError(RestoreErrorCode.UnknownWrite);
    const key = `${resource}/${sourceId}`;
    const existing = this.journal.completed[key];
    if (existing) return existing;
    if (this.journal.skipped.includes(key)) return null;
    this.options.onProgress?.({
      resource,
      current: Object.keys(this.journal.completed).length,
      total: 0,
    });
    this.options.signal?.throwIfAborted();
    this.journal.pending = key;
    this.save();
    const created = await create();
    if (created !== null) this.journal.completed[key] = created;
    this.journal.pending = null;
    this.save();
    return created;
  }
}
