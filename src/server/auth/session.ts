import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

import { getAppEnvironment } from "@/server/env";

export const SESSION_COOKIE_NAME = "catalog_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  sessionVersion: number;
};

function sessionKey(): Uint8Array {
  return new TextEncoder().encode(getAppEnvironment().AUTH_SECRET);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL_SECONDS + "s")
    .sign(sessionKey());
}

export async function readSessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const result = await jwtVerify(token, sessionKey(), {
      algorithms: ["HS256"],
    });

    if (typeof result.payload.userId !== "string") return null;

    const rawVersion = result.payload.sessionVersion;
    const sessionVersion =
      typeof rawVersion === "number" &&
      Number.isInteger(rawVersion) &&
      rawVersion >= 0
        ? rawVersion
        : 0;

    return {
      userId: result.payload.userId,
      sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  userId: string,
  sessionVersion = 0,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    await createSessionToken({ userId, sessionVersion }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    },
  );
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? readSessionToken(token) : null;
}
