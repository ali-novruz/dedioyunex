import "server-only";
import { NextResponse } from "next/server";
import { getClient, originAllowed } from "./clients";
import { OAuthError } from "./oauth";

/**
 * CORS for the public OAuth/preferences endpoints.
 * Browser requests must come from an origin registered for the client involved;
 * requests without Origin (mobile apps, servers) are allowed.
 */
export function corsHeaders(origin: string | null, clientId: string | null): Record<string, string> {
  if (!origin) return {};
  const client = clientId ? getClient(clientId) : null;
  if (!client || !originAllowed(client, origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/** Preflight: we cannot know the client yet, so allow the method/headers for any origin; the real request is checked. */
export function preflight(origin: string | null): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: origin
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "600",
          Vary: "Origin",
        }
      : {},
  });
}

export function oauthErrorResponse(e: unknown, headers: Record<string, string> = {}): NextResponse {
  if (e instanceof OAuthError) {
    return NextResponse.json({ error: e.code, error_description: e.message }, { status: e.status, headers });
  }
  console.error("[oauth] unexpected error", e);
  return NextResponse.json({ error: "server_error", error_description: "Internal error" }, { status: 500, headers });
}

/** Rejects browser calls from origins not registered for the client that owns the token/code. */
export function assertOrigin(origin: string | null, clientId: string): void {
  if (!origin) return;
  const client = getClient(clientId);
  if (!client || !originAllowed(client, origin)) {
    throw new OAuthError("invalid_client", `Origin ${origin} is not registered for this client`, 403);
  }
}
