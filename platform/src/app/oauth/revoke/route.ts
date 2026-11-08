import { NextResponse } from "next/server";
import { revokeToken, OAuthError } from "@/lib/oauth";
import { assertOrigin, corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const text = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    body = Object.fromEntries(new URLSearchParams(text));
  }
  const clientId = typeof body.client_id === "string" ? body.client_id : null;
  const headers = await corsHeaders(origin, clientId);
  try {
    // Browser calls must name their client and may only revoke that client's tokens.
    if (origin) {
      if (!clientId) throw new OAuthError("invalid_request", "client_id is required");
      await assertOrigin(origin, clientId);
    }
    await revokeToken(body.token, origin ? clientId : null);
    return NextResponse.json({}, { headers });
  } catch (e) {
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
