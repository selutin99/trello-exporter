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
}
export interface RestoreSessionModel {
  imported: ImportedBoard | null;
  context: RestoreContext | null;
  report: RestoreJournal | null;
  previous: RestoreJournal | null;
  message: RestoreMessage;
}
export interface RestoreModel extends RestoreSessionModel {
  busy: boolean;
  active: boolean;
}
