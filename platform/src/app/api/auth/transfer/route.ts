import { bi } from "@/lib/lang";
import { handle, jsonBody } from "@/lib/http";
import { consumeTransferToken, AuthError } from "@/lib/session";

export function POST(req: Request) {
  return handle(async () => {
    const body = await jsonBody(req);
    if (typeof body.token !== "string") throw new AuthError(bi("token is required", "token is required"));
    const user = await consumeTransferToken(body.token);
    return { ok: true, onboarded: user.onboarded };
  });
}
