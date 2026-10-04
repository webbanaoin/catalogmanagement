import "server-only";

import { AppError } from "./app-error";

const DEFAULT_MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new AppError({
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large",
        status: 413,
      });
    }
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    throw new AppError({
      code: "INVALID_JSON",
      message: "Request body must be valid JSON",
      status: 400,
    });
  }

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new AppError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body is too large",
      status: 413,
    });
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new AppError({
      code: "INVALID_JSON",
      message: "Request body must be valid JSON",
      status: 400,
    });
  }
}
