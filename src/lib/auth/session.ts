import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SessionUser } from "./types";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "gce-secret-key-32-chars-minimum-token-12345"
);

const COOKIE_NAME = "gce_session";

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      role: payload.role as SessionUser["role"],
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// In-memory rate limiting map for login attempts: identifier -> { attempts, firstAttemptTime }
interface RateLimitRecord {
  attempts: number;
  firstAttemptTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Window expired?
  if (now - record.firstAttemptTime > WINDOW_MS) {
    rateLimitMap.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.firstAttemptTime + WINDOW_MS - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.attempts };
}

export function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now - record.firstAttemptTime > WINDOW_MS) {
    rateLimitMap.set(identifier, { attempts: 1, firstAttemptTime: now });
  } else {
    record.attempts += 1;
  }
}

export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

