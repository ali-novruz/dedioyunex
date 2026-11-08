import { bi } from "@/lib/lang";
import { handle } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { transcribe } from "@/lib/ai";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) throw new AuthError(bi("Səs yazısı göndərilmədi", "No recording was sent"));
    if (audio.size > 4 * 1024 * 1024) throw new AuthError(bi("Səs yazısı çox uzundur", "The recording is too long")); // Vercel rejects request bodies over 4.5 MB
    takeIpQuota("ai", clientIp(req), 200, 86_400_000, bi("Bu şəbəkədən günlük köməkçi limiti bitdi.", "This network has used up today’s assistant limit."));
    await takeAiQuota(user.id);
    // The recording is forwarded to the speech service and never stored.
    return { text: await transcribe(audio, user.prefs.language) };
  });
}
