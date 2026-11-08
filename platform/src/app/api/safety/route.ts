import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { checkScam } from "@/lib/ai";
import { endSafeMode, getContact, startSafeMode, SAFE_MIN_MS } from "@/lib/users";
import { sendSafetyAlert } from "@/lib/mail";
import { env } from "@/lib/env";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { bi } from "@/lib/lang";

/** Safe mode: start, end, or check what a caller said. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    if (body.action === "start") {
      takeIpQuota("safe", clientIp(req), 40, 3_600_000, bi("Çox sorğu. Bir az sonra cəhd edin.", "Too many requests. Try again a little later."));
      const until = await startSafeMode(user.id);
      const contact = await getContact(user.id);
      let emailed = false;
      if (contact?.email && env.smtpUrl) {
        try {
          await sendSafetyAlert(contact.email, user.prefs.language);
          emailed = true;
        } catch (e) {
          console.error("[safety] could not e-mail the trusted person", e);
        }
      }
      return { until, emailed, contact: contact && { name: contact.name, phone: contact.phone } };
    }
    if (body.action === "end") {
      const started = user.safeUntil === null ? null : user.safeUntil - 24 * 60 * 60_000;
      if (started !== null && Date.now() - started < SAFE_MIN_MS) throw new AuthError(bi("Tələsməyin. Bir dəqiqə gözləyin, sonra bitirə bilərsiniz.", "Take your time. Wait one minute before ending it."), 429);
      await endSafeMode(user.id);
      return { ok: true };
    }
    if (body.action === "check") {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
      if (!text) throw new AuthError(bi("Nə dediklərini yazın.", "Write what they said."));
      takeIpQuota("ai", clientIp(req), 200, 86_400_000, bi("Bu şəbəkədən günlük limit bitdi.", "This network has used up today’s limit."));
      await takeAiQuota(user.id, { light: true });
      return await checkScam(text, user.prefs.language);
    }
    throw new AuthError(bi("Naməlum əməliyyat", "Unknown action"));
  });
}
