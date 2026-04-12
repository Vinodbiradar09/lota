import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CancelController } from "../src/core/CancelController.js";
import { LotaError, isLotaError } from "../src/types/index.js";
import { Lota } from "../src/core/Lota.js";

function mockFetch(
  body: unknown,
  options: { status?: number; contentType?: string } = {},
) {
  const { status = 200, contentType = "application/json" } = options;
  const bodyStr =
    contentType === "application/json" ? JSON.stringify(body) : String(body);
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(bodyStr, {
      status,
      headers: { "Content-Type": contentType },
    }),
  );
}

function mockFetchNetworkError(message = "Network failure") {
  return vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error(message));
}

function mockFetchAbortable() {
  return vi.spyOn(globalThis, "fetch").mockImplementationOnce(
    (_url: unknown, init: unknown) =>
      new Promise<Response>((_, reject) => {
        const signal = (init as RequestInit).signal;
        const abort = () => reject(new DOMException("Aborted", "AbortError"));
        if (signal?.aborted) abort();
        else signal?.addEventListener("abort", abort, { once: true });
      }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Lota constructor", () => {
  it("creates instance with empty config", () => {
    expect(() => new Lota()).not.toThrow();
  });

  it("accepts valid baseURL", () => {
    expect(() => new Lota({ baseURL: "http://api.example.com" })).not.toThrow();
  });

  it("throws LotaError for invalid baseURL", () => {
    expect(() => new Lota({ baseURL: "localhost:3000" })).toThrow(LotaError);
  });

  it("invalid baseURL error message is descriptive", () => {
    try {
      new Lota({ baseURL: "localhost:3000" });
    } catch (err) {
      expect(isLotaError(err)).toBe(true);
      expect((err as LotaError).message).toContain("Invalid baseURL");
      expect((err as LotaError).message).toContain("localhost:3000");
    }
  });

  it("stores instance config", async () => {
    mockFetch({});
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "X-App": "lota" },
    });
    await api.get("/users");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)?.["X-App"]).toBe("lota");
  });
});

describe("Lota HTTP helpers", () => {
  const api = new Lota({ baseURL: "http://api.example.com" });

  it.each(["get", "head", "delete", "options"] as const)(
    "%s() sets correct HTTP method",
    async (method) => {
      mockFetch({});
      await (api[method] as Function)("/path");
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(init.method).toBe(method.toUpperCase());
    },
  );

  it.each(["post", "put", "patch"] as const)(
    "%s() serialises object body as JSON",
    async (method) => {
      mockFetch({});
      await (api[method] as Function)("/path", { name: "arjun" });
      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(init.body).toBe(JSON.stringify({ name: "arjun" }));
      expect(init.method).toBe(method.toUpperCase());
    },
  );

  it("post() prefers explicit data over config.data", async () => {
    mockFetch({});
    await api.post("/path", { explicit: true }, { data: { fromConfig: true } });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.body).toBe(JSON.stringify({ explicit: true }));
  });

  it("post() falls back to config.data when data arg is undefined", async () => {
    mockFetch({});
    await api.post("/path", undefined, { data: { fromConfig: true } });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(init.body).toBe(JSON.stringify({ fromConfig: true }));
  });

  it("get() works with no config argument", async () => {
    const api2 = new Lota({ baseURL: "http://api.example.com" });
    mockFetch([]);
    const res = await api2.get("/users");
    expect(res.status).toBe(200);
  });
});

describe("Lota URL construction", () => {
  it("resolves relative url against baseURL correctly (Issue 8)", async () => {
    const api = new Lota({ baseURL: "http://api.example.com/v1" });
    mockFetch({});
    await api.get("/users");
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toBe("http://api.example.com/v1/users");
  });

  it("appends params as query string", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetch({});
    await api.get("/search", { params: { q: "hello", page: 2 } });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("q=hello");
    expect(url).toContain("page=2");
  });

  it("uses repeat arrayFormat by default", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetch({});
    await api.get("/users", { params: { ids: [1, 2, 3] } });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("ids=1");
    expect(url).toContain("ids=2");
    expect(url).toContain("ids=3");
  });

  it("respects bracket arrayFormat from instance config", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      arrayFormat: "bracket",
    });
    mockFetch({});
    await api.get("/users", { params: { ids: [1, 2] } });
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("ids%5B%5D=1");
  });
});

