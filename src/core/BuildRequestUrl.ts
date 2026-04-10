import type { LotaRequestConfig } from "../types/index.js";
import { buildParams } from "./BuildParams.js";

function buildRequestUrl(
  url: string,
  baseURL: string | undefined,
  params: LotaRequestConfig["params"],
  arrayFormat: LotaRequestConfig["arrayFormat"],
): URL {
  let fullUrl: URL;
  // check if url is already absolute
  try {
    fullUrl = new URL(url);
    // Absolute URL ignore baseURL entirely
  } catch {
    if (baseURL) {
      const normalBase = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
      // strip leading '/' from url makes it relative to the full baseURL path,
      // not to the origin root
      const relativePath = url.startsWith("/") ? url.slice(1) : url;
      fullUrl = new URL(relativePath, normalBase);
    } else {
      // no baseURL url must be absolute; if not, URL() will throw a clear error
      fullUrl = new URL(url);
    }
  }
  // append query params if provided
  if (params) {
    buildParams(params, arrayFormat ?? "repeat", fullUrl);
  }

  return fullUrl;
}

export { buildRequestUrl };
