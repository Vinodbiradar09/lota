import {
  LotaError,
  RETRY_DEFAULT_ON,
  type RetryConfig,
} from "../types/index.js";

function shouldRetry(err: unknown, cfg: RetryConfig): boolean {
  if (!(err instanceof LotaError)) return false;
  if (err.message === "Request aborted") return false;
  if (err.response === null) return true;
  const allowedStatuses = cfg.on ?? RETRY_DEFAULT_ON;
  return allowedStatuses.includes(err.response.status);
}

export { shouldRetry };
