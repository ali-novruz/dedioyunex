import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/oauth";
import { corsHeaders, oauthErrorResponse, preflight, assertOrigin } from "@/lib/cors";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(await req.text()));
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const body = await readBody(req);
  const clientId = typeof body.client_id === "string" ? body.client_id : null;
  const headers = { ...(await corsHeaders(origin, clientId)), "Cache-Control": "no-store" };
  try {
    if (clientId) await assertOrigin(origin, clientId);
    return NextResponse.json(await exchangeCode(body), { headers });
  } catch (e) {
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