describe("Lota response parsing", () => {
  const api = new Lota({ baseURL: "http://api.example.com" });

  it("parses JSON response", async () => {
    mockFetch({ id: 1, name: "arjun" });
    const res = await api.get("/user");
    expect(res.data).toEqual({ id: 1, name: "arjun" });
  });

  it("returns empty object for empty JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const res = await api.get("/empty");
    expect(res.data).toEqual({});
  });

  it("returns text for non-JSON responses", async () => {
    mockFetch("plain text", { contentType: "text/plain" });
    const res = await api.get("/text");
    expect(res.data).toBe("plain text");
  });

  it("returns null data when body parse fails but preserves status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("not json }{", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const err = await api.get("/broken").catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.status).toBe(500);
    expect(err.response?.data).toBeNull();
  });

  it("populates rawResponse with the fetch Response", async () => {
    mockFetch({ ok: true });
    const res = await api.get("/anything");
    expect(res.rawResponse).toBeInstanceOf(Response);
  });

  it("responseType: 'text' returns string regardless of Content-Type", async () => {
    mockFetch({ id: 1 });
    const res = await api.get("/user", { responseType: "text" });
    expect(typeof res.data).toBe("string");
    expect(res.data).toBe(JSON.stringify({ id: 1 }));
  });

  it("responseType: 'blob' returns a Blob", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("binary", {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
    const res = await api.get("/file", { responseType: "blob" });
    expect(res.data).toBeInstanceOf(Blob);
  });

  it("responseType: 'stream' returns ReadableStream", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("streaming data", { status: 200 }),
    );
    const res = await api.get("/stream", { responseType: "stream" });
    expect(res.data).toBeInstanceOf(ReadableStream);
  });
});

describe("Lota error handling", () => {
  const api = new Lota({ baseURL: "http://api.example.com" });

  it("throws LotaError for 4xx responses", async () => {
    mockFetch({ message: "Not found" }, { status: 404 });
    await expect(api.get("/missing")).rejects.toThrow(LotaError);
  });

  it("throws LotaError for 5xx responses", async () => {
    mockFetch({ message: "Server error" }, { status: 500 });
    await expect(api.get("/crash")).rejects.toThrow(LotaError);
  });

  it("LotaError carries status from response", async () => {
    mockFetch({ message: "Forbidden" }, { status: 403 });
    const err = await api.get("/secret").catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.status).toBe(403);
    expect(err.isHttpError).toBe(true);
  });

  it("LotaError carries parsed response body", async () => {
    mockFetch({ detail: "rate limited" }, { status: 429 });
    const err = await api.get("/rate").catch((e) => e);
    expect(err.response?.data).toEqual({ detail: "rate limited" });
  });

  it("throws LotaError for network failures", async () => {
    mockFetchNetworkError("Failed to fetch");
    const err = await api.get("/network").catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.isHttpError).toBe(false);
    expect(err.response).toBeNull();
    expect(err.message).toBe("Failed to fetch");
  });
});

describe("Lota validateStatus", () => {
  it("treats 404 as success when validateStatus allows it", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      validateStatus: (s) => s < 500,
    });
    mockFetch({ message: "not found" }, { status: 404 });
    const res = await api.get("/missing");
    expect(res.status).toBe(404);
  });

  it("treats 200 as error when validateStatus rejects it", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      validateStatus: () => false,
    });
    mockFetch({ ok: true });
    await expect(api.get("/")).rejects.toThrow(LotaError);
  });

  it("per-request validateStatus overrides instance", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      validateStatus: () => false,
    });
    mockFetch({ ok: true });
    const res = await api.get("/", { validateStatus: () => true });
    expect(res.status).toBe(200);
  });
});

describe("Lota header merging", () => {
  it("merges instance headers with per-request headers", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "Content-Type": "application/json", "X-App": "lota" },
    });
    mockFetch({});
    await api.get("/", { headers: { Authorization: "Bearer token" } });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    expect(h["Content-Type"]).toBe("application/json");
    expect(h["X-App"]).toBe("lota");
    expect(h["Authorization"]).toBe("Bearer token");
  });

  it("per-request headers override instance headers", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "Content-Type": "application/json" },
    });
    mockFetch({});
    await api.get("/", { headers: { "Content-Type": "text/plain" } });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    expect(h["Content-Type"]).toBe("text/plain");
  });
});

