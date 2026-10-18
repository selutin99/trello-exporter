export const CALLBACK_STAGE_KEY = 'exporter-callback-stage';
const stages = [
  'CALLBACK_STARTED', 'CALLBACK_CONFIG_INVALID', 'CALLBACK_SDK_UNAVAILABLE',
  'CALLBACK_SDK_INIT_FAILED', 'CALLBACK_OPENER_BLOCKED',
  'CALLBACK_OPENER_UNAVAILABLE', 'CALLBACK_RETURN_FAILED', 'CALLBACK_COMPLETED',
] as const;
export type CallbackStage = typeof stages[number];

/** Rejects arbitrary URLs, SDK messages, and authorization codes. */
export function callbackStage(value: unknown): CallbackStage | null {
  return typeof value === 'string' && stages.some(stage => stage === value) ? value as CallbackStage : null;
}

/** Persists one allowlisted stage; disabled browser storage does not block OAuth. */
export function saveCallbackStage(value: unknown, storage: Pick<Storage, 'setItem'>): void {
  const stage = callbackStage(value);
  if (!stage) return;
  try { storage.setItem(CALLBACK_STAGE_KEY, stage); } catch { /* Optional diagnostic storage. */ }
}

const safeCodes = new Set([
  'BOARD_SCOPE_BLOCKED', 'BOARD_NOT_VERIFIED', 'WRITES_DISABLED', 'AUTH_REQUIRED',
  'NETWORK_ERROR', 'WRITE_RESULT_UNKNOWN', 'INVALID_RESPONSE', 'RATE_LIMIT_WAIT',
  'API_REQUEST_FAILED', 'FILE_SIZE_MISMATCH', 'CHECK_FAILED',
]);

/** Projects only known error codes and HTTP statuses; never copies raw error fields. */
export function diagnosticError(error: unknown): { errorCode: string; status: number | null } {
  if (typeof error !== 'object' || error === null) return { errorCode: 'CHECK_FAILED', status: null };
  try {
    const code: unknown = 'code' in error ? error.code : undefined;
    const status: unknown = 'status' in error ? error.status : undefined;
    const known = typeof code === 'string' && safeCodes.has(code);
    return {
      errorCode: known ? code : 'CHECK_FAILED',
      status: known && typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    };
  } catch { return { errorCode: 'CHECK_FAILED', status: null }; }
}
