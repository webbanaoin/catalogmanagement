import "server-only";

import { z } from "zod";

const appEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must contain at least 32 characters"),
});

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().startsWith("mysql://", "DATABASE_URL must use MySQL"),
});

const storageEnvironmentSchema = z.object({
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(3),
  AWS_S3_ENDPOINT: z.url().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  MEDIA_BASE_URL: z.url().optional(),
});

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;
export type StorageEnvironment = z.infer<typeof storageEnvironmentSchema>;

function parseEnvironment<T>(schema: z.ZodType<T>, values: unknown, scope: string): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Invalid ${scope} configuration${names ? `: ${names}` : ""}`);
  }

  return result.data;
}

export function getAppEnvironment(): AppEnvironment {
  return parseEnvironment(appEnvironmentSchema, process.env, "application");
}

export function getDatabaseEnvironment(): DatabaseEnvironment {
  return parseEnvironment(databaseEnvironmentSchema, process.env, "database");
}

export function getStorageEnvironment(): StorageEnvironment {
  return parseEnvironment(storageEnvironmentSchema, process.env, "storage");
}
