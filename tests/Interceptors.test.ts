import { Interceptors } from "../src/core/Interceptors.js";
import { describe, it, expect } from "vitest";

describe("Interceptors use()", () => {
  it("registers a handler and returns id 0", () => {
    const i = new Interceptors<string>();
    const id = i.use((v) => v);
    expect(id).toBe(0);
    expect(i.handlers).toHaveLength(1);
    expect(i.handlers[0]).not.toBeNull();
  });

  it("increments id for each handler", () => {
    const i = new Interceptors<string>();
    expect(i.use((v) => v)).toBe(0);
    expect(i.use((v) => v)).toBe(1);
    expect(i.use((v) => v)).toBe(2);
  });

  it("stores fulfilled and rejected functions", () => {
    const i = new Interceptors<string>();
    const fulfilled = (v: string) => v;
    const rejected = (e: unknown) => e;
    i.use(fulfilled, rejected);
    expect(i.handlers[0]?.fulfilled).toBe(fulfilled);
    expect(i.handlers[0]?.rejected).toBe(rejected);
  });

  it("stores undefined rejected when not provided", () => {
    const i = new Interceptors<string>();
    i.use((v) => v);
    expect(i.handlers[0]?.rejected).toBeUndefined();
  });
});

describe("Interceptors eject()", () => {
  it("nullifies a handler by id", () => {
    const i = new Interceptors<string>();
    const id = i.use((v) => v);
    i.eject(id);
    expect(i.handlers[id]).toBeNull();
  });

  it("does not affect other handlers", () => {
    const i = new Interceptors<string>();
    i.use((v) => v);
    const id = i.use((v) => v);
    i.eject(id);
    expect(i.handlers[0]).not.toBeNull();
    expect(i.handlers[1]).toBeNull();
  });

  it("is safe to call with out-of-range id", () => {
    const i = new Interceptors<string>();
    expect(() => i.eject(999)).not.toThrow();
  });

  it("is safe to eject already-ejected id", () => {
    const i = new Interceptors<string>();
    const id = i.use((v) => v);
    i.eject(id);
    expect(() => i.eject(id)).not.toThrow();
  });
});

describe("Interceptors clear()", () => {
  it("removes all handlers", () => {
    const i = new Interceptors<string>();
    i.use((v) => v);
    i.use((v) => v);
    i.clear();
    expect(i.handlers).toHaveLength(0);
  });

  it("is safe to call on empty handlers", () => {
    const i = new Interceptors<string>();
    expect(() => i.clear()).not.toThrow();
  });
});
