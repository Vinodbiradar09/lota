import type { SerializedBody } from "../types/index.js";

function serializeBody(data: unknown): SerializedBody {
  if (data === null || data === undefined) {
    return { body: null, headers: {} };
  }

  // FormData: browser MUST set Content-Type with the multipart boundary.
  // Actively delete any pre-existing Content-Type so the browser can set its own.
  if (data instanceof FormData) {
    return { body: data, headers: {}, deleteHeaders: ["Content-Type"] };
  }

  // URLSearchParams: browser sets application/x-www-form-urlencoded automatically.
  if (data instanceof URLSearchParams) {
    return { body: data, headers: {}, deleteHeaders: ["Content-Type"] };
  }

  // Blob/File: the Blob carries its own type. Don't override it.
  if (data instanceof Blob) {
    return { body: data, headers: {}, deleteHeaders: ["Content-Type"] };
  }

  // Binary buffers: caller owns Content-Type.
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return { body: data as BodyInit, headers: {} };
  }

  // Plain string: caller owns Content-Type.
  if (typeof data === "string") {
    return { body: data, headers: {} };
  }

  // Plain object / array: JSON serialise and announce the content type.
  return {
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  };
}

export { serializeBody };
