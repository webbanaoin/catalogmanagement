export type AuthFieldErrors = Record<string, string>;

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: unknown;
  };
}

function normalizeFieldErrors(value: unknown): AuthFieldErrors {
  if (!value || typeof value !== "object") return {};

  const result: AuthFieldErrors = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string") {
      result[key] = raw;
      continue;
    }
    if (Array.isArray(raw)) {
      const first = raw.find((item): item is string => typeof item === "string");
      if (first) result[key] = first;
    }
  }
  return result;
}

export class AuthApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: AuthFieldErrors;

  constructor({
    code,
    message,
    status,
    fields = {},
  }: {
    code: string;
    message: string;
    status: number;
    fields?: AuthFieldErrors;
  }) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body: unknown = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const envelope = body as ErrorEnvelope | null;
    throw new AuthApiError({
      code: envelope?.error?.code ?? "REQUEST_FAILED",
      message:
        envelope?.error?.message ??
        (response.status === 404
          ? "Authentication API is not integrated into this branch yet."
          : "Something went wrong. Please try again."),
      status: response.status,
      fields: normalizeFieldErrors(envelope?.error?.fields),
    });
  }

  return body as T;
}

export interface RegisterPayload {
  name: string;
  email: string;
  mobile?: string;
  password: string;
  shopName: string;
  businessCategoryId?: string;
  requestedBusinessType?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export function registerMerchant(payload: RegisterPayload) {
  return postJson<{ data: unknown }>("/api/auth/register", payload);
}

export function loginMerchant(payload: LoginPayload) {
  return postJson<{
    data: {
      id: string;
      name: string;
      email: string;
      status: string;
      platformRole: "USER" | "ADMIN";
      shops: Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
        role: string;
      }>;
    };
  }>("/api/auth/login", payload);
}

export function requestPasswordReset(payload: ForgotPasswordPayload) {
  return postJson<{ data: { message?: string } }>("/api/auth/forgot-password", payload);
}
