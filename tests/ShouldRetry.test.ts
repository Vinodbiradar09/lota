import { LotaError, RETRY_DEFAULT_ON } from "../src/types/index.js";
import { shouldRetry } from "../src/core/ShouldRetry.js";
import { describe, it, expect } from "vitest";

function makeHttpError(status: number): LotaError {
  return new LotaError(
    `Request failed with status ${status}`,
    {
      data: null,
      status,
      statusText: "Error",
      headers: new Headers(),
      config: {},
      rawResponse: new Response(),
    },
    {},
  );
}

function makeNetworkError(): LotaError {
  return new LotaError("Network error", null, {});
}

function makeAbortError(): LotaError {
  return new LotaError("Request aborted", null, {});
}

describe("shouldRetry non-LotaError inputs", () => {
  it("returns false for a plain Error", () => {
    expect(shouldRetry(new Error("oops"), { times: 3 })).toBe(false);
  });

  it("returns false for null", () => {
    expect(shouldRetry(null, { times: 3 })).toBe(false);
  });

  it("returns false for a string", () => {
    expect(shouldRetry("error", { times: 3 })).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(shouldRetry(undefined, { times: 3 })).toBe(false);
  });
});

describe("shouldRetry aborted requests", () => {
  it("never retries aborted requests", () => {
    expect(shouldRetry(makeAbortError(), { times: 3 })).toBe(false);
  });

  it("never retries aborted even with matching status in on list", () => {
    expect(shouldRetry(makeAbortError(), { times: 3, on: [503] })).toBe(false);
  });
});

describe("shouldRetry network errors (null response)", () => {
  it("retries network errors by default", () => {
    expect(shouldRetry(makeNetworkError(), { times: 3 })).toBe(true);
  });

  it("retries network errors even with empty on list", () => {
    expect(shouldRetry(makeNetworkError(), { times: 3, on: [] })).toBe(true);
  });
});

describe("shouldRetry HTTP errors with default on list", () => {
  const retryable = RETRY_DEFAULT_ON;
  const nonRetryable = [400, 401, 403, 404, 405, 422];

  retryable.forEach((status) => {
    it(`retries ${status} by default`, () => {
      expect(shouldRetry(makeHttpError(status), { times: 3 })).toBe(true);
    });
  });

  nonRetryable.forEach((status) => {
    it(`does not retry ${status} by default`, () => {
      expect(shouldRetry(makeHttpError(status), { times: 3 })).toBe(false);
    });
  });
});

describe("shouldRetry custom on list", () => {
  it("retries when status is in custom on list", () => {
    expect(shouldRetry(makeHttpError(422), { times: 3, on: [422] })).toBe(true);
  });

  it("does not retry when status is not in custom on list", () => {
    expect(shouldRetry(makeHttpError(503), { times: 3, on: [422] })).toBe(
      false,
    );
  });

  it("handles empty on list no HTTP errors retried", () => {
    expect(shouldRetry(makeHttpError(503), { times: 3, on: [] })).toBe(false);
  });
});
