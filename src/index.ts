import { Lota } from "./core/Lota.js";
import { LotaError } from "./types/index.js";
import type {
  LotaRequestConfig,
  LotaResponse,
  LotaInstance,
} from "./types/index.js";

const defaultInstance = new Lota({});
const lota = Object.assign(defaultInstance, {
  create(config: LotaRequestConfig = {}): Lota {
    return new Lota(config);
  },
});

export default lota;
export { lota, Lota, LotaError };
export type { LotaRequestConfig, LotaResponse, LotaInstance };
