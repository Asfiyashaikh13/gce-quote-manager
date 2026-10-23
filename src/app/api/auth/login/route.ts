import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { checkRateLimit, recordLoginFailure, clearRateLimit, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check rate limit
    const rateCheck = checkRateLimit(trimmedEmail);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Lookup user
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || user.deletedAt !== null) {
      recordLoginFailure(trimmedEmail);
      return NextResponse.json(
        {
          error: "Invalid email or password",
          remainingAttempts: checkRateLimit(trimmedEmail).remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      recordLoginFailure(trimmedEmail);
      const remaining = checkRateLimit(trimmedEmail).remainingAttempts;
      return NextResponse.json(
        {
          error: `Invalid email or password. ${remaining} attempt(s) remaining.`,
          remainingAttempts: remaining,
        },
        { status: 401 }
      );
    }

    // Successful login: clear rate limit and establish session
    clearRateLimit(trimmedEmail);

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json({
      success: true,
      user: sessionUser,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