describe("Lota FormData body (Bug 2 fix)", () => {
  it("does not send Content-Type when posting FormData", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "Content-Type": "application/json" },
    });
    mockFetch({});
    const fd = new FormData();
    await api.post("/upload", fd);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    const keys = Object.keys(h).map((k) => k.toLowerCase());
    expect(keys).not.toContain("content-type");
  });

  it("strips lowercase content-type header for FormData too", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "content-type": "application/json" },
    });
    mockFetch({});
    const fd = new FormData();
    await api.post("/upload", fd);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    const keys = Object.keys(h).map((k) => k.toLowerCase());
    expect(keys).not.toContain("content-type");
  });
});

describe("Lota nativeConfig cleanliness", () => {
  it("does not pass lota-specific fields to fetch", async () => {
    const api = new Lota({ baseURL: "http://api.example.com", timeout: 5000 });
    mockFetch({});
    await api.post(
      "/users",
      { name: "test" },
      { params: { v: 2 }, dedupeKey: "x", retry: false },
    );
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const keys = Object.keys(init);
    expect(keys).not.toContain("baseURL");
    expect(keys).not.toContain("timeout");
    expect(keys).not.toContain("params");
    expect(keys).not.toContain("data");
    expect(keys).not.toContain("url");
    expect(keys).not.toContain("dedupeKey");
    expect(keys).not.toContain("retry");
    expect(keys).not.toContain("validateStatus");
    expect(keys).not.toContain("responseType");
    expect(keys).not.toContain("arrayFormat");
  });
});

describe("Lota request interceptors", () => {
  it("request interceptor can mutate config before dispatch", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    api.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, Authorization: "Bearer injected" },
    }));
    mockFetch({});
    await api.get("/secure");
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)?.["Authorization"]).toBe(
      "Bearer injected",
    );
  });

  it("multiple request interceptors run in LIFO order", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const order: number[] = [];
    api.interceptors.request.use((c) => {
      order.push(1);
      return c;
    });
    api.interceptors.request.use((c) => {
      order.push(2);
      return c;
    });
    mockFetch({});
    await api.get("/");
    expect(order).toEqual([2, 1]);
  });

  it("ejected interceptor does not run", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const fn = vi.fn((c: unknown) => c);
    const id = api.interceptors.request.use(fn as any);
    api.interceptors.request.eject(id);
    mockFetch({});
    await api.get("/");
    expect(fn).not.toHaveBeenCalled();
  });

  it("request interceptor rejected handler is called on interceptor throw", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const onRejected = vi.fn((e: unknown) => Promise.reject(e));
    api.interceptors.request.use(() => {
      throw new Error("interceptor blew up");
    }, onRejected);
    mockFetch({});
    await expect(api.get("/")).rejects.toThrow();
    expect(onRejected).toHaveBeenCalled();
  });
});

describe("Lota response interceptors", () => {
  it("response interceptor can transform response data", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    api.interceptors.response.use((res) => ({
      ...res,
      data: { wrapped: res.data },
    }));
    mockFetch({ id: 1 });
    const res = await api.get("/user");
    expect(res.data).toEqual({ wrapped: { id: 1 } });
  });

  it("multiple response interceptors run in FIFO order", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const order: number[] = [];
    api.interceptors.response.use((r) => {
      order.push(1);
      return r;
    });
    api.interceptors.response.use((r) => {
      order.push(2);
      return r;
    });
    mockFetch({});
    await api.get("/");
    expect(order).toEqual([1, 2]);
  });
});

