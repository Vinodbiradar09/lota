export interface LotaRequestConfig extends RequestInit {
  url?: string;
  baseURL?: string;
  timeout?: number;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  data?: unknown;
}

export interface LotaResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: LotaRequestConfig;
  request: Response;
}

export interface InterceptorHandler {
  successFn: (value: any) => any | Promise<any>;
  failFn?: ((error: any) => any) | undefined;
}

class Interceptors {
  public handlers: (InterceptorHandler | null)[] = [];
  use(
    successFn: (value: any) => any | Promise<any>,
    failFn?: ((error: any) => any) | undefined,
  ): number {
    this.handlers.push({ successFn, failFn });
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

class Lota {
  private config: LotaRequestConfig = {};

  public interceptors = {
    request: new Interceptors(),
    response: new Interceptors(),
  };

  constructor(config: LotaRequestConfig) {
    this.config = this.mergeConfig(config);
  }

  async request<T = any>(
    config: LotaRequestConfig & { url: string },
  ): Promise<LotaResponse<T>> {
    const mergedConfig = this.mergeConfig(config);
    console.log("mergeConfig", mergedConfig);
    const chain: InterceptorHandler[] = [
      { successFn: this.dispatchRequest.bind(this), failFn: undefined },
    ];

    this.interceptors.request.handlers.forEach((handler) => {
      if (handler) chain.unshift(handler);
    });
    this.interceptors.response.handlers.forEach((handler) => {
      if (handler) chain.push(handler);
    });

    let promise = Promise.resolve(mergedConfig as any);
    for (const { successFn, failFn } of chain) {
      promise = promise.then(
        (res) => {
          try {
            return successFn(res);
          } catch (err) {
            if (failFn) return failFn(err);
            return Promise.reject(err);
          }
        },
        (err) => {
          if (failFn) return failFn(err);
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
      params,
      timeout,
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
        request: response,
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

  async get<T = any>(url: string, config: LotaRequestConfig = {}) {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  async delete<T = any>(url: string, config: LotaRequestConfig = {}) {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

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

  private mergeConfig(config: LotaRequestConfig): LotaRequestConfig {
    return {
      ...this.config,
      ...config,
      headers: {
        ...(this.config?.headers ?? {}),
        ...(config?.headers ?? {}),
      },
    };
  }
}

// Exports

const defaultInstance = new Lota({});
const lota = Object.assign(defaultInstance, {
  create(config: LotaRequestConfig = {}) {
    return new Lota(config);
  },
});

export default lota;
export { lota };
