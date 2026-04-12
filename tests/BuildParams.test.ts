import { buildParams } from "../src/core/BuildParams.js";
import { describe, it, expect } from "vitest";

function makeUrl(): URL {
  return new URL("http://api.example.com/users");
}

describe("buildParams scalar values", () => {
  it("appends a string param", () => {
    const url = makeUrl();
    buildParams({ q: "hello" }, "repeat", url);
    expect(url.searchParams.get("q")).toBe("hello");
  });

  it("appends a number param", () => {
    const url = makeUrl();
    buildParams({ page: 2 }, "repeat", url);
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("appends a boolean param", () => {
    const url = makeUrl();
    buildParams({ active: true }, "repeat", url);
    expect(url.searchParams.get("active")).toBe("true");
  });

  it("skips null values", () => {
    const url = makeUrl();
    buildParams({ a: null }, "repeat", url);
    expect(url.searchParams.has("a")).toBe(false);
  });

  it("skips undefined values", () => {
    const url = makeUrl();
    buildParams({ a: undefined }, "repeat", url);
    expect(url.searchParams.has("a")).toBe(false);
  });

  it("appends multiple scalar params", () => {
    const url = makeUrl();
    buildParams({ q: "hello", page: 1, active: true }, "repeat", url);
    expect(url.searchParams.get("q")).toBe("hello");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("active")).toBe("true");
  });
});

describe("buildParams arrays with arrayFormat: repeat (default)", () => {
  it("appends each value as a separate param", () => {
    const url = makeUrl();
    buildParams({ ids: [1, 2, 3] }, "repeat", url);
    expect(url.searchParams.getAll("ids")).toEqual(["1", "2", "3"]);
  });

  it("handles string arrays", () => {
    const url = makeUrl();
    buildParams({ tags: ["a", "b"] }, "repeat", url);
    expect(url.searchParams.getAll("tags")).toEqual(["a", "b"]);
  });

  it("handles boolean arrays", () => {
    const url = makeUrl();
    buildParams({ flags: [true, false] }, "repeat", url);
    expect(url.searchParams.getAll("flags")).toEqual(["true", "false"]);
  });

  it("handles single-element array", () => {
    const url = makeUrl();
    buildParams({ ids: [42] }, "repeat", url);
    expect(url.searchParams.getAll("ids")).toEqual(["42"]);
  });
});

describe("buildParams arrays with arrayFormat: comma", () => {
  it("joins values with comma into a single param", () => {
    const url = makeUrl();
    buildParams({ ids: [1, 2, 3] }, "comma", url);
    expect(url.searchParams.get("ids")).toBe("1,2,3");
    expect(url.searchParams.getAll("ids")).toHaveLength(1);
  });

  it("handles string arrays", () => {
    const url = makeUrl();
    buildParams({ tags: ["a", "b", "c"] }, "comma", url);
    expect(url.searchParams.get("tags")).toBe("a,b,c");
  });
});

describe("buildParams arrays with arrayFormat: bracket", () => {
  it("appends each value with bracket notation", () => {
    const url = makeUrl();
    buildParams({ ids: [1, 2, 3] }, "bracket", url);
    expect(url.searchParams.getAll("ids[]")).toEqual(["1", "2", "3"]);
    expect(url.searchParams.has("ids")).toBe(false);
  });

  it("handles string arrays", () => {
    const url = makeUrl();
    buildParams({ tags: ["x", "y"] }, "bracket", url);
    expect(url.searchParams.getAll("tags[]")).toEqual(["x", "y"]);
  });
});

describe("buildParams nested objects (dot notation)", () => {
  it("flattens one level of nesting", () => {
    const url = makeUrl();
    buildParams({ filter: { status: "active" } }, "repeat", url);
    expect(url.searchParams.get("filter.status")).toBe("active");
  });

  it("flattens multiple nested keys", () => {
    const url = makeUrl();
    buildParams({ filter: { status: "active", role: "admin" } }, "repeat", url);
    expect(url.searchParams.get("filter.status")).toBe("active");
    expect(url.searchParams.get("filter.role")).toBe("admin");
  });

  it("skips null values inside nested objects", () => {
    const url = makeUrl();
    buildParams({ filter: { status: null } }, "repeat", url);
    expect(url.searchParams.has("filter.status")).toBe(false);
  });

  it("skips undefined values inside nested objects", () => {
    const url = makeUrl();
    buildParams({ filter: { status: undefined } }, "repeat", url);
    expect(url.searchParams.has("filter.status")).toBe(false);
  });

  it("handles mixed scalar and nested params", () => {
    const url = makeUrl();
    buildParams({ page: 1, filter: { status: "active" } }, "repeat", url);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("filter.status")).toBe("active");
  });
});
