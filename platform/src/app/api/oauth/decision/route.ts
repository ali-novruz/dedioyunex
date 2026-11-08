import { handle, jsonBody } from "@/lib/http";
import { requireApiUser, AuthError } from "@/lib/session";
import { issueCode, parseAuthorize, redirectTarget, OAuthError } from "@/lib/oauth";

/** Called by the consent screen. Returns what the browser must do next. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    const params = body.params as Record<string, string> | undefined;
    if (!params || typeof params !== "object") throw new AuthError("params is required");
    let request;
    try {
      request = parseAuthorize(params);
    } catch (e) {
      if (e instanceof OAuthError) throw new AuthError(e.message);
      throw e;
    }
    const allow = body.decision === "allow";
    const result = allow ? { code: issueCode(request, user.id) } : { error: "access_denied" };
    if (request.responseMode === "web_message") {
      return {
        action: "postMessage",
        origin: request.origin,
        message: { type: "meneuygun:authorize", state: request.state, ...result },
        // Used when this window has no opener (popup opened as a tab by some browsers).
        fallbackUrl: request.returnTo ? redirectTarget(request, result) : null,
      };
    }
    return { action: "redirect", url: redirectTarget(request, result) };
  });
}
