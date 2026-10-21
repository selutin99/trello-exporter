export enum ExportFormat {
  Json = 'json',
  Zip = 'zip',
  Markdown = 'md',
  Pdf = 'pdf',
  Xlsx = 'xlsx',
  Csv = 'csv',
}

export enum CustomFieldType {
  Checkbox = 'checkbox',
  Date = 'date',
  List = 'list',
  Number = 'number',
  Text = 'text',
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
