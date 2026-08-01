import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ROLE_PROTECTED_PREFIXES: Record<string, string[]> = {
  "/driver": ["DRIVER"],
  "/staff": ["STAFF"],
  "/admin": ["ADMIN", "SUPER_ADMIN"],
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(req: NextRequest) {
  // --- CSRF: verify same-origin for state-changing API requests ---
  if (req.nextUrl.pathname.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    const origin = req.headers.get("origin");
    const allowed = (process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
    if (origin && !allowed.includes(origin)) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }
  }

  // --- Role-based route gating for dashboard sections ---
  const matchedPrefix = Object.keys(ROLE_PROTECTED_PREFIXES).find((p) =>
    req.nextUrl.pathname.startsWith(p)
  );

  if (matchedPrefix) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const allowedRoles = ROLE_PROTECTED_PREFIXES[matchedPrefix];

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!allowedRoles || !allowedRoles.includes((token as any).role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/driver/:path*", "/staff/:path*", "/admin/:path*"],
};
