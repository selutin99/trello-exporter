import type { ExportFormat } from '../../snapshot/codes';
import type { ExportProgress, Snapshot } from '../../snapshot/types';

export enum ExportState {
  Disconnected = 'exportAuthRequired',
  Loading = 'exportLoading',
  Ready = 'idle',
  Running = 'working',
  Complete = 'exportReady',
  Partial = 'exportPartial',
  Cancelled = 'exportCancelled',
  Failed = 'exportFailed',
  ScopeFailed = 'exportScopeFailed',
}
export interface BoardOverview {
  name: string;
  lists: number;
  cards: number;
}
export interface PreparedExport {
  blob: Blob;
  snapshot: Snapshot;
  filename: string;
  format: ExportFormat;
}
interface ExportSelection {
  format: ExportFormat;
  progress: ExportProgress | null;
}
export type ExportModel = ExportSelection &
  (
    | {
        state: ExportState.Complete | ExportState.Partial;
        board: BoardOverview;
        result: PreparedExport;
      }
    | {
        state: ExportState.Ready;
        board: BoardOverview;
        result: null;
      }
    | {
        state: Exclude<ExportState, ExportState.Complete | ExportState.Partial | ExportState.Ready>;
        board: BoardOverview | null;
        result: null;
      }
  );
