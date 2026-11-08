import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { interpret, type Turn } from "@/lib/ai";
import { takeAiQuota } from "@/lib/limits";

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    if (typeof body.text !== "string") throw new AuthError("text is required");
    const prev = body.previous as Partial<Turn> | undefined;
    const previous = prev && typeof prev.said === "string" && typeof prev.question === "string" ? (prev as Turn) : null;
    takeAiQuota(user.id);
    const result = await interpret(body.text, user.prefs, previous);
    // Nothing is saved here: the user confirms first, then the client PATCHes /api/me/preferences.
    return { ...result, proposed: { ...user.prefs, ...result.patch } };
  });
}
