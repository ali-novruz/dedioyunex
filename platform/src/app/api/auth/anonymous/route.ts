import { bi } from "@/lib/lang";
import { handle } from "@/lib/http";
import { currentUser, startAnonymous } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    if (await currentUser()) return { ok: true };
    takeIpQuota("anon", clientIp(req), 20, 3_600_000, bi("Bu şəbəkədən çox hesab yaradıldı. Bir az sonra cəhd edin.", "Too many accounts were created from this network. Try again a little later."));
    await startAnonymous();
    return { ok: true };
  });
}
