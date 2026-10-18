/** Check results also select their localized status messages */
export enum Check {
  Scan = 'scanned',
  Authorize = 'connected',
  Inspect = 'inspected',
}

/** Interface states outside a completed check */
export enum Status {
  Idle = 'idle',
  Working = 'working',
  Cancelled = 'cancelled',
  Failed = 'failed',
  Downloaded = 'downloaded',
  Selected = 'selected',
  Reported = 'reported',
}

/** Fixed event identifiers written to diagnostic reports */
export enum EventCode {
  CheckStarted = 'CHECK_STARTED',
  CheckCancelled = 'CHECK_CANCELLED',
  CheckFailed = 'CHECK_FAILED',
  OAuthCallbackStage = 'OAUTH_CALLBACK_STAGE',
  SampleDownloadRequested = 'SAMPLE_DOWNLOAD_REQUESTED',
  AuthorizationCompleted = 'AUTHORIZATION_COMPLETED',
  LocalFileSelected = 'LOCAL_FILE_SELECTED',
  LocalFileRead = 'LOCAL_FILE_READ',
  TestBoardVerified = 'TEST_BOARD_VERIFIED',
}

/** Only these callback stages may be persisted across windows */
export enum CallbackStage {
  Started = 'CALLBACK_STARTED',
  ConfigInvalid = 'CALLBACK_CONFIG_INVALID',
  SdkUnavailable = 'CALLBACK_SDK_UNAVAILABLE',
  SdkInitFailed = 'CALLBACK_SDK_INIT_FAILED',
  OpenerBlocked = 'CALLBACK_OPENER_BLOCKED',
  OpenerUnavailable = 'CALLBACK_OPENER_UNAVAILABLE',
  ReturnFailed = 'CALLBACK_RETURN_FAILED',
  Completed = 'CALLBACK_COMPLETED',
}

export enum DiagnosticFormat {
  CompatibilityProbe = 'trello-exporter.compatibility-probe',
  FileProbe = 'trello-exporter.file-probe',
}
