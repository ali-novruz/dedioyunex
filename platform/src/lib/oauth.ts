import "server-only";
import { exec, now, one, query } from "./db";
import { getClient, originAllowed, type Client } from "./clients";
import { pairwiseSub, randomToken, sha256, sha256Base64Url, safeEqual } from "./crypto";
import { getUser } from "./users";
import type { Preferences } from "@sdk/schema";
import { bi, type Bi } from "./lang";

const CODE_TTL = 5 * 60_000;

export class OAuthError extends Error {
  readonly en: string;
  constructor(readonly code: string, message: string | Bi, readonly status = 400) {
    super(typeof message === "string" ? message : message.az);
    this.en = typeof message === "string" ? message : message.en;
  }
}

export type ResponseMode = "query" | "web_message" | "mu_fragment";

export interface AuthorizeRequest {
  client: Client;
  redirectUri: string; // "postmessage" for web popup
  responseMode: ResponseMode;
  origin: string | null; // web only
  returnTo: string | null; // web_message only: page to come back to when the popup has no opener
  state: string;
  codeChallenge: string;
}

function sameOriginUrl(raw: string, origin: string, what: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new OAuthError("invalid_request", `${what} is not a URL`);
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new OAuthError("invalid_request", `${what} must be http(s)`);
  if (u.origin !== origin) throw new OAuthError("invalid_request", `${what} must be on the same origin`);
  return u.href.split("#")[0];
}

/** Validates /oauth/authorize parameters. Errors here are shown to the user, never redirected. */
export async function parseAuthorize(q: Record<string, string | undefined>): Promise<AuthorizeRequest> {
  if (q.response_type !== "code") throw new OAuthError("invalid_request", "response_type must be 'code'");
  const client = q.client_id ? await getClient(q.client_id) : null;
  if (!client) throw new OAuthError("invalid_client", bi("Naməlum xidmət (client_id)", "Unknown service (client_id)"));
  if (!q.code_challenge || !/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge)) throw new OAuthError("invalid_request", "code_challenge is missing or malformed");
  if (q.code_challenge_method !== "S256") throw new OAuthError("invalid_request", "code_challenge_method must be S256");
  if (!q.state || q.state.length > 200) throw new OAuthError("invalid_request", "state is missing");
  const mode = (q.response_mode ?? "query") as ResponseMode;
  if (!["query", "web_message", "mu_fragment"].includes(mode)) throw new OAuthError("invalid_request", "unsupported response_mode");
  const redirectUri = q.redirect_uri ?? "";
  const base = { client, state: q.state, codeChallenge: q.code_challenge };

  if (mode === "web_message") {
    if (redirectUri !== "postmessage") throw new OAuthError("invalid_request", "redirect_uri must be 'postmessage' for web_message");
    const origin = q.origin ?? "";
    if (!originAllowed(client, origin)) throw new OAuthError("invalid_request", bi(`Bu sayt (${origin || "?"}) ${client.name} üçün qeydiyyatda deyil`, `This site (${origin || "?"}) is not registered for ${client.name}`));
    const returnTo = q.return_to ? sameOriginUrl(q.return_to, origin, "return_to") : null;
    return { ...base, redirectUri, responseMode: mode, origin, returnTo };
  }
  if (mode === "mu_fragment") {
    let origin: string;
    try {
      origin = new URL(redirectUri).origin;
    } catch {
      throw new OAuthError("invalid_request", "redirect_uri is not a URL");
    }
    if (!originAllowed(client, origin)) throw new OAuthError("invalid_request", bi(`Bu sayt (${origin}) ${client.name} üçün qeydiyyatda deyil`, `This site (${origin}) is not registered for ${client.name}`));
    return { ...base, redirectUri: sameOriginUrl(redirectUri, origin, "redirect_uri"), responseMode: mode, origin, returnTo: null };
  }
  if (!client.redirectUris.includes(redirectUri)) throw new OAuthError("invalid_request", "redirect_uri is not registered for this client");
  return { ...base, redirectUri, responseMode: "query", origin: null, returnTo: null };
}

export async function issueCode(req: AuthorizeRequest, userId: string): Promise<string> {
  const code = randomToken(24);
  await exec("INSERT INTO auth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at) VALUES ($1, $2, $3, $4, $5, $6)", [
    sha256(code),
    req.client.id,
    userId,
    req.redirectUri,
    req.codeChallenge,
    now() + CODE_TTL,
  ]);
  return code;
}

/** Where the browser goes after consent (query / fragment modes, and the no-opener fallback of web_message). */
export function redirectTarget(req: AuthorizeRequest, result: { code: string } | { error: string }): string {
  const params = new URLSearchParams();
  if (req.responseMode === "web_message" || req.responseMode === "mu_fragment") {
    const target = req.responseMode === "web_message" ? req.returnTo : req.redirectUri;
    if (!target) throw new Error("redirectTarget: web_message request without return_to");
    if ("code" in result) params.set("mu_code", result.code); else params.set("mu_error", result.error);
    params.set("mu_state", req.state);
    return `${target}#${params}`;
  }
  if ("code" in result) params.set("code", result.code); else params.set("error", result.error);
  params.set("state", req.state);
  return `${req.redirectUri}${req.redirectUri.includes("?") ? "&" : "?"}${params}`;
}

