import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "gce-secret-key-32-chars-minimum-token-12345"
);

const PUBLIC_PATHS = [
  "/login",
  "/logout",
  "/change-password",
  "/api/auth/login",
  "/api/auth/logout",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internals, static files, and public routes
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PUBLIC_PATHS.some((p) => pathname === p)
  ) {
    // If user is already logged in and visits /login, redirect to /
    if (pathname === "/login") {
      const token = request.cookies.get("gce_session")?.value;
      if (token) {
        try {
          await jwtVerify(token, SECRET_KEY);
          return NextResponse.redirect(new URL("/", request.url));
        } catch {
          // Token invalid, allow /login
        }
      }
    }
    return NextResponse.next();
  }

  // Check for session cookie
  const token = request.cookies.get("gce_session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET_KEY);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

