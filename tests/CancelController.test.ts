import { describe, it, expect } from "vitest";
import { CancelController } from "../src/core/CancelController.js";
import { LotaError } from "../src/types/index.js";

describe("CancelController initial state", () => {
  it("starts as not cancelled", () => {
    const cc = new CancelController();
    expect(cc.isCancelled).toBe(false);
  });
  it("exposes a valid AbortSignal", () => {
    const cc = new CancelController();
    expect(cc.signal).toBeInstanceOf(AbortSignal);
    expect(cc.signal.aborted).toBe(false);
  });
  it("has undefined reason before cancel", () => {
    const cc = new CancelController();
    expect(cc.reason).toBeUndefined();
  });
});

describe("CancelController cancel()", () => {
  it("sets isCancelled to true", () => {
    const cc = new CancelController();
    cc.cancel();
    expect(cc.isCancelled).toBe(true);
  });
  it("aborts the signal", () => {
    const cc = new CancelController();
    cc.cancel();
    expect(cc.signal.aborted).toBe(true);
  });
  it("stores reason string", () => {
    const cc = new CancelController();
    cc.cancel("user navigated away");
    expect(cc.reason).toBe("user navigated away");
  });
  it("is idempotent second call does not overwrite reason", () => {
    const cc = new CancelController();
    cc.cancel("first reason");
    cc.cancel("second reason");
    expect(cc.reason).toBe("first reason");
    expect(cc.isCancelled).toBe(true);
  });
  it("works without a reason argument", () => {
    const cc = new CancelController();
    cc.cancel();
    expect(cc.reason).toBeUndefined();
    expect(cc.isCancelled).toBe(true);
  });
});

describe("CancelController.isCancelError()", () => {
  it("returns true for LotaError with 'Request aborted' message", () => {
    const err = new LotaError("Request aborted", null, {});
    expect(CancelController.isCancelError(err)).toBe(true);
  });

  it("returns false for LotaError with different message", () => {
    const err = new LotaError("Request failed with status 404", null, {});
    expect(CancelController.isCancelError(err)).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(CancelController.isCancelError(new Error("fail"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(CancelController.isCancelError(null)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(CancelController.isCancelError(42)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(CancelController.isCancelError("aborted")).toBe(false);
  });
});
