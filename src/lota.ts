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

  async dispatchRequest(url: any, config: any) {
    console.log("config", config);
    const finalConfig = this.mergeConfig(config);
    console.log("final", finalConfig);

    const { baseURL, ...nativeConfig } = finalConfig;
    console.log("b", baseURL, nativeConfig);
    const response = await fetch(`${baseURL}${url}`, {
      ...nativeConfig,
    });
    const data = await response.json();
    return data;
  }

  async get(url: string, config: any) {
    const data = await this.dispatchRequest(url, config);
    console.log("data", data);
  }

  async post(url: string, data: any, config: any) {
    const finalConfig = this.mergeConfig(config);
    const { baseURL, ...nativeConfig } = finalConfig;
    const packed = this.packPostConfig(nativeConfig, data);
    console.log("packed", packed);
    const r = await this.dispatchRequest(url, packed);
    console.log("rr", r);
    // const res = await fetch(`${baseURL}${url}`, {
    //   method: "POST",
    //   body: JSON.stringify(data),
    //   headers: {
    //     ...nativeConfig.headers,
    //   },
    // });
    // const d = await res.json();
    // console.log("ddd", d);
  }

  private packPostConfig(config: any, data: any) {
    return {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    };
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
