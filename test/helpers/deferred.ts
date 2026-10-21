/** Creates a manually settled external boundary for cancellation tests */
export function deferred<T>() {
  let settlement:
    { resolve: (value: T | PromiseLike<T>) => void; reject: (reason: unknown) => void } | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    settlement = { resolve, reject };
  });
  if (!settlement) throw new Error('Promise executor did not initialize');
  return { promise, ...settlement };
}
