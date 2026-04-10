import { computeDelay } from "./ComputeDelay.js";
import { Interceptors } from "./Interceptors.js";
import {
  LotaError,
  type BodyMethod,
  type InterceptorHandler,
  type LotaInstance,
  type LotaRequestConfig,
  type LotaResponse,
  type NoBodyMethod,
  type RetryConfig,
} from "../types/index.js";
import { shouldRetry } from "./ShouldRetry.js";
import { retryDelay } from "./RetryDelay.js";

export interface Lota extends LotaInstance {}

export class Lota {
  private config: LotaRequestConfig = {};
  public interceptors = {
    request: new Interceptors<LotaRequestConfig>(),
    response: new Interceptors<LotaResponse>(),
  };
  // deduplication tracking
  private readonly inFlight = new Map<string, AbortController>();
  constructor(config: LotaRequestConfig) {
    this.config = this.mergeConfig(config, {});
  }

  async request<T = unknown>(
    config: LotaRequestConfig & { url: string },
  ): Promise<LotaResponse<T>> {
    const mergedConfig = this.mergeConfig(config);
    // the chain is an ordered pipeline
    // [request interceptors] → dispatchRequest → [response interceptors]
    //
    // request interceptors:  LotaRequestConfig  → LotaRequestConfig
    // dispatchRequest:        LotaRequestConfig  → LotaResponse        (the bridge)
    // response interceptors:  LotaResponse       → LotaResponse

    const chain: Array<InterceptorHandler<any>> = [
      { fulfilled: this.executeWithRetry.bind(this), rejected: undefined },
    ];

    this.interceptors.request.handlers.forEach((h) => {
      if (h) chain.unshift(h);
    });
    this.interceptors.response.handlers.forEach((h) => {
      if (h) chain.push(h);
    });

    let promise: Promise<unknown> = Promise.resolve(mergedConfig);
    for (const { fulfilled, rejected } of chain) {
      promise = promise.then(
        (res) => {
          try {
            return fulfilled(res);
          } catch (err) {
            if (rejected) {
              return rejected(err);
            }
            return Promise.reject(err);
          }
        },
        (err) => {
          if (rejected) return rejected(err);
          return Promise.reject(err);
        },
      );
    }
    return promise as Promise<LotaResponse<T>>;
  }

  private async executeWithRetry(config: LotaRequestConfig) {
    const retryCfg: RetryConfig | false =
      config.retry === false ? false : (config.retry ?? false);
    if (retryCfg === false || retryCfg.times <= 0) {
      return this.dispatchRequest(config);
    }
    const maxTries = retryCfg.times;
    const signal =
      config.signal instanceof AbortSignal ? config.signal : undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxTries + 1; attempt++) {
      try {
        return await this.dispatchRequest(config);
      } catch (err) {
        lastError = err;
        const isLastAttempt = attempt > maxTries;
        // Never retry if: last attempt, signal aborted, or error type not retryable
        if (isLastAttempt || signal?.aborted || !shouldRetry(err, retryCfg)) {
          throw err;
        }
        const delay = computeDelay(retryCfg, attempt);
        await retryDelay(delay, signal);
      }
    }
    throw lastError;
  }

  private async dispatchRequest(
    config: LotaRequestConfig,
  ): Promise<LotaResponse> {
    const {
      url,
      baseURL,
      params,
      timeout,
      retry: _retry, // retry config consumed by executeWithRetry, never pass to fetch
      dedupeKey,
      data: _data, // already serialised into `body` by the method helpers
      signal: userSignal,
      ...nativeConfig
    } = config;
    // URL is constructed here, after all request interceptors have run,
    // so interceptor mutations to url / baseURL / params are respected.
    const fullUrl = new URL(url ?? "", baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        fullUrl.searchParams.append(key, String(value));
      });
    }
    const abortController = new AbortController();
    if (dedupeKey) {
      const previous = this.inFlight.get(dedupeKey);
      if (previous) {
        // Abort the previous request it will throw LotaError("Request aborted")
        // which CancelController.isCancelError() catches cleanly.
        previous.abort();
      }
      this.inFlight.set(dedupeKey, abortController);
    }
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timeoutId = setTimeout(() => abortController.abort(), timeout);
    }
    // combine user supplied signal with timeout signal so both work independently.
    const signal = userSignal
      ? AbortSignal.any([abortController.signal, userSignal])
      : abortController.signal;

    try {
      const response = await fetch(fullUrl.toString(), {
        ...nativeConfig,
        signal,
      });
      const contentType = response.headers.get("content-type");
      let responseData: unknown = null;
      try {
        if (contentType?.includes("application/json")) {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : {};
        } else {
          responseData = await response.text();
        }
      } catch {
        // malformed body keep null, HTTP error info is still preserved below.
        responseData = null;
      }
      const lotaResponse: LotaResponse = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: nativeConfig,
        rawResponse: response,
      };
      if (!response.ok) {
        throw new LotaError(
          `Request failed with status ${response.status}`,
          lotaResponse,
          config,
        );
      }
      return lotaResponse;
    } catch (err) {
      if (err instanceof LotaError) throw err;
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "Request aborted"
          : err instanceof Error
            ? err.message
            : "Network error";
      throw new LotaError(message, null, config);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (dedupeKey && this.inFlight.get(dedupeKey) === abortController) {
        this.inFlight.delete(dedupeKey);
      }
    }
  }

  private mergeConfig(
    config: LotaRequestConfig,
    base: LotaRequestConfig = this.config,
  ): LotaRequestConfig {
    return {
      ...base,
      ...config,
      ...(typeof config.timeout !== "undefined"
        ? { timeout: config.timeout }
        : typeof base.timeout !== "undefined"
          ? { timeout: base.timeout }
          : {}),
      // retry: per-request value takes full precedence (including `false`).
      // If neither is set, no retry. we don't deep-merge a per-request
      // { times: 1 } replaces the whole instance config, not just `times`.
      ...(typeof config.retry !== "undefined"
        ? { retry: config.retry }
        : typeof base.retry !== "undefined"
          ? { retry: base.retry }
          : {}),
      // deep-merge headers so instance-level defaults are never silently dropped.
      headers: {
        ...(base?.headers ?? {}),
        ...(config?.headers ?? {}),
      },
    };
  }
}
const NO_BODY_METHODS = [
  "get",
  "head",
  "delete",
  "options",
] as const satisfies readonly NoBodyMethod[];

const BODY_METHODS = [
  "post",
  "put",
  "patch",
] as const satisfies readonly BodyMethod[];

type LotaProto = Lota & Record<string, (...args: any[]) => any>;

NO_BODY_METHODS.forEach((method) => {
  (Lota.prototype as LotaProto)[method] = function (
    url: string,
    config: LotaRequestConfig = {},
  ): Promise<LotaResponse<any>> {
    return this.request({ ...config, url, method: method.toUpperCase() });
  };
});

BODY_METHODS.forEach((method) => {
  (Lota.prototype as LotaProto)[method] = function (
    url: string,
    data?: unknown,
    config: LotaRequestConfig = {},
  ): Promise<LotaResponse<any>> {
    const body = data ?? config.data;
    return this.request({
      ...config,
      url,
      method: method.toUpperCase(),
      body: JSON.stringify(body),
    });
  };
});
