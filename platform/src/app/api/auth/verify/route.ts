import { handle, jsonBody } from "@/lib/http";
import { verifyCode } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    takeIpQuota("verify", clientIp(req), 60, 3_600_000, "Çox cəhd. Bir az sonra yenidən yoxlayın.");
    const body = await jsonBody(req);
    const user = await verifyCode(body.email, body.code);
    return { ok: true, onboarded: user.onboarded };
  });
}
