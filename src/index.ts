import { CancelController } from "./core/CancelController.js";
import { LotaError, isLotaError } from "./types/index.js";
import { Lota } from "./core/Lota.js";
import type {
  LotaRequestConfig,
  LotaResponse,
  LotaInstance,
  RetryConfig,
} from "./types/index.js";

const defaultInstance = new Lota({});
const lota = Object.assign(defaultInstance, {
  create(config: LotaRequestConfig = {}): Lota {
    return new Lota(config);
  },
});

export type { LotaRequestConfig, LotaResponse, LotaInstance, RetryConfig };
export { lota, Lota, LotaError, CancelController, isLotaError };
export default lota;
