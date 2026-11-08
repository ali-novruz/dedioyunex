import { handle } from "@/lib/http";
import { currentUser, startAnonymous } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    if (await currentUser()) return { ok: true };
    takeIpQuota("anon", clientIp(req), 20, 3_600_000, "Bu şəbəkədən çox hesab yaradıldı. Bir az sonra cəhd edin.");
    await startAnonymous();
    return { ok: true };
  });
}
