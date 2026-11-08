import { NextResponse } from "next/server";
import { preferencesForToken, resolveToken, OAuthError } from "@/lib/oauth";
import { assertOrigin, corsHeaders, oauthErrorResponse, preflight } from "@/lib/cors";
import { assistControl, assistPage, assistRewrite, assistSimplify, AiError, type PageAction, type PageHelp } from "@/lib/ai";
import { cacheKey, readCache, writeCache } from "@/lib/ai-cache";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { AuthError } from "@/lib/session";
import { bi, tr, type Lang } from "@/lib/lang";

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** POST /v1/assist: explains the partner page, or one control when `focus` is sent. Bearer token required. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let headers: Record<string, string> = { "Cache-Control": "no-store" };
  let lang: Lang = "az";
  try {
    const { clientId, userId } = await resolveToken(req.headers.get("authorization"));
    headers = { ...headers, ...(await corsHeaders(origin, clientId)) };
    await assertOrigin(origin, clientId);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new OAuthError("invalid_request", "JSON body required");
    const { preferences } = await preferencesForToken(req.headers.get("authorization"));
    lang = preferences.language;
    const headings = (Array.isArray(body.headings) ? body.headings : []).slice(0, 20).map((h) => s(h, 200)).filter(Boolean);
    const quota = bi("Bu şəbəkədən günlük limit bitdi.", "This network has used up today’s limit.");

    if (body.focus && typeof body.focus === "object") {
      const f = body.focus as Record<string, unknown>;
      const control = { label: s(f.label, 120), kind: s(f.kind, 20), hint: s(f.hint, 120) || undefined };
      if (!control.label && !control.hint) throw new OAuthError("invalid_request", "focus has no label");
      const input = { title: s(body.title, 300), headings: headings.slice(0, 3), text: s(body.text, 600), control, language: preferences.language };
      const key = cacheKey(["control", input]);
      const hit = await readCache<{ explain: string }>(key);
      if (hit) return NextResponse.json({ ...hit, cached: true }, { headers });
      takeIpQuota("assist", clientIp(req), 600, 86_400_000, quota);
      await takeAiQuota(userId, { light: true });
      const answer = await assistControl(input);
      await writeCache(key, answer);
      return NextResponse.json({ ...answer, cached: false }, { headers });
    }

    if (typeof body.rewrite === "string") {
      const text = s(body.rewrite, 1500);
      if (text.length < 40) throw new OAuthError("invalid_request", "text is too short");
      const key = cacheKey(["rewrite", text, preferences.language]);
      const hit = await readCache<{ plain: string }>(key);
      if (hit) return NextResponse.json({ ...hit, cached: true }, { headers });
      takeIpQuota("assist", clientIp(req), 600, 86_400_000, quota);
      await takeAiQuota(userId, { light: true });
      const answer = await assistRewrite(text, preferences.language);
      await writeCache(key, answer);
      return NextResponse.json({ ...answer, cached: false }, { headers });
    }

    const actions: PageAction[] = (Array.isArray(body.actions) ? body.actions : [])
      .slice(0, 80)
      .map((a: Record<string, unknown>) => ({ id: s(a?.id, 20), label: s(a?.label, 120), kind: s(a?.kind, 20), hint: s(a?.hint, 120) || undefined }))
      .filter((a) => a.id && (a.label || a.hint));
    const input = { url: s(body.url, 300), title: s(body.title, 300), headings, text: s(body.text, 4000), actions, language: preferences.language };
    if (!input.text && input.headings.length === 0 && actions.length === 0) throw new OAuthError("invalid_request", "page content is empty");

    if (body.simplify === true) {
      const simplifyKey = cacheKey(["simplify", input]);
      const hit = await readCache<{ keep: string[] }>(simplifyKey);
      if (hit) return NextResponse.json({ ...hit, cached: true }, { headers });
      takeIpQuota("assist", clientIp(req), 600, 86_400_000, quota);
      await takeAiQuota(userId, { light: true });
      const answer = await assistSimplify(input);
      await writeCache(simplifyKey, answer);
      return NextResponse.json({ ...answer, cached: false }, { headers });
    }

    const key = cacheKey(["page", input]);
    const hit = await readCache<PageHelp>(key);
    if (hit) return NextResponse.json({ ...hit, cached: true }, { headers });

    takeIpQuota("assist", clientIp(req), 300, 86_400_000, quota);
    await takeAiQuota(userId);
    const help = await assistPage(input);
    await writeCache(key, help);
    return NextResponse.json({ ...help, cached: false }, { headers });
  } catch (e) {
    const l = tr(lang);
    if (e instanceof AuthError) return NextResponse.json({ error: "rate_limited", error_description: l(e.message, e.en) }, { status: e.status, headers });
    if (e instanceof AiError) {
      console.error("[assist]", e.message);
      return NextResponse.json(
        { error: "ai_unavailable", error_description: e.status === 503 ? l("AI köməkçi hələ aktiv deyil.", "The AI assistant is not active yet.") : l("Köməkçi indi çox məşğuldur. Bir az sonra yenidən cəhd edin.", "The assistant is very busy right now. Please try again in a moment.") },
        { status: e.status, headers },
      );
    }
    return oauthErrorResponse(e, headers);
  }
}

export function OPTIONS(req: Request) {
  return preflight(req.headers.get("origin"));
}
