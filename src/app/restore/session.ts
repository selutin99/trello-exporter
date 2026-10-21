import { readImport } from '../../import/read';
import { waitForOperation } from '../../core/operation';
import type { ImportedBoard } from '../../import/read';
import type { Locale } from '../../i18n';
import { RestoreEngine } from '../../restore/engine';
import type { JournalStore } from '../../restore/types';
import { RestoreMessage } from './types';
import type { RestoreConnection, RestoreSessionModel } from './types';

interface Dependencies {
  context: (signal: AbortSignal) => Promise<RestoreConnection>;
  authorize: (signal: AbortSignal) => Promise<void>;
  store: () => JournalStore;
  changed: () => void;
}

/** Owns local validation and one restoration without depending on the DOM or SDK */
export class RestoreSession {
  readonly #model: RestoreSessionModel = {
    imported: null,
    context: null,
    report: null,
    previous: null,
    message: RestoreMessage.Choose,
  };
  #active: AbortController | null = null;

  /**
   * Binds explicit authorization, context, storage, and rendering boundaries
   * @param dependencies - External effects used by user-triggered operations
   */
  constructor(private readonly dependencies: Dependencies) {}

  /**
   * Exposes a state snapshot without allowing callers to change operation ownership
   * @returns Current local state and derived operation activity
   */
  get model(): Readonly<RestoreSessionModel & { busy: boolean }> {
    return { ...this.#model, busy: this.busy };
  }

  /**
   * Reports exclusive ownership during validation, authorization, and restoration
   * @returns Whether an operation is active
   */
  get busy(): boolean {
    return this.#active !== null;
  }

  /** Cancels the active wait or write without removing already created content */
  cancel(): void {
    this.#active?.abort();
  }

  /**
   * Validates a local file and discovers optional live context without writing
   * @param file - User-selected snapshot or archive
   * @returns The accepted import, or null after failure, cancellation, or competing work
   */
  async load(file: Blob): Promise<ImportedBoard | null> {
    let imported: ImportedBoard | null = null;
    await this.#task(RestoreMessage.Loading, RestoreMessage.Invalid, async (signal) => {
      this.#model.imported = null;
      this.#model.report = null;
      this.#model.context = null;
      this.#model.previous = null;
      const input = await waitForOperation(readImport(file, signal), signal);
      signal.throwIfAborted();
      let journalAvailable = true;
      try {
        this.#model.previous = this.dependencies.store().read();
      } catch {
        // File preview remains available; execution requires working durable storage.
        journalAvailable = false;
      }
      let connection: RestoreConnection | null = null;
      try {
        connection = await this.dependencies.context(signal);
      } catch {
        signal.throwIfAborted();
        // Standalone and unauthorized previews can connect explicitly later.
      }
      signal.throwIfAborted();
      this.#model.imported = input;
      this.#model.context = connection?.context ?? null;
      this.#model.message = journalAvailable
        ? RestoreMessage.Ready
        : RestoreMessage.JournalUnavailable;
      imported = input;
    });
    return imported;
  }

  /**
   * Requests explicit consent and refreshes the selected board's context
   * @returns Completion after connection or a safe failure message
   */
  async connect(): Promise<void> {
    await this.#task(RestoreMessage.Loading, RestoreMessage.Unavailable, async (signal) => {
      await this.dependencies.authorize(signal);
      signal.throwIfAborted();
      const connection = await this.dependencies.context(signal);
      signal.throwIfAborted();
      this.#model.context = connection.context;
      this.#model.message = RestoreMessage.Ready;
    });
  }

  /**
   * Executes a reviewed plan using a freshly paired writer and live context
   * @param name - Reviewed target name, or the existing journal target name for continuation
   * @param locale - Language for attributed comment summaries
   * @param resume - Whether to continue this browser's last operation
   * @returns Whether the engine produced a report, including cancelled and uncertain outcomes
   */
  async run(name: string, locale: Locale, resume = false): Promise<boolean> {
    const imported = this.#model.imported;
    if (!imported || !this.#model.context) return false;
    let reported = false;
    await this.#task(RestoreMessage.Running, RestoreMessage.Failed, async (signal) => {
      await this.dependencies.authorize(signal);
      signal.throwIfAborted();
      const { api, context } = await this.dependencies.context(signal);
      signal.throwIfAborted();
      this.#model.context = context;
      const engine = new RestoreEngine(api, this.dependencies.store());
      const report = await engine.run(imported, context, { name, locale, resume, signal });
      this.#model.report = report;
      this.#model.previous = report;
      this.#model.message = RestoreMessage.Ready;
      reported = true;
    });
    return reported;
  }

  async #task(
    message: RestoreMessage,
    failure: RestoreMessage,
    task: (signal: AbortSignal) => Promise<void>,
  ): Promise<void> {
    if (this.#active) return;
    const active = new AbortController();
    this.#active = active;
    this.#model.message = message;
    this.dependencies.changed();
    try {
      await task(active.signal);
    } catch {
      this.#model.message = active.signal.aborted ? RestoreMessage.Cancelled : failure;
    } finally {
      this.#active = null;
      this.dependencies.changed();
    }
  }
}
