import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { interpret } from "@/lib/ai";

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    if (typeof body.text !== "string") throw new AuthError("text is required");
    const result = await interpret(body.text, user.prefs);
    // Nothing is saved here: the user confirms first, then the client PATCHes /api/me/preferences.
    return { ...result, proposed: { ...user.prefs, ...result.patch } };
  });
}
