export interface InterceptorHandler<V> {
  fulfilled: (value: V) => V | Promise<V>;
  rejected?: ((error: unknown) => unknown) | undefined;
}

export interface LotaRequestConfig extends RequestInit {
  /** full or relative URL. relative URLs are resolved against `baseURL`. */
  url?: string;
  /** Base URL prepended to every relative `url`. */
  baseURL?: string;
  /** request timeout in milliseconds. `undefined` = no timeout. */
  timeout?: number;
  /** query string parameters appended to the URL. */
  params?: Record<string, string | number | boolean>;
  /**
   * explicit header map. Merged on top of instance-level headers.
   * typed as `Record<string, string>` (not HeadersInit) so interceptors
   * can read/write headers without dealing with the Headers object API.
   */
  headers?: Record<string, string>;
  /**
   * JSON request body. `post` / `put` / `patch` serialise this to `body`.
   * stripped before forwarding to `fetch()` so it never leaks into RequestInit.
   */
  data?: unknown;
  /**
   * deduplication key. When two requests share the same `dedupeKey` on the
   * same instance, the first is aborted the moment the second is dispatched.
   * supersedes the previous one.
   *
   * @example
   * // Only the last keystroke's request survives:
   * api.get('/search', { params: { q }, dedupeKey: 'search' })
   *
   * the aborted request throws a LotaError that CancelController.isCancelError()
   * returns true for so you can silently swallow it in your catch block.
   */

  dedupeKey?: string;
}

export interface LotaResponse<T = unknown> {
  /** parsed response body JSON object or plain string. */
  data: T;
  status: number;
  statusText: string;
  /** raw fetch Response headers. */
  headers: Headers;
  /** the merged config that produced this response (lota-specific fields stripped). */
  config: LotaRequestConfig;
  /** the raw fetch() Response object for low-level access. */
  rawResponse: Response;
}

export class LotaError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly response: LotaResponse<T> | null,
    public readonly config: LotaRequestConfig,
  ) {
    super(message);
    this.name = "LotaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isHttpError(): boolean {
    return this.response !== null;
  }

  get status(): number | undefined {
    return this.response?.status;
  }
}

/**
 * the public surface of a Lota instance.
 * declared as an interface so the prototype-injection pattern can extend
 * the class type while keeping each method's signature explicit and checkable.
 */
export interface LotaInstance {
  get<T = unknown>(
    url: string,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  head<T = unknown>(
    url: string,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  delete<T = unknown>(
    url: string,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  options<T = unknown>(
    url: string,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: LotaRequestConfig,
  ): Promise<LotaResponse<T>>;
}

/** methods that take no request body. */
export type NoBodyMethod = "get" | "head" | "delete" | "options";
/** methods that take a request body. */
export type BodyMethod = "post" | "put" | "patch";
