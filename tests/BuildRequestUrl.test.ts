import { buildRequestUrl } from "../src/core/BuildRequestUrl.js";
import { describe, it, expect } from "vitest";

describe("buildRequestUrl absolute URLs", () => {
  it("returns absolute url as-is when no baseURL", () => {
    const url = buildRequestUrl(
      "http://example.com/users",
      undefined,
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://example.com/users");
  });

  it("ignores baseURL when url is absolute", () => {
    const url = buildRequestUrl(
      "http://other.com/data",
      "http://api.example.com/v1",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://other.com/data");
  });

  it("handles absolute url with existing query string", () => {
    const url = buildRequestUrl(
      "http://example.com/users?a=1",
      undefined,
      undefined,
      undefined,
    );
    expect(url.searchParams.get("a")).toBe("1");
  });
});

describe("buildRequestUrl URL normalisation (Issue 8 fix)", () => {
  it("correctly appends path to baseURL without trailing slash", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com/v1",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://api.example.com/v1/users");
  });

  it("correctly appends path to baseURL with trailing slash", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com/v1/",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://api.example.com/v1/users");
  });

  it("handles relative path without leading slash", () => {
    const url = buildRequestUrl(
      "users",
      "http://api.example.com/v1",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://api.example.com/v1/users");
  });

  it("handles multi-segment path on baseURL", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com/v1/v2",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://api.example.com/v1/v2/users");
  });

  it("handles multi-segment path on url", () => {
    const url = buildRequestUrl(
      "/users/123/profile",
      "http://api.example.com/v1",
      undefined,
      undefined,
    );
    expect(url.toString()).toBe("http://api.example.com/v1/users/123/profile");
  });

  it("does not duplicate slashes when baseURL has trailing slash and url has leading slash", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com/v1/",
      undefined,
      undefined,
    );
    expect(url.toString()).not.toContain("//users");
    expect(url.toString()).toBe("http://api.example.com/v1/users");
  });
});

describe("buildRequestUrl params appended", () => {
  it("appends scalar params", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com",
      { page: 1 },
      "repeat",
    );
    expect(url.searchParams.get("page")).toBe("1");
  });

  it("appends array params with repeat format", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com",
      { ids: [1, 2] },
      "repeat",
    );
    expect(url.searchParams.getAll("ids")).toEqual(["1", "2"]);
  });

  it("uses repeat as default when arrayFormat is undefined", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com",
      { ids: [1, 2] },
      undefined,
    );
    expect(url.searchParams.getAll("ids")).toEqual(["1", "2"]);
  });

  it("does not append params when params is undefined", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com",
      undefined,
      undefined,
    );
    expect(url.search).toBe("");
  });

  it("skips null param values", () => {
    const url = buildRequestUrl(
      "/users",
      "http://api.example.com",
      { a: null },
      "repeat",
    );
    expect(url.searchParams.has("a")).toBe(false);
  });
});

describe("buildRequestUrl no baseURL with relative url", () => {
  it("throws when url is relative and no baseURL is provided", () => {
    expect(() =>
      buildRequestUrl("/users", undefined, undefined, undefined),
    ).toThrow();
  });
});
