import { handle } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { disconnectClient } from "@/lib/oauth";

export function DELETE(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    disconnectClient(user.id, (await ctx.params).clientId);
    return { ok: true };
  });
}
