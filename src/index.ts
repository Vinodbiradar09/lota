import { Lota } from "./core/Lota.js";
import type { LotaRequestConfig } from "./types/index.js";

const defaultInstance = new Lota({});
const lota = Object.assign(defaultInstance, {
  create(config: LotaRequestConfig = {}) {
    return new Lota(config);
  },
});

export default lota;
export { lota };