describe("Lota timeout", () => {
  it("aborts request when timeout expires", async () => {
    const api = new Lota({ baseURL: "http://api.example.com", timeout: 50 });
    mockFetchAbortable();
    const err = await api.get("/slow").catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.message).toBe("Request aborted");
  }, 3000);

  it("does not abort when request completes before timeout", async () => {
    const api = new Lota({ baseURL: "http://api.example.com", timeout: 5000 });
    mockFetch({ ok: true });
    const res = await api.get("/fast");
    expect(res.status).toBe(200);
  });

  it("per-request timeout overrides instance timeout", async () => {
    const api = new Lota({ baseURL: "http://api.example.com", timeout: 9999 });
    mockFetchAbortable();
    const err = await api.get("/slow", { timeout: 50 }).catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.message).toBe("Request aborted");
  }, 3000);
});

describe("Lota deduplication (dedupeKey)", () => {
  it("aborts previous request when new one with same key is dispatched", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetchAbortable();
    mockFetch({ result: "second" });

    const p1 = api.get("/search", { dedupeKey: "search" }).catch((e) => e);
    const p2 = api.get("/search", { dedupeKey: "search" });

    const [err, res] = await Promise.all([p1, p2]);
    expect(CancelController.isCancelError(err)).toBe(true);
    expect(res.data).toEqual({ result: "second" });
  });

  it("does not affect requests with different dedupeKeys", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetch({ a: 1 });
    mockFetch({ b: 2 });

    const [r1, r2] = await Promise.all([
      api.get("/a", { dedupeKey: "key-a" }),
      api.get("/b", { dedupeKey: "key-b" }),
    ]);
    expect(r1.data).toEqual({ a: 1 });
    expect(r2.data).toEqual({ b: 2 });
  });

  it("cleans up inFlight map after request completes", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetch({ ok: true });
    await api.get("/users", { dedupeKey: "users" });
    mockFetch({ ok: true });
    const res = await api.get("/users", { dedupeKey: "users" });
    expect(res.status).toBe(200);
  });
});

describe("Lota retry", () => {
  it("retries on 503 and succeeds on second attempt", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const res = await api.get("/flaky", {
      retry: { times: 1, delay: 0, jitter: false },
    });
    expect(res.data).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retries", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const err = await api
      .get("/down", { retry: { times: 2, delay: 0, jitter: false } })
      .catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry non-retryable status codes (404)", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await api
      .get("/missing", { retry: { times: 3, delay: 0, jitter: false } })
      .catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retry: false disables instance-level retry", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      retry: { times: 3, delay: 0, jitter: false },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await api
      .post("/payment", { amount: 100 }, { retry: false })
      .catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry aborted requests", async () => {
    const api = new Lota({ baseURL: "http://api.example.com", timeout: 50 });
    mockFetchAbortable();
    const err = await api
      .get("/slow", { retry: { times: 3, delay: 0, jitter: false } })
      .catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(err.message).toBe("Request aborted");
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 3000);

  it("retry dedupeKey is stripped from retry attempts (Bug 1 fix)", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      if (callCount === 1)
        return new Response("{}", {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const res = await api.get("/search", {
      dedupeKey: "search",
      retry: { times: 1, delay: 10, jitter: false },
    });
    expect(res.data).toEqual({ ok: true });
    expect(callCount).toBe(2);
  });
});

describe("Lota CancelController integration", () => {
  it("cancels an in-flight request", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const cc = new CancelController();
    mockFetchAbortable();

    const req = api.get("/slow", { signal: cc.signal }).catch((e) => e);
    cc.cancel("test");
    await Promise.resolve();

    const err = await req;
    expect(CancelController.isCancelError(err)).toBe(true);
  });

  it("one controller cancels multiple requests simultaneously", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const cc = new CancelController();
    mockFetchAbortable();
    mockFetchAbortable();

    const p1 = api.get("/a", { signal: cc.signal }).catch((e) => e);
    const p2 = api.get("/b", { signal: cc.signal }).catch((e) => e);
    cc.cancel();
    await Promise.resolve();

    const [e1, e2] = await Promise.all([p1, p2]);
    expect(CancelController.isCancelError(e1)).toBe(true);
    expect(CancelController.isCancelError(e2)).toBe(true);
  });

  it("completed request is not affected by late cancel", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const cc = new CancelController();
    mockFetch({ ok: true });

    const res = await api.get("/fast", { signal: cc.signal });
    cc.cancel();
    expect(res.status).toBe(200);
  });
});

