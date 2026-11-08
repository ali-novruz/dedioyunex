import { handle } from "@/lib/http";
import { currentUser, startAnonymous } from "@/lib/session";

export function POST() {
  return handle(async () => {
    if (await currentUser()) return { ok: true };
    await startAnonymous();
    return { ok: true };
  });
}
