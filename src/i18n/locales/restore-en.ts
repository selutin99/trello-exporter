import { RestoreWarning } from '../../restore/codes';
export const restoreEn = {
  restoreTitle: 'Restore your board',
  restoreIntro: 'Choose an exported JSON or ZIP file to create a new private board',
  restoreFile: 'Export file · JSON or ZIP',
  restoreChoose: 'Choose a file to review the restoration plan',
  restoreLoading: 'Validating the file and destination…',
  restoreReady: 'Review the plan before creating a board',
  restoreRunning: 'Restoring board content…',
  restoreInvalid:
    'The file is invalid, unsupported, exceeds limits, or does not contain complete board data. Choose a project JSON/ZIP export, not a diagnostic report',
  restoreFailed: 'Restoration stopped. Review the report before retrying',
  restoreUnavailable:
    'Open this Power-Up inside Trello and connect restoration to select the current board’s Workspace',
  restoreCancelled: 'Restoration cancelled',
  restoreJournalUnavailable:
    'Local recovery storage is unavailable or invalid. Restoration cannot start until storage is available',
  restoreName: 'New board name',
  restoreNameSuffix: '(restored)',
  restoreWorkspace: 'Destination Workspace',
  restoreLimitations: 'Restoration details',
  restorePermission:
    'Restoration needs board read/write permission in the selected Workspace. It creates a separate private board and does not modify the board you opened',
  restoreConnect: 'Connect restoration',
  restoreConfirm: 'I reviewed the plan and agree to create or continue the restoration board',
  restoreAction: 'Create a new board',
  restoreResume: 'Continue the last operation',
  restorePrevious:
    'An unfinished local operation exists. Starting again creates a separate board. Continue the previous operation only with the same export file',
  restoreReport: 'Download restoration report',
  restoreRetained:
    'Created content is retained if restoration stops. The report contains target links and progress, without tokens',
  restoreComplete: 'Board restored',
  restorePartial: 'Board restored with limitations',
  restoreUnknown:
    'A write result is unknown. Do not retry it automatically; inspect the target board and report',
  restoreIdentities:
    'New Trello IDs, timestamps, permissions, and comment authors differ. Members are not invited and source-board links are not rewritten',
  restoreCommentHeader: 'Imported comment from the snapshot',
  [RestoreWarning.SourcePartial]: 'The source export contains omissions or warnings',
  [RestoreWarning.Members]:
    'Card members remain source metadata and are not assigned automatically',
  [RestoreWarning.Covers]: 'Card cover settings remain source metadata',
  [RestoreWarning.AdvancedItems]: 'Checklist assignees are not assigned automatically',
  [RestoreWarning.MissingFiles]:
    'Some attachment bytes are missing; available source links are recreated as links',
  [RestoreWarning.CommentSummary]:
    'Original comments become attributed text summaries posted by the restoring user',
  [RestoreWarning.Unsupported]:
    'Some optional content was unavailable in the destination Workspace',
} as const;
