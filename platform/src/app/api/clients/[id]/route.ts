import { handle } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { deleteClient } from "@/lib/clients";

export function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireApiUser();
    deleteClient(user.id, (await ctx.params).id);
    return { ok: true };
  });
}
