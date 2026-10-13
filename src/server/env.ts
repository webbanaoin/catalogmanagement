import "server-only";

import { z } from "zod";

const appEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.url(),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must contain at least 32 characters"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    if (!value.APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must use HTTPS in production",
      });
    }

    if (
      value.AUTH_SECRET.includes("replace-with") ||
      value.AUTH_SECRET.includes("change-me")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET must not use an example placeholder in production",
      });
    }
  });

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().startsWith("mysql://", "DATABASE_URL must use MySQL"),
});

const optionalUrlEnvironmentValue = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.url().optional(),
);

const storageEnvironmentSchema = z.object({
  AWS_REGION: z.string().trim().min(1),
  AWS_S3_BUCKET: z.string().trim().min(3),
  AWS_S3_ENDPOINT: optionalUrlEnvironmentValue,
  AWS_ACCESS_KEY_ID: z.string().trim().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().trim().min(1),
  MEDIA_BASE_URL: optionalUrlEnvironmentValue,
});

const optionalNonBlankEnvironmentValue = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const passwordResetEmailEnvironmentSchema = z.object({
  RESEND_API_KEY: optionalNonBlankEnvironmentValue,
  PASSWORD_RESET_FROM_EMAIL: optionalNonBlankEnvironmentValue,
  PASSWORD_RESET_REPLY_TO: optionalNonBlankEnvironmentValue,
  PASSWORD_RESET_EXPOSE_URL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;
export type StorageEnvironment = z.infer<typeof storageEnvironmentSchema>;
export type PasswordResetEmailEnvironment = z.infer<
  typeof passwordResetEmailEnvironmentSchema
>;

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

export function getPasswordResetEmailEnvironment(): PasswordResetEmailEnvironment {
  return parseEnvironment(
    passwordResetEmailEnvironmentSchema,
    process.env,
    "password reset email",
  );
}
