class Lota {
  private config: any = {
    baseURL: "",
    timeout: 1000,
    headers: {
      "Content-Type": "application/json",
    },
  };

  public interceptors = {
    request: new Interceptors(),
    response: new Interceptors(),
  };

  constructor(config: any) {
    this.config = this.mergeConfig(config);
  }

  async request({ path, config }: any) {
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
    const chain = [
      { successFn: this.dispatchRequest.bind(this), failFn: undefined },
    ];
    this.interceptors.request.handlers.forEach((handler) => {
      chain.unshift(handler);
    });
    this.interceptors.response.handlers.forEach((handler) => {
      chain.push(handler);
    });

    let promise = Promise.resolve({ url, config: nativeConfig });
    for (const { successFn, failFn } of chain) {
      promise = promise.then(
        (res) => {
          try {
            return successFn(res);
          } catch (err) {
            if (failFn) {
              // @ts-ignore
              return failFn(err);
            }
            return Promise.reject(err);
          }
        },
        (err) => {
          if (failFn) {
            // @ts-ignore
            return failFn(err);
          }
          return Promise.reject(err);
        },
      );
    }
    return promise as Promise<any>;
  }

  async dispatchRequest({ url, config }: any) {
    console.log("url and config", url, config);
    const { timeout, ...nativeConfig } = config;
    const abortController = new AbortController();
    let timeoutId;
    if (timeout) {
      timeoutId = setTimeout(() => abortController.abort(), timeout);
    }
    try {
      const res = await fetch(url, {
        ...nativeConfig,
        signal: abortController.signal,
      });
      return res;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async get(path: string, config: any) {
    return this.request({ path, config });
  }

  async post(path: string, data: any, config: any) {
    return this.request({
      path,
      config: { ...config, method: "POST", body: JSON.stringify(data) },
    });
  }

  async delete(path: string, config: any) {
    return this.request({
      path,
      config: { ...config, method: "DELETE" },
    });
  }

  async put(path: string, data: any, config: any) {
    return this.request({
      path,
      config: { ...config, method: "PUT", body: JSON.stringify(data) },
    });
  }

  async patch(path: string, data: any, config: any) {
    return this.request({
      path,
      config: { ...config, method: "PATCH", body: JSON.stringify(data) },
    });
  }

  mergeConfig(config: any) {
    return {
      ...this.config,
      ...config,
      headers: {
        ...(this.config.headers || {}),
        ...(config.headers || {}),
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

class Interceptors {
  public handlers: any[];
  constructor() {
    this.handlers = [];
  }

  use(successFn: Function, failFn: Function) {
    this.handlers.push({ successFn, failFn });
  }
}
