class Lota {
  private config: any = {
    baseURL: "",
    timeout: 1000,
    headers: {
      "Content-Type": "application/json",
    },
  };
  constructor(config: any) {
    this.config = this.mergeConfig(config);
  }

  async dispatchRequest({ url, config }: any) {
    const finalConfig = this.mergeConfig(config);
    const { baseURL, ...nativeConfig } = finalConfig;
    const abortController = new AbortController();
    const timeout = finalConfig.timeout;
    let timeoutId;
    if (timeout) {
      timeoutId = setInterval(() => abortController.abort(), timeout);
    }
    try {
      const res = await fetch(`${baseURL}${url}`, {
        ...nativeConfig,
        signal: abortController.signal,
      });
      return res;
    } finally {
      if (timeout) clearInterval(timeoutId);
    }
  }

  async get(url: string, config: any) {
    return this.dispatchRequest({ url, config });
  }

  async post(url: string, data: any, config: any) {
    return this.dispatchRequest({
      url,
      config: { ...config, method: "POST", body: JSON.stringify(data) },
    });
  }

  async delete(url: string, config: any) {
    return this.dispatchRequest({
      url,
      config: { ...config, method: "DELETE" },
    });
  }
  async put(url: string, data: any, config: any) {
    return this.dispatchRequest({
      url,
      config: { ...config, method: "PUT", body: JSON.stringify(data) },
    });
  }
  async patch(url: string, data: any, config: any) {
    return this.dispatchRequest({
      url,
      config: { ...config, method: "PATCH", body: JSON.stringify(data) },
    });
  }

  private mergeConfig(config: any) {
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
