import { NextResponse } from "next/server";
import { preferencesForToken } from "@/lib/oauth";
import { assertOrigin, corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  let headers: Record<string, string> = { "Cache-Control": "no-store" };
  try {
    const result = preferencesForToken(req.headers.get("authorization"));
    headers = { ...headers, ...corsHeaders(origin, result.clientId) };
    assertOrigin(origin, result.clientId);
    return NextResponse.json({ sub: result.sub, preferences: result.preferences, updatedAt: result.updatedAt }, { headers });
  } catch (e) {
    // 401 must be readable cross-origin so the SDK can clear a revoked token.
    if (origin) headers = { ...headers, "Access-Control-Allow-Origin": origin, Vary: "Origin" };
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
