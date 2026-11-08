import { bi } from "@/lib/lang";
import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { interpret, type Turn } from "@/lib/ai";
import { takeAiQuota, takeIpQuota, clientIp } from "@/lib/limits";
import { validatePatch } from "@sdk/schema";

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    if (typeof body.text !== "string") throw new AuthError(bi("text is required", "text is required"));
    const prev = body.previous as Partial<Turn> | undefined;
    const previous = prev && typeof prev.said === "string" && typeof prev.question === "string" ? (prev as Turn) : null;
    takeIpQuota("ai", clientIp(req), 200, 86_400_000, bi("Bu şəbəkədən günlük köməkçi limiti bitdi.", "This network has used up today’s assistant limit."));
    await takeAiQuota(user.id);
    // draft = the suggestion on screen; the user is steering it, so the assistant continues from there.
    const draft = body.draft === undefined ? {} : validatePatch(body.draft);
    const result = await interpret(body.text, { ...user.prefs, ...draft }, previous);
    const patch = { ...draft, ...result.patch };
    // Nothing is saved here: the user confirms first, then the client PATCHes /api/me/preferences.
    return { ...result, patch, proposed: { ...user.prefs, ...patch } };
  });
}
