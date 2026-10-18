/**
 * Releases the caller on cancellation and consumes late SDK rejections
 * @param operation - Pending external operation
 * @param signal - Signal that cancels the local wait
 * @returns The operation result if it settles before cancellation
 * @throws The operation rejection or signal reason; cancelling does not revoke an accepted OAuth grant
 */
export function waitForOperation<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    // AbortSignal allows arbitrary reasons; preserve them as required by its contract.
    const abort = () => {
      signal.removeEventListener('abort', abort);
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Preserve AbortSignal.reason verbatim.
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation).then(
      (value) => {
        signal.removeEventListener('abort', abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Forward the SDK rejection without changing its identity.
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}
