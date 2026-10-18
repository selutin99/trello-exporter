import { Check, DiagnosticFormat, EventCode, Status } from './codes';
import { diagnosticError } from './diagnostics';
import { waitForOperation } from './operation';
import type { ProbeEvent, ProbeReport, ProbeStatus } from './report';

export interface OperationContext {
  signal: AbortSignal;
  record(this: void, event: ProbeEvent): void;
}

/** Owns one check at a time and prevents cancelled SDK work from changing a later check */
export class ProbeController {
  #active: AbortController | null = null;
  #status: ProbeStatus = Status.Idle;
  #report: ProbeReport;

  /**
   * Creates an in-memory diagnostic session with API writes disabled
   * @param boardReference - Selected board short link or null for standalone checks
   * @param changed - Notification callback after state changes
   */
  constructor(
    boardReference: string | null,
    private readonly changed: () => void = () => {},
  ) {
    this.#report = {
      format: DiagnosticFormat.CompatibilityProbe,
      version: '0.0.0',
      startedAt: new Date().toISOString(),
      boardReference,
      apiWritesEnabled: false,
      events: [],
    };
  }

  /**
   * Indicates whether a check owns the controller
   * @returns Whether an operation is active
   */
  get busy(): boolean {
    return this.#active !== null;
  }
  /**
   * Exposes the current localized status key
   * @returns The current named status or check result
   */
  get status(): ProbeStatus {
    return this.#status;
  }
  /**
   * Returns a defensive snapshot of the diagnostic session
   * @returns A report copy whose mutation cannot change the controller
   */
  get report(): ProbeReport {
    return structuredClone(this.#report);
  }

  /**
   * Appends a defensive copy of an event with its timestamp
   * @param event - Structured event with safe diagnostic fields
   */
  record(event: ProbeEvent): void {
    this.#report.events.push({ ...structuredClone(event), at: new Date().toISOString() });
    this.changed();
  }

  /**
   * Changes the interface status and notifies the view
   * @param status - Named state or completed check result
   */
  setStatus(status: ProbeStatus): void {
    this.#status = status;
    this.changed();
  }
  /**
   * Stops waiting for the active check without revoking an accepted OAuth grant
   */
  cancel(): void {
    this.#active?.abort();
  }

  /**
   * Owns one check and ignores late results after cancellation
   * @param check - Check being performed
   * @param task - Async operation receiving a signal and guarded event recorder
   * @returns A promise resolved after success, cancellation, or a recorded failure
   */
  async run(check: Check, task: (context: OperationContext) => Promise<void>): Promise<void> {
    if (this.#active) return;
    const active = new AbortController();
    this.#active = active;
    this.#status = Status.Working;
    this.record({ code: EventCode.CheckStarted, check });
    try {
      await waitForOperation(
        task({
          signal: active.signal,
          record: (event) => {
            active.signal.throwIfAborted();
            if (this.#active === active) this.record(event);
          },
        }),
        active.signal,
      );
      active.signal.throwIfAborted();
      this.#status = check;
    } catch (error) {
      this.#status = active.signal.aborted ? Status.Cancelled : Status.Failed;
      this.record({
        code: active.signal.aborted ? EventCode.CheckCancelled : EventCode.CheckFailed,
        check,
        ...diagnosticError(error),
      });
    } finally {
      this.#active = null;
      this.changed();
    }
  }
}
