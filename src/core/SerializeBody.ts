import type { SerializedBody } from "../types/index.js";

function serializeBody(data: unknown): SerializedBody {
  if (data === null || data === undefined) {
    return { body: null, headers: {} };
  }
  // FormData: browser MUST set Content-Type with the multipart boundary.
  // if we set it ourselves, the boundary is missing and the server can't parse it.
  if (data instanceof FormData) {
    return { body: data, headers: {} };
  }
  // Blob/File: preserve the Blob's own Content-Type if it has one
  if (data instanceof Blob) {
    return { body: data, headers: {} };
  }
  // Binary buffers
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return { body: data as BodyInit, headers: {} };
  }
  // URLSearchParams: browser sets application/x-www-form-urlencoded automatically
  if (data instanceof URLSearchParams) {
    return { body: data, headers: {} };
  }
  // Plain string: caller owns Content-Type
  if (typeof data === "string") {
    return { body: data, headers: {} };
  }
  // Plain object / array: JSON serialise and announce the content type
  return {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

export { serializeBody };
