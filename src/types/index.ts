export const RETRY_DEFAULT_DELAY = 300;
export const RETRY_DEFAULT_ON = [408, 429, 500, 502, 503, 504];

export interface InterceptorHandler<V> {
  fulfilled: (value: V) => V | Promise<V>;
  rejected?: ((error: unknown) => unknown) | undefined;
}

export interface RetryConfig {
  /**
   * Number of retry attempts after the initial request fails.
   * `3` means up to 4 total attempts (1 initial + 3 retries).
   * @default 0 (no retries)
   */
  times: number;
  /**
   * Base delay in milliseconds before the first retry.
   * With exponential backoff: attempt 1 → delay, attempt 2 → delay×2, attempt 3 → delay×4.
   * @default 300
   */
  delay?: number;
  /**
   * HTTP status codes that should trigger a retry.
   * Client errors (4xx except 408/429) are excluded by default — retrying won't help.
   * @default [408, 429, 500, 502, 503, 504]
   */
  on?: number[];
  /**
   * Backoff strategy.
   * - `'exponential'`: delay doubles with each attempt (recommended)
   * - `'fixed'`: same delay between every attempt
   * @default 'exponential'
   */
  backoff?: "exponential" | "fixed";
  /**
   * Add random ±25% jitter to the delay to avoid thundering-herd when many
   * clients retry simultaneously after a server recovers.
   * @default true
   */
  jitter?: boolean;
}

export interface LotaRequestConfig extends RequestInit {
  /** Full or relative URL. Relative URLs are resolved against `baseURL`. */
  url?: string;
  /** Base URL prepended to every relative `url`. */
  baseURL?: string;
  /** Request timeout in milliseconds. `undefined` = no timeout. */
  timeout?: number;
  /**
   * Query string parameters appended to the URL.
   * Arrays and nested objects are supported — see `arrayFormat` for array control.
   * Null and undefined values are silently skipped.
   * Nested objects use dot notation: `{ filter: { status: 'active' } }` → `filter.status=active`.
   */
  params?: Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | string[]
    | number[]
    | boolean[]
    | Record<string, string | number | boolean | null | undefined>
  >;
  /**
   * Controls how array values in `params` are serialised into the query string.
   * - `'repeat'`  — `ids=1&ids=2&ids=3`  (default — most REST APIs)
   * - `'comma'`   — `ids=1,2,3`          (some APIs / GraphQL)
   * - `'bracket'` — `ids[]=1&ids[]=2`    (PHP / Laravel style)
   * @default 'repeat'
   */
  arrayFormat?: "repeat" | "comma" | "bracket";
  /**
   * Explicit header map. Merged on top of instance-level headers.
   * Typed as `Record<string, string>` (not HeadersInit) so interceptors
   * can read/write headers without dealing with the Headers object API.
   */
  headers?: Record<string, string>;
  /**
   * JSON request body. `post` / `put` / `patch` serialise this to `body`.
   * Stripped before forwarding to `fetch()` so it never leaks into RequestInit.
   */
  data?: unknown;
  /**
   * Deduplication key. When two requests share the same `dedupeKey` on the
   * same instance, the first is aborted the moment the second is dispatched.
   * @example
   * api.get('/search', { params: { q }, dedupeKey: 'search' })
   */
  dedupeKey?: string;
  retry?: RetryConfig | false;
  validateStatus?: (status: number) => boolean;
  responseType?: "json" | "text" | "blob" | "arrayBuffer" | "stream" | "auto";
}

export interface LotaResponse<T = unknown> {
  /** Parsed response body — JSON object or plain string. */
  data: T;
  status: number;
  statusText: string;
  /** Raw fetch Response headers. */
  headers: Headers;
  /** The merged config that produced this response (lota-specific fields stripped). */
  config: LotaRequestConfig;
  /** The raw fetch() Response object for low-level access. */
  rawResponse: Response;
}

export type SerializedBody = {
  body: BodyInit | null;
  headers: Record<string, string>;
  // Bug 2 fix: headers to actively DELETE from the merged set after serialisation.
  // Needed for FormData — we cannot simply "not set" Content-Type because the
  // instance-level config may have Content-Type: application/json set globally,
  // and that would survive mergeConfig and corrupt the multipart boundary.
  deleteHeaders?: string[];
};

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

export type ParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | boolean[]
  | Record<string, string | number | boolean | null | undefined>;

/**
 * Type guard for catch blocks. Returns true when the error came from lota.
 * Narrows the type to LotaError so you can access .status, .response, .isHttpError.
 *
 * @example
 * } catch (err) {
 *   if (isLotaError(err)) {
 *     console.log(err.status)      // typed as number | undefined
 *     console.log(err.isHttpError) // true for 4xx/5xx, false for network errors
 *   }
 * }
 */
export function isLotaError(err: unknown): err is LotaError {
  return err instanceof LotaError;
}
export type NoBodyMethod = "get" | "head" | "delete" | "options";
export type BodyMethod = "post" | "put" | "patch";
