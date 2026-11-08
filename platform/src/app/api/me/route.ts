import { handle } from "@/lib/http";
import { requireApiUser, endSession } from "@/lib/session";
import { deleteUser } from "@/lib/users";

export function GET() {
  return handle(async () => {
    const u = await requireApiUser();
    return { email: u.email, categories: u.categories, preferences: u.prefs, onboarded: u.onboarded };
  });
}

/** Deletes the account and everything linked to it (sessions, tokens, clients). */
export function DELETE() {
  return handle(async () => {
    const u = await requireApiUser();
    await endSession();
    await deleteUser(u.id);
    return { ok: true };
  });
}
