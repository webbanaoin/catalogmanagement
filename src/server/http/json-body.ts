import "server-only";

import { AppError } from "./app-error";

const DEFAULT_MAX_JSON_BODY_BYTES = 64 * 1024;

function payloadTooLarge(): AppError {
  return new AppError({
    code: "PAYLOAD_TOO_LARGE",
    message: "Request body is too large",
    status: 413,
  });
}

async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw payloadTooLarge();
    }
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw payloadTooLarge();
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError({
      code: "INVALID_JSON",
      message: "Request body must be valid JSON",
      status: 400,
    });
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export async function readJsonBody(
  request: Request,
  maxBytes = DEFAULT_MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const body = await readLimitedBody(request, maxBytes);

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
