import { describe, expect, it } from "vitest";
import {
  canEditQuotes,
  canEditRateCard,
  canEditSettings,
  canManageUsers,
  isReadOnly,
  SessionUser,
} from "../types";
import {
  checkRateLimit,
  clearRateLimit,
  createSessionToken,
  recordLoginFailure,
  verifySessionToken,
} from "../session";

describe("Role-based permissions", () => {
  it("verifies ADMIN permissions", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canEditSettings("ADMIN")).toBe(true);
    expect(canEditRateCard("ADMIN")).toBe(true);
    expect(canEditQuotes("ADMIN")).toBe(true);
    expect(isReadOnly("ADMIN")).toBe(false);
  });

  it("verifies MANAGER permissions", () => {
    expect(canManageUsers("MANAGER")).toBe(false);
    expect(canEditSettings("MANAGER")).toBe(true);
    expect(canEditRateCard("MANAGER")).toBe(true);
    expect(canEditQuotes("MANAGER")).toBe(true);
    expect(isReadOnly("MANAGER")).toBe(false);
  });

  it("verifies STAFF permissions", () => {
    expect(canManageUsers("STAFF")).toBe(false);
    expect(canEditSettings("STAFF")).toBe(false);
    expect(canEditRateCard("STAFF")).toBe(false);
    expect(canEditQuotes("STAFF")).toBe(true);
    expect(isReadOnly("STAFF")).toBe(false);
  });

  it("verifies VIEWER read-only permissions", () => {
    expect(canManageUsers("VIEWER")).toBe(false);
    expect(canEditSettings("VIEWER")).toBe(false);
    expect(canEditRateCard("VIEWER")).toBe(false);
    expect(canEditQuotes("VIEWER")).toBe(false);
    expect(isReadOnly("VIEWER")).toBe(true);
  });
});

describe("JWT Session Tokens", () => {
  it("signs and verifies session tokens accurately", async () => {
    const user: SessionUser = {
      id: "user-123",
      email: "staff@gce.local",
      name: "Staff Member",
      role: "STAFF",
      mustChangePassword: false,
    };

    const token = await createSessionToken(user);
    expect(typeof token).toBe("string");

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe("user-123");
    expect(verified?.email).toBe("staff@gce.local");
    expect(verified?.role).toBe("STAFF");
  });

  it("rejects invalid or tampered tokens", async () => {
    const verified = await verifySessionToken("invalid.tampered.token");
    expect(verified).toBeNull();
  });
});

describe("Login Rate Limiter", () => {
  const testId = `test-ip-${Date.now()}`;

  it("allows login attempts and tracks remaining tries", () => {
    clearRateLimit(testId);
    expect(checkRateLimit(testId).allowed).toBe(true);
    expect(checkRateLimit(testId).remainingAttempts).toBe(5);

    recordLoginFailure(testId);
    expect(checkRateLimit(testId).remainingAttempts).toBe(4);

    recordLoginFailure(testId);
    recordLoginFailure(testId);
    recordLoginFailure(testId);
    expect(checkRateLimit(testId).remainingAttempts).toBe(1);

    // 5th failure blocks
    recordLoginFailure(testId);
    const blockedCheck = checkRateLimit(testId);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remainingAttempts).toBe(0);
    expect(blockedCheck.retryAfterSeconds).toBeGreaterThan(0);

    // Clear rate limit
    clearRateLimit(testId);
    expect(checkRateLimit(testId).allowed).toBe(true);
  });
});

