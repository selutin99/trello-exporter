import { ApiErrorCode, ScopeErrorCode } from '../shared/error-codes';
import type { HttpMethod } from './types';

/** A fixed diagnostic code, with no response body, URL, or authentication detail */
export class ApiError extends Error {
  /**
   * Creates a failure with a stable, non-sensitive diagnostic code
   * @param code - Serialized failure identifier
   * @param status - HTTP status when available
   * @param method - Request method when an HTTP response was observed
   */
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number | null = null,
    readonly method: HttpMethod | null = null,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

/** Rejects operations outside the explicitly selected test board */
export class ScopeError extends Error {
  /**
   * Creates a failure with a stable, non-sensitive diagnostic code
   * @param code - Scope failure identifier
   */
  constructor(readonly code: ScopeErrorCode = ScopeErrorCode.BoardScopeBlocked) {
    super(code);
    this.name = 'ScopeError';
  }
}
