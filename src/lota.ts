class Lota {
  private config: any = {
    baseURL: "",
    timeout: 1000,
    headers: {
      "Content-Type": "application/json",
    },
  };

  private reqInterceptors: any = [];
  private resInterceptors: any = [];

  constructor(config: any) {
    this.config = this.mergeConflict(config);
  }

  async request({ path, config }: any) {
    console.log("path and config for request", path, config);
    const { baseURL, params, ...nativeConfig } = this.mergeConflict(config);
    const url = new URL(`${baseURL}${path}`);
    if (typeof params !== "undefined") {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key]),
      );
    }
    const chain = [
      ...this.reqInterceptors,
      {
        successFn: this.dispatchRequest.bind(this),
      },
      ...this.resInterceptors,
    ];
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

  async dispatchRequest({ url, config }: any) {
    console.log("the ", url, config);
    const { timeout, ...nativeConfig } = config;
    const abortController = new AbortController();
    let timeoutId;
    if (timeout) {
      timeoutId = setTimeout(() => abortController.abort(), timeout);
    }
    try {
      const res = await fetch(`${url}`, {
        ...nativeConfig,
        signal: abortController.signal,
      });
      return res;
    } finally {
      if (timeoutId) clearInterval(timeoutId);
    }
  }

  async get(path: string, config: any) {
    return this.request({ path, config });
    // return this.dispatchRequest({ path, config });
  }

  async post(path: string, data: any, config: any) {
    return this.dispatchRequest({
      path,
      config: { ...config, method: "POST", body: JSON.stringify(data) },
    });
  }

  async delete(path: string, config: any) {
    return this.dispatchRequest({
      path,
      config: { ...config, method: "DELETE" },
    });
  }

  async put(path: string, data: any, config: any) {
    return this.dispatchRequest({
      path,
      config: { ...config, method: "PUT", body: JSON.stringify(data) },
    });
  }

  async patch(path: string, data: any, config: any) {
    return this.dispatchRequest({
      path,
      config: { ...config, method: "PATCH", body: JSON.stringify(data) },
    });
  }

  private mergeConflict(config: any) {
    return {
      ...this.config,
      ...config,
      headers: {
        ...(this.config.headers || {}),
        ...(config.headers || {}),
      },
    };
  }

  async requestInterceptors(successFn: Function, failFn: Function) {
    this.reqInterceptors.push({ successFn, failFn });
  }
  async responseInterceptors(successFn: Function, failFn: Function) {
    this.resInterceptors.push({ successFn, failFn });
  }
}

const lota = {
  create(config: any) {
    return new Lota(config);
  },
};
export { lota };
