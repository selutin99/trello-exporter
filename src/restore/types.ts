import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n/types';
import type { MergePlan } from './merge/types';
import type { RestoreTarget, RestoreWriter } from './writer';
import type { RestoreMode, RestoreResource, RestoreStatus, RestoreWarning } from './codes';

export type { RestoreContext, RestoreTarget, RestoreWriter } from './writer';

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

/** Durable execution boundary; implemented by RestoreCheckpoint */
export interface RestoreSteps {
  /**
   * Reuses a confirmed identity or checkpoints one required write
   * @param resource - Target resource kind
   * @param sourceId - Durable recovery key
   * @param create - One write attempt after persisting pending state
   * @returns Confirmed target identity
   * @throws Write, storage, cancellation, or invalid-checkpoint failures
   */
  step(resource: RestoreResource, sourceId: string, create: () => Promise<string>): Promise<string>;
  /**
   * Checkpoints optional content while retaining unknown write outcomes
   * @param resource - Optional target resource kind
   * @param sourceId - Durable recovery key
   * @param create - One write attempt after persisting pending state
   * @returns Confirmed identity or null after a known optional rejection
   * @throws Uncertain-write, storage, ownership, or cancellation failures
   */
  optionalStep(
    resource: RestoreResource,
    sourceId: string,
    create: () => Promise<string>,
  ): Promise<string | null>;
  /**
   * Resolves an identity already recorded by this operation
   * @param resource - Target resource kind
   * @param sourceId - Durable recovery key
   * @returns Confirmed target identity
   * @throws RestoreError when the mapping is missing
   */
  mapped(resource: RestoreResource, sourceId: string): string;
  /**
   * Persists the current operation before further writes
   * @throws Storage failures when durability cannot be established
   */
  readonly save: () => void;
}

export interface RestoreExecution {
  imported: ImportedBoard;
  journal: MergeJournal;
  target: RestoreTarget;
  api: RestoreWriter;
  options: RestoreOptions;
  checkpoint: RestoreSteps;
  plan: MergePlan;
}
