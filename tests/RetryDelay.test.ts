import { retryDelay } from "../src/core/RetryDelay.js";
import { describe, it, expect, vi } from "vitest";

describe("retryDelay normal delay", () => {
  it("resolves after the specified milliseconds", async () => {
    vi.useFakeTimers();
    const p = retryDelay(500);
    vi.advanceTimersByTime(500);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("does not resolve before the delay completes", async () => {
    vi.useFakeTimers();
    let resolved = false;
    retryDelay(500).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(499);
    await Promise.resolve();
    expect(resolved).toBe(false);
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});

describe("retryDelay signal already aborted", () => {
  it("rejects immediately when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(retryDelay(5000, controller.signal)).rejects.toThrow(
      "Aborted",
    );
  });
});

describe("retryDelay signal aborts during delay", () => {
  it("rejects when signal fires before delay completes", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const p = retryDelay(5000, controller.signal);

    vi.advanceTimersByTime(100);
    controller.abort();

    await expect(p).rejects.toThrow("Aborted");
    vi.useRealTimers();
  });

  it("does not resolve after abort even if timer would have fired", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const p = retryDelay(500, controller.signal).catch((e) => e);

    controller.abort();
    vi.advanceTimersByTime(1000);
    const result = await p;

    expect(result).toBeInstanceOf(DOMException);
    expect((result as DOMException).name).toBe("AbortError");
    vi.useRealTimers();
  });
});
