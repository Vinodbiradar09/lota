/**
 * returns a promise that resolves after `ms` milliseconds.
 * rejects immediately if the provided AbortSignal fires  so a cancelled
 * request doesn't sit through the full backoff delay before giving up.
 */
function retryDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
export { retryDelay };
