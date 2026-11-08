import { bi } from "@/lib/lang";
import { requestLang } from "@/lib/lang-server";
import { handle, jsonBody } from "@/lib/http";
import { requestCode } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    takeIpQuota("code", clientIp(req), 30, 3_600_000, bi("Çox sorğu. Bir az sonra cəhd edin.", "Too many requests. Try again a little later."));
    const body = await jsonBody(req);
    const { demoCode } = await requestCode(body.email, await requestLang());
    return { ok: true, demoCode };
  });
}
