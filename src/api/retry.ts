import { ApiErrorCode } from '../shared/error-codes';
import { ApiError } from './errors';

/**
 * Respects Retry-After without retrying before the server-directed delay
 * @param response - Failed read response
 * @param attempt - Zero-based retry attempt
 * @returns Backoff duration in milliseconds
 * @throws ApiError when the requested delay exceeds the bounded automatic wait
 */
export function retryDelay(response: Response, attempt: number): number {
  const retry = response.headers.get('Retry-After');
  let delay = 500 * 2 ** attempt;
  if (retry) {
    const seconds = Number(retry);
    const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
    if (Number.isFinite(requested)) delay = Math.max(delay, requested);
  }
  if (delay > 10_000) throw new ApiError(ApiErrorCode.RateLimitWait, response.status);
  return delay;
}

/**
 * Waits for backoff while allowing cancellation to clear the timer
 * @param ms - Duration in milliseconds
 * @param signal - Optional cancellation signal
 * @returns A promise resolved after the wait
 * @throws The signal reason when cancelled
 */
export function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const finish = () => {
      signal?.removeEventListener('abort', abort);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const abort = () => {
      clearTimeout(timer);
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Preserve the AbortSignal contract.
      reject(signal?.reason);
    };
    signal?.addEventListener('abort', abort, { once: true });
  });
}
