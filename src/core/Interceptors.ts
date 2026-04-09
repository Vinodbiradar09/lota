import type { InterceptorHandler } from "../types/index.js";

export class Interceptors<T> {
  public handlers: (InterceptorHandler<T> | null)[] = [];
  /**
   * register a handler pair.
   * @returns An id that can be passed to `eject()` to remove this handler.
   */
  use(
    fulfilled: (value: T) => T | Promise<T>,
    rejected?: ((error: unknown) => unknown) | undefined,
  ): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  /** remove a handler by the id returned from `use()`. */
  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  /** remove all handlers. */
  clear(): void {
    this.handlers = [];
  }
}
