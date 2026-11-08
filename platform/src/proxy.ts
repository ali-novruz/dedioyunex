import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF protection for the platform's own session API.
 * State-changing /api/* requests must come from the platform's own origin (browsers always send Origin on POST/PATCH/PUT/DELETE).
 * Partner-facing endpoints (/oauth/*, /v1/*) are not under /api and use tokens + their own CORS rules.
 */
export function proxy(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return NextResponse.next();
  const appUrl = process.env.APP_URL;
  if (!appUrl) return NextResponse.json({ error: "APP_URL is not configured" }, { status: 500 });
  const allowed = new URL(appUrl).origin;
  const origin = req.headers.get("origin");
  if (origin !== allowed) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
