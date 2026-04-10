/**
 * appends serialised params onto a URL's searchParams in-place.
 *  supports:
 *   - Scalar values         → key=value
 *   - Arrays (repeat)       → key=1&key=2&key=3      (default)
 *   - Arrays (comma)        → key=1,2,3
 *   - Arrays (bracket)      → key[]=1&key[]=2
 *   - Nested objects        → key.nested=value        (dot notation)
 *   - null / undefined      → skipped silently
 */

import type { LotaRequestConfig, ParamValue } from "../types/index.js";

function buildParams(
  params: NonNullable<LotaRequestConfig["params"]>,
  arrayFormat: NonNullable<LotaRequestConfig["arrayFormat"]>,
  url: URL,
): void {
  function append(key: string, value: ParamValue): void {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      if (arrayFormat === "comma") {
        url.searchParams.append(key, value.map(String).join(","));
      } else if (arrayFormat === "bracket") {
        value.forEach((v) => url.searchParams.append(`${key}[]`, String(v)));
      } else {
        // 'repeat'default
        value.forEach((v) => url.searchParams.append(key, String(v)));
      }
    } else if (typeof value === "object") {
      // nested object recurse with dot-notation key
      Object.entries(value).forEach(([k, v]) =>
        append(`${key}.${k}`, v as ParamValue),
      );
    } else {
      url.searchParams.append(key, String(value));
    }
  }
  Object.entries(params).forEach(([k, v]) => append(k, v as ParamValue));
}

export { buildParams };
