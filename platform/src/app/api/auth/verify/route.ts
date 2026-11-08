import { bi } from "@/lib/lang";
import { handle, jsonBody } from "@/lib/http";
import { verifyCode } from "@/lib/session";
import { clientIp, takeIpQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    takeIpQuota("verify", clientIp(req), 60, 3_600_000, bi("Çox cəhd. Bir az sonra yenidən yoxlayın.", "Too many tries. Check again a little later."));
    const body = await jsonBody(req);
    const user = await verifyCode(body.email, body.code);
    return { ok: true, onboarded: user.onboarded };
  });
}