export async function exchangeCode(input: { code?: unknown; code_verifier?: unknown; client_id?: unknown; redirect_uri?: unknown; grant_type?: unknown }) {
  if (input.grant_type !== "authorization_code") throw new OAuthError("unsupported_grant_type", "grant_type must be authorization_code");
  for (const k of ["code", "code_verifier", "client_id", "redirect_uri"] as const) {
    if (typeof input[k] !== "string" || !input[k]) throw new OAuthError("invalid_request", `${k} is required`);
  }
  const code = input.code as string, verifier = input.code_verifier as string, clientId = input.client_id as string;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new OAuthError("invalid_request", "code_verifier is malformed");
  // Atomically burn the code: a code can be redeemed (or fail) exactly once.
  const row = await one<{ client_id: string; user_id: string; redirect_uri: string; code_challenge: string }>(
    "UPDATE auth_codes SET used = TRUE WHERE code_hash = $1 AND used = FALSE AND expires_at > $2 RETURNING client_id, user_id, redirect_uri, code_challenge",
    [sha256(code), now()],
  );
  if (!row) throw new OAuthError("invalid_grant", "code is invalid, used or expired");
  if (row.client_id !== clientId) throw new OAuthError("invalid_grant", "code was issued to another client");
  if (row.redirect_uri !== input.redirect_uri) throw new OAuthError("invalid_grant", "redirect_uri mismatch");
  if (!safeEqual(sha256Base64Url(verifier), row.code_challenge)) throw new OAuthError("invalid_grant", "PKCE verification failed");
  const user = await getUser(row.user_id);
  if (!user) throw new OAuthError("invalid_grant", "user no longer exists");

  const token = `mu_${randomToken(32)}`;
  await exec("INSERT INTO tokens (token_hash, client_id, user_id, created_at) VALUES ($1, $2, $3, $4)", [sha256(token), clientId, user.id, now()]);
  return {
    access_token: token,
    token_type: "Bearer",
    scope: "preferences",
    sub: pairwiseSub(user.id, clientId),
    preferences: user.prefs,
  };
}

export async function resolveToken(authHeader: string | null): Promise<{ clientId: string; userId: string }> {
  const m = authHeader?.match(/^Bearer\s+(\S+)$/i);
  if (!m) throw new OAuthError("invalid_token", "Bearer token required", 401);
  const row = await one<{ client_id: string; user_id: string }>(
    "UPDATE tokens SET last_used_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL RETURNING client_id, user_id",
    [sha256(m[1]), now()],
  );
  if (!row) throw new OAuthError("invalid_token", "token is invalid or revoked", 401);
  return { clientId: row.client_id, userId: row.user_id };
}

export async function preferencesForToken(authHeader: string | null): Promise<{ sub: string; preferences: Preferences; updatedAt: string; clientId: string }> {
  const { clientId, userId } = await resolveToken(authHeader);
  const user = await getUser(userId);
  if (!user) throw new OAuthError("invalid_token", "user no longer exists", 401);
  return { sub: pairwiseSub(userId, clientId), preferences: user.prefs, updatedAt: new Date(user.updatedAt).toISOString(), clientId };
}

/** Revokes a token. When clientId is given (browser call), the token must belong to that client. */
export async function revokeToken(token: unknown, clientId: string | null): Promise<{ clientId: string | null }> {
  if (typeof token !== "string" || !token) throw new OAuthError("invalid_request", "token is required");
  const row = await one<{ client_id: string }>(
    `UPDATE tokens SET revoked_at = $2 WHERE token_hash = $1 AND revoked_at IS NULL ${clientId ? "AND client_id = $3" : ""} RETURNING client_id`,
    clientId ? [sha256(token), now(), clientId] : [sha256(token), now()],
  );
  return { clientId: row?.client_id ?? null };
}

export interface Connection {
  clientId: string;
  name: string;
  connectedAt: number;
  lastUsedAt: number | null;
}

export async function connectionsOf(userId: string): Promise<Connection[]> {
  return query<Connection>(
    `SELECT t.client_id AS "clientId", c.name AS name, MIN(t.created_at) AS "connectedAt", MAX(t.last_used_at) AS "lastUsedAt"
     FROM tokens t JOIN clients c ON c.id = t.client_id
     WHERE t.user_id = $1 AND t.revoked_at IS NULL GROUP BY t.client_id, c.name ORDER BY "connectedAt" DESC`,
    [userId],
  );
}

export async function disconnectClient(userId: string, clientId: string): Promise<void> {
  await exec("UPDATE tokens SET revoked_at = $1 WHERE user_id = $2 AND client_id = $3 AND revoked_at IS NULL", [now(), userId, clientId]);
}
