import { handle, jsonBody } from "@/lib/http";
import { verifyCode } from "@/lib/session";

export function POST(req: Request) {
  return handle(async () => {
    const body = await jsonBody(req);
    const user = await verifyCode(body.email, body.code);
    return { ok: true, onboarded: user.onboarded };
  });
}
