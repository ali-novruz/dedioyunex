import { handle, jsonBody } from "@/lib/http";
import { requestCode } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    takeIpQuota("code", clientIp(req), 30, 3_600_000, "Çox sorğu. Bir az sonra cəhd edin.");
    const body = await jsonBody(req);
    const { demoCode } = await requestCode(body.email);
    return { ok: true, demoCode };
  });
}
