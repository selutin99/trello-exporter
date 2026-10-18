/** Stable serialized API failure codes */
export enum ApiErrorCode {
  AuthRequired = 'AUTH_REQUIRED',
  NetworkError = 'NETWORK_ERROR',
  WriteResultUnknown = 'WRITE_RESULT_UNKNOWN',
  InvalidResponse = 'INVALID_RESPONSE',
  RateLimitWait = 'RATE_LIMIT_WAIT',
  RequestFailed = 'API_REQUEST_FAILED',
}

/** Failures that block access outside the selected board */
export enum ScopeErrorCode {
  BoardScopeBlocked = 'BOARD_SCOPE_BLOCKED',
  BoardNotVerified = 'BOARD_NOT_VERIFIED',
  WritesDisabled = 'WRITES_DISABLED',
}

/** Local checks and configuration failures */
export enum ProbeErrorCode {
  CheckFailed = 'CHECK_FAILED',
  FileSizeMismatch = 'FILE_SIZE_MISMATCH',
  InvalidConfig = 'INVALID_CONFIG',
}
