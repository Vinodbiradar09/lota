import { RETRY_DEFAULT_DELAY } from "../src/types/index.js";
import { computeDelay } from "../src/core/ComputeDelay.js";
import { describe, it, expect } from "vitest";

describe("computeDelay exponential backoff (default)", () => {
  it("attempt 1 returns base delay with no jitter", () => {
    const d = computeDelay({ times: 3, delay: 300, jitter: false }, 1);
    expect(d).toBe(300);
  });

  it("attempt 2 doubles the base delay", () => {
    const d = computeDelay({ times: 3, delay: 300, jitter: false }, 2);
    expect(d).toBe(600);
  });

  it("attempt 3 quadruples the base delay", () => {
    const d = computeDelay({ times: 3, delay: 300, jitter: false }, 3);
    expect(d).toBe(1200);
  });

  it("uses RETRY_DEFAULT_DELAY when delay not specified", () => {
    const d = computeDelay({ times: 3, jitter: false }, 1);
    expect(d).toBe(RETRY_DEFAULT_DELAY);
  });
});

describe("computeDelay fixed backoff", () => {
  it("returns the same delay for every attempt", () => {
    const cfg = {
      times: 3,
      delay: 500,
      backoff: "fixed" as const,
      jitter: false,
    };
    expect(computeDelay(cfg, 1)).toBe(500);
    expect(computeDelay(cfg, 2)).toBe(500);
    expect(computeDelay(cfg, 3)).toBe(500);
  });
});

describe("computeDelay jitter", () => {
  it("applies jitter within ±25% range by default", () => {
    const base = 300;
    const results = Array.from({ length: 50 }, () =>
      computeDelay({ times: 3, delay: base }, 1),
    );
    const min = Math.min(...results);
    const max = Math.max(...results);
    expect(min).toBeGreaterThanOrEqual(base * 0.75 - 1);
    expect(max).toBeLessThanOrEqual(base * 1.25 + 1);
    expect(max - min).toBeGreaterThan(0);
  });

  it("jitter: false produces exact values", () => {
    const d1 = computeDelay({ times: 3, delay: 400, jitter: false }, 2);
    const d2 = computeDelay({ times: 3, delay: 400, jitter: false }, 2);
    expect(d1).toBe(800);
    expect(d2).toBe(800);
  });
});
