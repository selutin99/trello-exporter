import { diagnosticError } from './diagnostics';
import { waitForOperation } from './operation';
import type { Check, ProbeEvent, ProbeReport, Status } from './report';

export interface OperationContext {
  signal: AbortSignal;
  record(event: ProbeEvent): void;
}

/** Owns one check at a time and prevents cancelled SDK work from changing a later check. */
export class ProbeController {
  #active: AbortController | null = null;
  #status: Status = 'idle';
  #report: ProbeReport;

  constructor(boardReference: string | null, private readonly changed: () => void = () => {}) {
    this.#report = {
      format: 'trello-exporter.compatibility-probe', version: '0.0.0',
      startedAt: new Date().toISOString(), boardReference, apiWritesEnabled: false, events: [],
    };
  }

  get busy(): boolean { return this.#active !== null; }
  get status(): Status { return this.#status; }
  get report(): ProbeReport { return structuredClone(this.#report); }

  record(event: ProbeEvent): void {
    this.#report.events.push({ ...structuredClone(event), at: new Date().toISOString() });
    this.changed();
  }

  setStatus(status: Status): void { this.#status = status; this.changed(); }
  cancel(): void { this.#active?.abort(); }

  async run(check: Check, task: (context: OperationContext) => Promise<void>): Promise<void> {
    if (this.#active) return;
    const active = new AbortController();
    this.#active = active;
    this.#status = 'working';
    this.record({ code: 'CHECK_STARTED', check });
    try {
      await waitForOperation(task({
        signal: active.signal,
        record: event => {
          active.signal.throwIfAborted();
          if (this.#active === active) this.record(event);
        },
      }), active.signal);
      active.signal.throwIfAborted();
      this.#status = check;
    } catch (error) {
      this.#status = active.signal.aborted ? 'cancelled' : 'failed';
      this.record({ code: active.signal.aborted ? 'CHECK_CANCELLED' : 'CHECK_FAILED', check, ...diagnosticError(error) });
    } finally {
      this.#active = null;
      this.changed();
    }
  }
}
