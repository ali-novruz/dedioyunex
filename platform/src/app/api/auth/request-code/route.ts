import { handle, jsonBody } from "@/lib/http";
import { requestCode } from "@/lib/session";

export function POST(req: Request) {
  return handle(async () => {
    const body = await jsonBody(req);
    const { demoCode } = await requestCode(body.email);
    return { ok: true, demoCode };
  });
}
