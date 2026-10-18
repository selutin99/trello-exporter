/** Releases the caller when cancelled, even if the SDK promise never settles.
 * A late rejection is consumed. This does not revoke an accepted OAuth grant.
 */
export function waitForOperation<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(operation).then(
      value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); },
    );
    if (signal.aborted) abort();
  });
}
