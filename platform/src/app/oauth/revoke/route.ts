import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/oauth";
import { corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    const t = await req.text().catch(() => "");
    body = Object.fromEntries(new URLSearchParams(t));
  }
  try {
    const { clientId } = revokeToken(body.token);
    return NextResponse.json({}, { headers: corsHeaders(origin, clientId ?? (typeof body.client_id === "string" ? body.client_id : null)) });
  } catch (e) {
    return oauthErrorResponse(e, corsHeaders(origin, typeof body.client_id === "string" ? body.client_id : null));
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
