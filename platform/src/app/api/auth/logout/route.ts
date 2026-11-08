import { handle } from "@/lib/http";
import { endSession } from "@/lib/session";

export function POST() {
  return handle(async () => {
    await endSession();
    return { ok: true };
  });
}
