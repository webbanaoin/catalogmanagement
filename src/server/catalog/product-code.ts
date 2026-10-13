import "server-only";

import { randomUUID } from "node:crypto";

export function generateProductCode(usedCodes: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `PRD-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const normalized = code.toLowerCase();

    if (!usedCodes.has(normalized)) {
      usedCodes.add(normalized);
      return code;
    }
  }

  throw new Error("Unable to generate a unique product code");
}
