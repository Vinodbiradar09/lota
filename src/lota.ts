export interface LotaRequestConfig extends RequestInit {
  baseURL?: string;
  timeout?: number;
  path?: string;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  data?: any;
}

export interface LotaResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: LotaRequestConfig;
  request: Response;
}

export interface InterceptorHandler<V> {
  successFn: (value: any) => any | Promise<any>;
  failFn?: ((error: any) => any) | undefined;
}

type ChainEntry = {
  successFn: (value: any) => any | Promise<any>;
  failFn?: ((error: any) => any) | undefined;
};

class Lota {
  private config: LotaRequestConfig;
  // private config: any = {
  //   baseURL: "",
  //   timeout: 1000,
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  // };

  public interceptors = {
    request: new Interceptors<LotaRequestConfig>(),
    response: new Interceptors<LotaResponse>(),
  };

  constructor(config: LotaRequestConfig) {
    this.config = this.mergeConfig(config);
  }

  async request<T = any>({
    path,
    config,
  }: {
    path: string;
    config: LotaRequestConfig;
  }): Promise<LotaResponse<T>> {
    const { baseURL, params, ...nativeConfig } = this.mergeConfig(config);
    console.log("baseURL", baseURL);
    console.log("params", params);
    console.log("nativeConfig", nativeConfig);
    const url = new URL(path, baseURL);
    if (typeof params !== "undefined") {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    const chain: ChainEntry[] = [
      { successFn: this.dispatchRequest.bind(this), failFn: undefined },
    ];
    this.interceptors.request.handlers.forEach((handler) => {
      if (handler) chain.unshift(handler);
    });
    this.interceptors.response.handlers.forEach((handler) => {
      if (handler) chain.push(handler);
    });

    let promise = Promise.resolve({ url, config: nativeConfig });
    for (const { successFn, failFn } of chain) {
      promise = promise.then(
        (res) => {
          try {
            return successFn(res);
          } catch (err) {
            if (failFn) {
              return failFn(err);
            }
            return Promise.reject(err);
          }
        },
        (err) => {
          if (failFn) {
            return failFn(err);
          }
          return Promise.reject(err);
        },
      );
    }
    return promise as Promise<any>;
  }

  private async dispatchRequest({
    url,
    config,
  }: {
    url: URL;
    config: LotaRequestConfig;
  }): Promise<LotaResponse> {
    console.log("url and config", url, config);
    const { timeout, ...nativeConfig } = config;
    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeout) {
      timeoutId = setTimeout(() => abortController.abort(), timeout);
    }
    try {
      const response = await fetch(url.toString(), {
        ...nativeConfig,
        signal: abortController.signal,
      });
      // determine we should parse as JSON
      const contentType = response.headers.get("content-type");
      let data = null;
      if (contentType && contentType.includes("application/json")) {
        // handle empty response gracefully
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } else {
        data = await response.text();
      }
      const lotaResponse: LotaResponse = {
        data,
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

  async get<T = any>(path: string, config: LotaRequestConfig) {
    return this.request<T>({ path, config: { ...config, method: "GET" } });
  }

  async post<T = any>(path: string, data: any, config: LotaRequestConfig) {
    return this.request<T>({
      path,
      config: { ...config, method: "POST", body: JSON.stringify(data) },
    });
  }

  async delete<T = any>(path: string, config: LotaRequestConfig) {
    return this.request<T>({
      path,
      config: { ...config, method: "DELETE" },
    });
  }

  async put<T = any>(path: string, data: any, config: LotaRequestConfig) {
    return this.request<T>({
      path,
      config: { ...config, method: "PUT", body: JSON.stringify(data) },
    });
  }

  async patch<T = any>(path: string, data: any, config: LotaRequestConfig) {
    return this.request<T>({
      path,
      config: { ...config, method: "PATCH", body: JSON.stringify(data) },
    });
  }

  private mergeConfig(config: LotaRequestConfig): LotaRequestConfig {
    return {
      ...this.config,
      ...config,
      headers: {
        ...(this.config.headers || {}),
        ...(config?.headers || {}),
      },
    };
  }
}
const lota = {
  create(config: any) {
    return new Lota(config);
  },
};

export { lota };

class Interceptors<T> {
  public handlers: (InterceptorHandler<T> | null)[] = [];

  use(
    successFn: (value: T) => T | Promise<T>,
    failFn?: (error: any) => any | undefined,
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
