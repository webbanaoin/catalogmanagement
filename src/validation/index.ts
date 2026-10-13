import type { ZodType } from "zod";

/** Parse untrusted input at a server boundary with an explicitly supplied schema. */
export function validateInput<T>(schema: ZodType<T>, input: unknown): T {
  return schema.parse(input);
}
