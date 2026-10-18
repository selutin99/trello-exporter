import { ApiErrorCode, ProbeErrorCode, ScopeErrorCode } from '../shared/error-codes';
import { CallbackStage } from './codes';

export const CALLBACK_STAGE_KEY = 'exporter-callback-stage';

/**
 * Accepts only named callback stages, excluding arbitrary URLs and SDK messages
 * @param value - Untrusted storage event value
 * @returns The recognized stage or null
 */
export function callbackStage(value: unknown): CallbackStage | null {
  return Object.values(CallbackStage).find((stage) => stage === value) ?? null;
}

/**
 * Persists only a fixed stage and tolerates unavailable browser storage
 * @param value - Candidate callback stage
 * @param storage - Optional browser storage boundary
 */
export function saveCallbackStage(value: unknown, storage: Pick<Storage, 'setItem'>): void {
  const stage = callbackStage(value);
  if (!stage) return;
  try {
    storage.setItem(CALLBACK_STAGE_KEY, stage);
  } catch {
    /* Optional diagnostic storage */
  }
}

export type DiagnosticCode = ApiErrorCode | ScopeErrorCode | ProbeErrorCode;
const safeCodes: ReadonlySet<string> = new Set([
  ...Object.values(ApiErrorCode),
  ...Object.values(ScopeErrorCode),
  ...Object.values(ProbeErrorCode),
]);
export interface DiagnosticError {
  errorCode: DiagnosticCode;
  status: number | null;
}

/**
 * Projects only known codes and valid HTTP statuses from untrusted errors
 * @param error - SDK, transport, or application error
 * @returns Safe diagnostic fields without copied error messages or URLs
 */
export function diagnosticError(error: unknown): DiagnosticError {
  const fallback = { errorCode: ProbeErrorCode.CheckFailed, status: null };
  if (typeof error !== 'object' || error === null) return fallback;
  try {
    const code: unknown = 'code' in error ? error.code : undefined;
    const status: unknown = 'status' in error ? error.status : undefined;
    const known = typeof code === 'string' && safeCodes.has(code);
    return {
      errorCode: known ? (code as DiagnosticCode) : ProbeErrorCode.CheckFailed,
      status:
        known &&
        typeof status === 'number' &&
        Number.isInteger(status) &&
        status >= 100 &&
        status <= 599
          ? status
          : null,
    };
  } catch {
    return fallback;
  }
}
