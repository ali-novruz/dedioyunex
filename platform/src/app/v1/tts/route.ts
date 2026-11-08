import { NextResponse } from "next/server";
import { preferencesForToken, resolveToken } from "@/lib/oauth";
import { assertOrigin, corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";
import { AiError } from "@/lib/ai";
import { speechAvailable, synthesize } from "@/lib/speech";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { AuthError } from "@/lib/session";
import { bi } from "@/lib/lang";

/** GET /v1/tts: whether the real Azerbaijani voice is configured. Open, carries no data. */
export function GET() {
  return NextResponse.json({ available: speechAvailable() }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } });
}

/** POST /v1/tts: reads text aloud for a connected partner site. Bearer token required. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let headers: Record<string, string> = { "Cache-Control": "no-store" };
  try {
    const { clientId, userId } = await resolveToken(req.headers.get("authorization"));
    headers = { ...headers, ...(await corsHeaders(origin, clientId)) };
    await assertOrigin(origin, clientId);
    const body = (await req.json().catch(() => null)) as { text?: unknown; rate?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";
    if (!text) return NextResponse.json({ error: "invalid_request", error_description: "text is required" }, { status: 400, headers });
    const rate = typeof body?.rate === "number" && body.rate >= 0.5 && body.rate <= 2 ? body.rate : 1;
    const { preferences } = await preferencesForToken(req.headers.get("authorization"));
    takeIpQuota("tts", clientIp(req), 1500, 86_400_000, bi("Bu şəbəkədən günlük səs limiti bitdi.", "This network has used up today’s voice limit."));
    await takeAiQuota(userId, { light: true });
    const audio = await synthesize(text, preferences.language, rate);
    return new NextResponse(audio, { headers: { ...headers, "Content-Type": "audio/mpeg" } });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "rate_limited", error_description: e.en }, { status: e.status, headers });
    if (e instanceof AiError) {
      console.error("[tts]", e.message);
      return NextResponse.json({ error: "tts_unavailable", error_description: "Speech is unavailable" }, { status: e.status, headers });
    }
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
