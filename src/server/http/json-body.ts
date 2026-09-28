import "server-only";

import { AppError } from "./app-error";

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError({ code: "INVALID_JSON", message: "Request body must be valid JSON", status: 400 });
  }
}
