export interface InterceptorHandler<V> {
  fulfilled: (value: V) => V | Promise<V>;
  rejected?: ((error: unknown) => unknown) | undefined;
}

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
  // field holds raw response
  rawResponse: Response;
}
