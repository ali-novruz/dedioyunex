import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { preferencesForToken, resolveToken, OAuthError } from "@/lib/oauth";
import { assertOrigin, corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";
import { assistPage, AiError, type PageAction, type PageHelp } from "@/lib/ai";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { AuthError } from "@/lib/session";

// Same page + same language → same explanation: cache to save AI calls (many users read the same news page).
const cache = new Map<string, { at: number; help: PageHelp }>();
const TTL = 60 * 60_000;

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** POST /v1/assist — explain the current partner page to the connected user. Bearer token required. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let headers: Record<string, string> = { "Cache-Control": "no-store" };
  try {
    const { clientId, userId } = await resolveToken(req.headers.get("authorization"));
    headers = { ...headers, ...(await corsHeaders(origin, clientId)) };
    await assertOrigin(origin, clientId);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new OAuthError("invalid_request", "JSON body required");
    const { preferences } = await preferencesForToken(req.headers.get("authorization"));
    const actions: PageAction[] = (Array.isArray(body.actions) ? body.actions : [])
      .slice(0, 80)
      .map((a: Record<string, unknown>) => ({ id: s(a?.id, 20), label: s(a?.label, 120), kind: s(a?.kind, 20), hint: s(a?.hint, 120) || undefined }))
      .filter((a) => a.id && (a.label || a.hint));
    const input = {
      url: s(body.url, 300),
      title: s(body.title, 300),
      headings: (Array.isArray(body.headings) ? body.headings : []).slice(0, 20).map((h) => s(h, 200)).filter(Boolean),
      text: s(body.text, 6000),
      actions,
      language: preferences.language,
    };
    if (!input.text && input.headings.length === 0 && actions.length === 0) throw new OAuthError("invalid_request", "page content is empty");

    const key = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ ...hit.help, cached: true }, { headers });

    takeIpQuota("assist", clientIp(req), 300, 86_400_000, "Bu şəbəkədən günlük limit bitdi.");
    await takeAiQuota(userId);
    const help = await assistPage(input);
    cache.set(key, { at: Date.now(), help });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return NextResponse.json({ ...help, cached: false }, { headers });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "rate_limited", error_description: e.message }, { status: e.status, headers });
    if (e instanceof AiError) {
      console.error("[assist]", e.message);
      return NextResponse.json(
        { error: "ai_unavailable", error_description: e.status === 503 ? "AI köməkçi hələ aktiv deyil." : "Köməkçi cavab verə bilmədi. Yenidən cəhd edin." },
        { status: e.status, headers },
      );
    }
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
