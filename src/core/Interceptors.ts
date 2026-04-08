import type { InterceptorHandler } from "../types/index.js";

export class Interceptors<T> {
  public handlers: (InterceptorHandler<T> | null)[] = [];
  use(
    fulfilled: (value: T) => T | Promise<T>,
    rejected?: ((error: unknown) => unknown) | undefined,
  ): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  eject(id: number): void {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  clear(): void {
    this.handlers = [];
  }
}
