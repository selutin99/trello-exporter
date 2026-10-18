export type ScopeErrorCode = 'BOARD_SCOPE_BLOCKED' | 'BOARD_NOT_VERIFIED' | 'WRITES_DISABLED';
export type ApiErrorCode = 'AUTH_REQUIRED' | 'NETWORK_ERROR' | 'WRITE_RESULT_UNKNOWN'
  | 'INVALID_RESPONSE' | 'RATE_LIMIT_WAIT' | 'API_REQUEST_FAILED';

/** A fixed diagnostic code, with no response body, URL, or authentication detail. */
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, readonly status: number | null = null) {
    super(code);
    this.name = 'ApiError';
  }
}

/** Rejects operations outside the explicitly selected test board. */
export class ScopeError extends Error {
  constructor(readonly code: ScopeErrorCode = 'BOARD_SCOPE_BLOCKED') {
    super(code);
    this.name = 'ScopeError';
  }
}
