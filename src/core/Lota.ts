import { Interceptors } from "./Interceptors.js";
import { type InterceptorHandler } from "../types/index.js";
import type { LotaRequestConfig, LotaResponse } from "../types/index.js";

export class Lota {
  private config: LotaRequestConfig = {};
  public interceptors = {
    request: new Interceptors<LotaRequestConfig>(),
    response: new Interceptors<LotaResponse>(),
  };
  constructor(config: LotaRequestConfig) {
    this.config = this.mergeConfig(config, {});
  }

  async request<T = any>(
    config: LotaRequestConfig & { url: string },
  ): Promise<LotaResponse<T>> {
    const mergeConfig = this.mergeConfig(config);
    // the chain is an ordered pipeline
    // [request interceptors] → dispatchRequest → [response interceptors]
    //
    // request interceptors:  LotaRequestConfig  → LotaRequestConfig
    // dispatchRequest:        LotaRequestConfig  → LotaResponse        (the bridge)
    // response interceptors:  LotaResponse       → LotaResponse

    const chain: Array<InterceptorHandler<any>> = [
      { fulfilled: this.dispatchRequest.bind(this), rejected: undefined },
    ];

    this.interceptors.request.handlers.forEach((handler) => {
      if (handler) chain.unshift(handler);
    });
    this.interceptors.response.handlers.forEach((handler) => {
      if (handler) chain.push(handler);
    });

    let promise: Promise<unknown> = Promise.resolve(mergeConfig);
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

  private async dispatchRequest(
    config: LotaRequestConfig,
  ): Promise<LotaResponse> {
    const {
      url,
      baseURL,
      data: _data,
      timeout,
      params,
      signal: userSignal,
      ...nativeConfig
    } = config;
    const fullUrl = new URL(url ?? "", baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        fullUrl.searchParams.append(key, String(value));
      });
    }
    const abortController = new AbortController();
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
      let responseData: any = null;
      try {
        if (contentType?.includes("application/json")) {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : {};
        } else {
          responseData = await response.text();
        }
      } catch {
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
        return Promise.reject(lotaResponse);
      }
      return lotaResponse;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // HTTP helpers
  // keep config as optional on every method :- api.get("/users") just workss
  async get<T = any>(url: string, config: LotaRequestConfig = {}) {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  async delete<T = any>(url: string, config: LotaRequestConfig = {}) {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  // post/put/patch: explicit `data` arg takes precedence over config.data.
  // both styles work:
  //   api.post('/users', { name: 'shambavi' })
  //   api.post('/users', null, { data: { name: 'shambavi' } })
  async post<T = any>(
    url: string,
    data?: unknown,
    config: LotaRequestConfig = {},
  ) {
    const body = data ?? config.data;
    return this.request<T>({
      ...config,
      url,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T = any>(
    url: string,
    data?: unknown,
    config: LotaRequestConfig = {},
  ) {
    const body = data ?? config.data;
    return this.request<T>({
      ...config,
      url,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  async patch<T = any>(
    url: string,
    data?: unknown,
    config: LotaRequestConfig = {},
  ) {
    const body = data ?? config.data;
    return this.request<T>({
      ...config,
      url,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  private mergeConfig(
    config: LotaRequestConfig,
    base: LotaRequestConfig = this.config,
  ): LotaRequestConfig {
    return {
      ...base,
      ...config,
      timeout: config.timeout ?? 1000,
      headers: {
        ...(base?.headers ?? {}),
        ...(config?.headers ?? {}),
      },
    };
  }
}
