import { serializeBody } from "../src/core/SerializeBody.js";
import { describe, it, expect } from "vitest";

describe("serializeBody null / undefined", () => {
  it("returns null body for null input", () => {
    const result = serializeBody(null);
    expect(result.body).toBeNull();
    expect(result.headers).toEqual({});
    expect(result.deleteHeaders).toBeUndefined();
  });
  it("returns null body for undefined input", () => {
    const result = serializeBody(undefined);
    expect(result.body).toBeNull();
    expect(result.headers).toEqual({});
  });
});

describe("serializeBody plain objects / arrays", () => {
  it("JSON-stringifies plain object and sets Content-Type", () => {
    const result = serializeBody({ name: "vinod" });
    expect(result.body).toBe(JSON.stringify({ name: "vinod" }));
    expect(result.headers["Content-Type"]).toBe("application/json");
    expect(result.deleteHeaders).toBeUndefined();
  });

  it("JSON-stringifies array and sets Content-Type", () => {
    const result = serializeBody([1, 2, 3]);
    expect(result.body).toBe("[1,2,3]");
    expect(result.headers["Content-Type"]).toBe("application/json");
  });

  it("JSON-stringifies nested object", () => {
    const data = { user: { name: "vinod", age: 25 } };
    const result = serializeBody(data);
    expect(result.body).toBe(JSON.stringify(data));
    expect(result.headers["Content-Type"]).toBe("application/json");
  });
});

describe("serializeBody string", () => {
  it("passes string through as-is with no Content-Type", () => {
    const result = serializeBody("raw string body");
    expect(result.body).toBe("raw string body");
    expect(result.headers).toEqual({});
    expect(result.deleteHeaders).toBeUndefined();
  });

  it("handles empty string", () => {
    const result = serializeBody("");
    expect(result.body).toBe("");
    expect(result.headers).toEqual({});
  });
});

describe("serializeBody FormData", () => {
  it("passes FormData through with no headers set", () => {
    const fd = new FormData();
    fd.append("name", "vinod");
    const result = serializeBody(fd);
    expect(result.body).toBe(fd);
    expect(result.headers).toEqual({});
  });

  it("returns deleteHeaders: ['Content-Type'] so instance header is removed", () => {
    const fd = new FormData();
    const result = serializeBody(fd);
    expect(result.deleteHeaders).toContain("Content-Type");
  });
});

describe("serializeBody URLSearchParams", () => {
  it("passes URLSearchParams through with no headers set", () => {
    const params = new URLSearchParams({ a: "1" });
    const result = serializeBody(params);
    expect(result.body).toBe(params);
    expect(result.headers).toEqual({});
  });

  it("returns deleteHeaders: ['Content-Type']", () => {
    const result = serializeBody(new URLSearchParams());
    expect(result.deleteHeaders).toContain("Content-Type");
  });
});

describe("serializeBody Blob", () => {
  it("passes Blob through with deleteHeaders", () => {
    const blob = new Blob(["data"], { type: "application/pdf" });
    const result = serializeBody(blob);
    expect(result.body).toBe(blob);
    expect(result.headers).toEqual({});
    expect(result.deleteHeaders).toContain("Content-Type");
  });
});

describe("serializeBody ArrayBuffer", () => {
  it("passes ArrayBuffer through with no headers", () => {
    const buf = new ArrayBuffer(8);
    const result = serializeBody(buf);
    expect(result.body).toBe(buf);
    expect(result.headers).toEqual({});
    expect(result.deleteHeaders).toBeUndefined();
  });
});

describe("serializeBody TypedArray (ArrayBuffer view)", () => {
  it("passes Uint8Array through with no headers", () => {
    const view = new Uint8Array([1, 2, 3]);
    const result = serializeBody(view);
    expect(result.body).toBe(view);
    expect(result.headers).toEqual({});
  });
});
