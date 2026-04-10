/**
 * CancelController ergonomic cancellation for lota requests.
 *
 * A thin wrapper around the native AbortController that adds:
 *   - a `reason` string so you can tell why a request was cancelled
 *   - an `isCancelled` getter so you don't have to read signal.aborted
 *   - a static `isCancelError()` guard for catch blocks
 *
 * Usage:
 *
 *   const cancel = new CancelController()
 *   api.get('/users', { signal: cancel.signal })
 *   cancel.cancel('user navigated away')
 *
 *
 * One controller can cancel multiple requests simultaneously:
 *
 *   const cancel = new CancelController()
 *   Promise.all([
 *     api.get('/a', { signal: cancel.signal }),
 *     api.get('/b', { signal: cancel.signal }),
 *   ])
 *   cancel.cancel()   // aborts both
 */

export class CancelController {
  private readonly controller: AbortController;
  private _reason: string | undefined;
  constructor() {
    this.controller = new AbortController();
  }

  /** The AbortSignal to pass into `config.signal`. */
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  /** True once `cancel()` has been called. */
  get isCancelled(): boolean {
    return this.controller.signal.aborted;
  }

  /** The reason string passed to `cancel()`, or undefined if not yet cancelled. */

  get reason(): string | undefined {
    return this._reason;
  }

  /**
   * Cancel all in-flight requests using this controller's signal.
   * @param reason - Optional human-readable reason, available on the thrown LotaError message.
   */

  cancel(reason?: string): void {
    if (this.isCancelled) return;
    this._reason = reason;
    this.controller.abort();
  }

  static isCancelError(err: unknown): boolean {
    if (err instanceof Error && err.name === "LotaError") {
      return err.message === "Request aborted";
    }
    return false;
  }
}
