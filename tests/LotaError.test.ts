import { LotaError, isLotaError } from "../src/types/index.js";
import { describe, it, expect } from "vitest";

function makeResponse(status: number) {
  return {
    data: null,
    status,
    statusText: "Error",
    headers: new Headers(),
    config: {},
    rawResponse: new Response(),
  };
}

describe("LotaError construction", () => {
  it("sets message correctly", () => {
    const err = new LotaError("something went wrong", null, {});
    expect(err.message).toBe("something went wrong");
  });

  it("sets name to LotaError", () => {
    const err = new LotaError("fail", null, {});
    expect(err.name).toBe("LotaError");
  });

  it("is an instance of Error", () => {
    const err = new LotaError("fail", null, {});
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of LotaError", () => {
    const err = new LotaError("fail", null, {});
    expect(err).toBeInstanceOf(LotaError);
  });

  it("instanceof works across prototype chain (setPrototypeOf fix)", () => {
    function catchAndCheck() {
      try {
        throw new LotaError("fail", null, {});
      } catch (e) {
        return e instanceof LotaError;
      }
    }
    expect(catchAndCheck()).toBe(true);
  });
});

describe("LotaError isHttpError", () => {
  it("returns true when response is present", () => {
    const err = new LotaError("fail", makeResponse(404), {});
    expect(err.isHttpError).toBe(true);
  });

  it("returns false when response is null (network error)", () => {
    const err = new LotaError("Network error", null, {});
    expect(err.isHttpError).toBe(false);
  });
});

describe("LotaError status", () => {
  it("returns status code from response", () => {
    const err = new LotaError("fail", makeResponse(404), {});
    expect(err.status).toBe(404);
  });

  it("returns undefined when no response", () => {
    const err = new LotaError("Network error", null, {});
    expect(err.status).toBeUndefined();
  });
});

describe("LotaError response and config", () => {
  it("stores response on the error", () => {
    const response = makeResponse(500);
    const err = new LotaError("fail", response, {});
    expect(err.response).toBe(response);
  });

  it("stores config on the error", () => {
    const config = { url: "/users", baseURL: "http://api.example.com" };
    const err = new LotaError("fail", null, config);
    expect(err.config).toBe(config);
  });
});

describe("isLotaError()", () => {
  it("returns true for LotaError instance", () => {
    const err = new LotaError("fail", null, {});
    expect(isLotaError(err)).toBe(true);
  });

  it("narrows type in TypeScript status is accessible after guard", () => {
    const err: unknown = new LotaError("fail", makeResponse(404), {});
    if (isLotaError(err)) {
      expect(err.status).toBe(404);
    }
  });

  it("returns false for plain Error", () => {
    expect(isLotaError(new Error("plain"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isLotaError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isLotaError(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isLotaError("error string")).toBe(false);
  });
});