describe("Lota responseType: 'json' explicit", () => {
  it("parses response as JSON regardless of Content-Type header", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ forced: true }), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const res = await api.get("/data", { responseType: "json" });
    expect(res.data).toEqual({ forced: true });
  });

  it("returns empty object for empty body with responseType: json", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const res = await api.get("/empty", { responseType: "json" });
    expect(res.data).toEqual({});
  });
});

describe("Lota auto response parsing (text branch)", () => {
  it("returns text string when Content-Type is not JSON", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("hello world", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const res = await api.get("/text");
    expect(res.data).toBe("hello world");
  });

  it("returns text for XML content type", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<root/>", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      }),
    );
    const res = await api.get("/xml");
    expect(res.data).toBe("<root/>");
  });
});

describe("Lota retry with signal already aborted", () => {
  it("stops retrying immediately when signal is aborted between attempts", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const controller = new AbortController();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    controller.abort();

    const err = await api
      .get("/down", {
        signal: controller.signal,
        retry: { times: 3, delay: 0, jitter: false },
      })
      .catch((e) => e);
    expect(isLotaError(err)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("Lota interceptor synchronous throw in fulfilled", () => {
  it("calls rejected handler when fulfilled throws synchronously", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const rejected = vi.fn((e: unknown) => Promise.reject(e));

    api.interceptors.request.use(() => {
      throw new Error("sync throw in fulfilled");
    }, rejected);

    mockFetch({});
    await expect(api.get("/")).rejects.toThrow("sync throw in fulfilled");
    expect(rejected).toHaveBeenCalledTimes(1);
  });
});

describe("Lota _deleteHeaders integration with instance headers", () => {
  it("does not set Content-Type when posting URLSearchParams over instance JSON header", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "Content-Type": "application/json" },
    });
    mockFetch({});
    const params = new URLSearchParams({ a: "1", b: "2" });
    await api.post("/form", params);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    const keys = Object.keys(h).map((k) => k.toLowerCase());
    expect(keys).not.toContain("content-type");
  });

  it("does not set Content-Type when posting Blob over instance JSON header", async () => {
    const api = new Lota({
      baseURL: "http://api.example.com",
      headers: { "Content-Type": "application/json" },
    });
    mockFetch({});
    const blob = new Blob(["data"], { type: "application/pdf" });
    await api.post("/upload", blob);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const h = init.headers as Record<string, string>;
    const keys = Object.keys(h).map((k) => k.toLowerCase());
    expect(keys).not.toContain("content-type");
  });
});

describe("Lota arrayBuffer responseType", () => {
  it("returns ArrayBuffer for responseType arrayBuffer", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]).buffer, {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
    const res = await api.get("/binary", { responseType: "arrayBuffer" });
    expect(res.data).toBeInstanceOf(ArrayBuffer);
  });
});

describe("Lota constructor baseURL validation edge cases", () => {
  it("throws for completely unparseable baseURL", () => {
    expect(() => new Lota({ baseURL: "not a url at all :///" })).toThrow(
      LotaError,
    );
  });

  it("throws for ftp:// protocol in baseURL", () => {
    expect(() => new Lota({ baseURL: "ftp://files.example.com" })).toThrow(
      LotaError,
    );
  });
});

describe("Lota response interceptor rejected handler", () => {
  it("response interceptor rejected handler is called on HTTP error", async () => {
    const api = new Lota({ baseURL: "http://api.example.com" });
    const onRejected = vi.fn((e: unknown) => Promise.reject(e));
    api.interceptors.response.use((r) => r, onRejected);
    mockFetch({ error: "not found" }, { status: 404 });
    await expect(api.get("/missing")).rejects.toThrow();
    expect(onRejected).toHaveBeenCalledTimes(1);
  });
});

describe("Lota deleteHeaders with no existing headers to strip", () => {
  it("posts FormData cleanly when instance has no headers set", async () => {
    // Instance with NO headers — deleteHeaders path with empty mergedHeaders
    const api = new Lota({ baseURL: "http://api.example.com" });
    mockFetch({});
    const fd = new FormData();
    fd.append("file", "content");
    const res = await api.post("/upload", fd);
    expect(res.status).toBe(200);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    // body should be the FormData, no Content-Type header
    expect(init.body).toBe(fd);
  });
});
