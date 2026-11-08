import { NextResponse } from "next/server";
import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { synthesize } from "@/lib/speech";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { bi } from "@/lib/lang";

/** Reads text aloud for the platform's own pages. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
    if (!text) throw new AuthError(bi("Oxunacaq mətn yoxdur", "There is no text to read"));
    const rate = typeof body.rate === "number" && body.rate >= 0.5 && body.rate <= 2 ? body.rate : 1;
    takeIpQuota("tts", clientIp(req), 1500, 86_400_000, bi("Bu şəbəkədən günlük səs limiti bitdi.", "This network has used up today’s voice limit."));
    await takeAiQuota(user.id, { light: true });
    const audio = await synthesize(text, user.prefs.language, rate);
    return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  });
}
