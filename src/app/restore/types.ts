import type { Snapshot } from '../../snapshot/types';
import type { MergePlan } from '../../restore/merge/types';
import type { ImportedBoard } from '../../import/read';
import type { RestoreContext, RestoreJournal, RestoreWriter } from '../../restore/types';

export interface RestoreConnection {
  context: RestoreContext;
  api: RestoreWriter;
}

export enum RestoreMessage {
  Choose = 'restoreChoose',
  Loading = 'restoreLoading',
  Ready = 'restoreReady',
  Running = 'restoreRunning',
  Invalid = 'restoreInvalid',
  Failed = 'restoreFailed',
  Unavailable = 'restoreUnavailable',
  Cancelled = 'restoreCancelled',
  JournalUnavailable = 'restoreJournalUnavailable',
  Stale = 'restoreStale',
  Incomplete = 'restoreIncomplete',
  Unknown = 'restoreUnknown',
}
interface SessionInfo {
  previous: RestoreJournal | null;
  message: RestoreMessage;
}
interface ComparedBoard {
  imported: ImportedBoard;
  current: Snapshot;
  context: RestoreContext;
}
/** A review or result always belongs to a validated input and a captured live destination */
export type RestoreSessionModel = SessionInfo &
  (
    | {
        imported: ImportedBoard | null;
        current: null;
        context: null;
        plan: null;
        report: null;
      }
    | (ComparedBoard & { plan: MergePlan; report: null })
    | (ComparedBoard & { plan: null; report: RestoreJournal })
  );
export type RestoreModel = RestoreSessionModel & {
  busy: boolean;
  active: boolean;
};
