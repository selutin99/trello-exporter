export enum ExportFormat {
  Json = 'json',
  Zip = 'zip',
}

export enum CoverageStatus {
  Complete = 'complete',
  Partial = 'partial',
  Excluded = 'excluded',
}

export enum CaptureOutcome {
  Complete = 'complete',
  Partial = 'partial',
}

export enum AttachmentKind {
  Upload = 'trello-upload',
  Link = 'external-link',
}

export enum IssueCode {
  SectionUnavailable = 'SECTION_UNAVAILABLE',
  FileUnavailable = 'FILE_UNAVAILABLE',
  UnsafeLink = 'UNSAFE_LINK',
  BoardChanged = 'BOARD_CHANGED',
}

export enum ExportStage {
  Board = 'exportBoard',
  Cards = 'exportCards',
  Content = 'exportContent',
  Files = 'exportFiles',
  Package = 'exportPackage',
}
