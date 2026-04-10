import { RETRY_DEFAULT_DELAY, type RetryConfig } from "../types/index.js";

/**
 * compute the delay for a given attempt number.
 * attempt=1 → base delay, attempt=2 → base×2, attempt=3 → base×4 (exponential)
 * jitter multiplies by a random value in [0.75, 1.25] to spread retries.
 */
function computeDelay(cfg: RetryConfig, attempt: number): number {
  const base = cfg.delay ?? RETRY_DEFAULT_DELAY;
  const raw = cfg.backoff === "fixed" ? base : base * Math.pow(2, attempt - 1);
  if (cfg.jitter === false) return raw;
  // ±25% jitter avoids thundering herd when many clients retry simultaneously
  return raw * (0.75 + Math.random() * 0.5);
}

export { computeDelay };
