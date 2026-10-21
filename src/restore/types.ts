import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n';
import type { RestoreApi } from './api';
import type { RestoreCheckpoint } from './checkpoint';
import type { MergePlan } from './merge/types';
import type { RestoreMode, RestoreResource, RestoreStatus, RestoreWarning } from './codes';

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
  mode?: RestoreMode | undefined;
  sourceBoardId?: string | undefined;
  bindings?: Record<string, string> | undefined;
  decisions?: Record<string, string> | undefined;
  planned?: Record<string, string> | undefined;
  commentParts?: Record<string, string[]> | undefined;
  merge?:
    | { plannedCreates: number; plannedUpdates: number; unchanged: number; retained: number }
    | undefined;
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

/** Required state for current-board execution; legacy reports remain readable separately */
export interface MergeJournal extends RestoreJournal {
  mode: RestoreMode.Merge;
  sourceBoardId: string;
  target: RestoreTarget;
  bindings: Record<string, string>;
  decisions: Record<string, string>;
  planned: Record<string, string>;
  commentParts: Record<string, string[]>;
}

export interface RestoreOptions {
  plan?: MergePlan | undefined;
  locale: Locale;
  resume?: boolean;
  signal?: AbortSignal;
  onProgress?: (progress: RestoreProgress) => void;
}

/** Scoped writer boundary shared by execution and its synthetic tests */
export type RestoreWriter = Pick<
  RestoreApi,
  | 'selectTarget'
  | 'snapshot'
  | 'verifyTarget'
  | 'create'
  | 'verifyEntity'
  | 'verifyNested'
  | 'value'
  | 'update'
  | 'item'
>;

export interface RestoreExecution {
  imported: ImportedBoard;
  journal: MergeJournal;
  target: RestoreTarget;
  api: RestoreWriter;
  options: RestoreOptions;
  checkpoint: Pick<RestoreCheckpoint, 'step' | 'optionalStep' | 'mapped' | 'save'>;
  plan: MergePlan;
}
