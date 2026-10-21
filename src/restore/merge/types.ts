import type { RestoreResource } from '../codes';

export enum MergeChoice {
  Current = 'keep-current',
  Snapshot = 'use-snapshot',
  Create = 'create-separate',
  Skip = 'skip-snapshot',
}
export enum MergeConflictKind {
  Identity = 'identity',
  Value = 'value',
}
export enum MergeActionKind {
  Create = 'create',
  Update = 'update',
  Copy = 'copy',
}
export enum MergeField {
  Name = 'name',
  Description = 'description',
  Parent = 'parent',
  Labels = 'labels',
  Start = 'start',
  Due = 'due',
  Complete = 'dueComplete',
  Checked = 'checked',
  Color = 'color',
  Type = 'type',
  Text = 'text',
  Value = 'value',
  Content = 'content',
}
export type MergeValue =
  string | number | boolean | null | MergeValue[] | { [key: string]: MergeValue };
export interface MergeRecord {
  key: string;
  resource: RestoreResource;
  sourceId: string;
  parent: string | null;
  name: string;
  fields: Partial<Record<MergeField, MergeValue>>;
}
interface ConflictBase {
  key: string;
  record: MergeRecord;
  current: MergeValue;
  incoming: MergeValue;
}
export type MergeConflict = ConflictBase &
  (
    | {
        kind: MergeConflictKind.Identity;
        field: null;
        candidates: { id: string; name: string }[];
        resolution: string | null;
      }
    | {
        kind: MergeConflictKind.Value;
        field: MergeField;
        candidates: [];
        resolution: MergeChoice.Current | MergeChoice.Snapshot | null;
      }
  );
interface ActionBase {
  key: string;
  record: MergeRecord;
}
interface TargetedAction {
  targetId: string;
  field: MergeField;
  before: MergeValue;
  after: MergeValue;
}
export type MergeAction = ActionBase &
  (
    | {
        kind: MergeActionKind.Create;
        targetId: null;
        field: null;
        before: null;
        after: MergeRecord['fields'];
      }
    | (TargetedAction & { kind: MergeActionKind.Update })
    | (TargetedAction & { kind: MergeActionKind.Copy })
  );
export interface MergePlan {
  sourceBoardId: string;
  targetBoardId: string;
  targetState: string;
  decisions: Record<string, string>;
  bindings: Record<string, string>;
  actions: MergeAction[];
  conflicts: MergeConflict[];
  unresolved: number;
  unchanged: number;
  retained: number;
}
