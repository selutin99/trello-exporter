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
export interface ExportModel {
  state: ExportState;
  board: BoardOverview | null;
  format: ExportFormat;
  progress: ExportProgress | null;
  result: PreparedExport | null;
  demo: boolean;
}
