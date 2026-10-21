import type { SnapshotRelations } from '../snapshot/relations';
import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n';
import type { RestoreApi } from './api';
import type { RestoreCheckpoint } from './checkpoint';
import type { RestoreResource, RestoreStatus, RestoreWarning } from './codes';

export interface RestoreTarget {
  id: string;
  name: string;
  workspaceId: string;
  url: string;
}
export interface RestoreContext {
  boardId: string;
  workspaceId: string;
  workspaceName: string;
}
export interface RestoreJournal {
  format: 'trello-exporter.restore-report';
  formatVersion: '0.1.0';
  operationId: string;
  checksum: string;
  snapshotId: string;
  sourceContextId: string;
  workspaceId: string;
  target: RestoreTarget | null;
  startedAt: string;
  updatedAt: string;
  status: RestoreStatus;
  pending: string | null;
  completed: Record<string, string>;
  skipped: string[];
  warnings: RestoreWarning[];
  error: string | null;
  /** Language fixed for comment chunk boundaries; absent in legacy journals */
  commentLocale?: Locale | undefined;
}
export interface RestoreProgress {
  resource: RestoreResource;
  current: number;
  total: number;
}
export interface JournalStore {
  read(): RestoreJournal | null;
  save(journal: RestoreJournal): void;
}

export interface RestoreOptions {
  name: string;
  locale: Locale;
  resume?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: RestoreProgress) => void;
}

/** Scoped writer boundary shared by execution and its synthetic tests */
export type RestoreWriter = Pick<
  RestoreApi,
  'createBoard' | 'resumeTarget' | 'verifyTarget' | 'create' | 'verifyEntity' | 'value'
>;

export interface RestoreExecution {
  imported: ImportedBoard;
  journal: RestoreJournal;
  target: RestoreTarget;
  api: RestoreWriter;
  options: RestoreOptions;
  checkpoint: Pick<RestoreCheckpoint, 'step' | 'optionalStep' | 'mapped' | 'save'>;
  relations: SnapshotRelations;
}
