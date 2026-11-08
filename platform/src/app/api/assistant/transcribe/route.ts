import { handle } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { transcribe } from "@/lib/ai";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) throw new AuthError("Səs yazısı göndərilmədi");
    if (audio.size > 15 * 1024 * 1024) throw new AuthError("Səs yazısı çox uzundur");
    takeIpQuota("ai", clientIp(req), 200, 86_400_000, "Bu şəbəkədən günlük köməkçi limiti bitdi.");
    await takeAiQuota(user.id);
    // The recording is forwarded to the speech service and never stored.
    return { text: await transcribe(audio, user.prefs.language) };
  });
}
