import "server-only";
import { db, now } from "./db";
import { getClient, originAllowed, type Client } from "./clients";
import { pairwiseSub, randomToken, sha256, sha256Base64Url, safeEqual } from "./crypto";
import { getUser } from "./users";
import type { Preferences } from "@sdk/schema";

const CODE_TTL = 5 * 60_000;

export class OAuthError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message);
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

/** Validates /oauth/authorize parameters. Errors here are shown to the user, never redirected. */
export function parseAuthorize(q: Record<string, string | undefined>): AuthorizeRequest {
  if (q.response_type !== "code") throw new OAuthError("invalid_request", "response_type must be 'code'");
  const client = q.client_id ? getClient(q.client_id) : null;
  if (!client) throw new OAuthError("invalid_client", "Naməlum xidmət (client_id)");
  if (!q.code_challenge || !/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge)) throw new OAuthError("invalid_request", "code_challenge is missing or malformed");
  if (q.code_challenge_method !== "S256") throw new OAuthError("invalid_request", "code_challenge_method must be S256");
  if (!q.state || q.state.length > 200) throw new OAuthError("invalid_request", "state is missing");
  const mode = (q.response_mode ?? "query") as ResponseMode;
  if (!["query", "web_message", "mu_fragment"].includes(mode)) throw new OAuthError("invalid_request", "unsupported response_mode");
  const redirectUri = q.redirect_uri ?? "";

  if (mode === "web_message") {
    if (redirectUri !== "postmessage") throw new OAuthError("invalid_request", "redirect_uri must be 'postmessage' for web_message");
    const origin = q.origin ?? "";
    if (!originAllowed(client, origin)) throw new OAuthError("invalid_request", `Bu sayt (${origin || "?"}) ${client.name} üçün qeydiyyatda deyil`);
    let returnTo: string | null = null;
    if (q.return_to) {
      let rOrigin = "";
      try {
        rOrigin = new URL(q.return_to).origin;
      } catch {
        throw new OAuthError("invalid_request", "return_to is not a URL");
      }
      if (rOrigin !== origin) throw new OAuthError("invalid_request", "return_to must be on the same origin");
      returnTo = q.return_to.split("#")[0];
    }
    return { client, redirectUri, responseMode: mode, origin, returnTo, state: q.state, codeChallenge: q.code_challenge };
  }
  if (mode === "mu_fragment") {
    let origin: string;
    try {
      origin = new URL(redirectUri).origin;
    } catch {
      throw new OAuthError("invalid_request", "redirect_uri is not a URL");
    }
    if (!originAllowed(client, origin)) throw new OAuthError("invalid_request", `Bu sayt (${origin}) ${client.name} üçün qeydiyyatda deyil`);
    return { client, redirectUri, responseMode: mode, origin, returnTo: null, state: q.state, codeChallenge: q.code_challenge };
  }
  if (!client.redirectUris.includes(redirectUri)) throw new OAuthError("invalid_request", "redirect_uri is not registered for this client");
  return { client, redirectUri, responseMode: "query", origin: null, returnTo: null, state: q.state, codeChallenge: q.code_challenge };
}

export function issueCode(req: AuthorizeRequest, userId: string): string {
  const code = randomToken(24);
  db().prepare("INSERT INTO auth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(sha256(code), req.client.id, userId, req.redirectUri, req.codeChallenge, now() + CODE_TTL);
  return code;
}

/** Where the browser goes after consent (query / fragment modes). */
export function redirectTarget(req: AuthorizeRequest, result: { code: string } | { error: string }): string {
  const params = new URLSearchParams();
  if (req.responseMode === "web_message") {
    if (!req.returnTo) throw new Error("redirectTarget: web_message request without return_to");
    if ("code" in result) params.set("mu_code", result.code); else params.set("mu_error", result.error);
    params.set("mu_state", req.state);
    return `${req.returnTo}#${params}`;
  }
  if (req.responseMode === "mu_fragment") {
    if ("code" in result) params.set("mu_code", result.code); else params.set("mu_error", result.error);
    params.set("mu_state", req.state);
    return `${req.redirectUri}#${params}`;
  }
  if ("code" in result) params.set("code", result.code); else params.set("error", result.error);
  params.set("state", req.state);
  return `${req.redirectUri}${req.redirectUri.includes("?") ? "&" : "?"}${params}`;
}

export function exchangeCode(input: { code?: unknown; code_verifier?: unknown; client_id?: unknown; redirect_uri?: unknown; grant_type?: unknown }) {
  if (input.grant_type !== "authorization_code") throw new OAuthError("unsupported_grant_type", "grant_type must be authorization_code");
  for (const k of ["code", "code_verifier", "client_id", "redirect_uri"] as const) {
    if (typeof input[k] !== "string" || !input[k]) throw new OAuthError("invalid_request", `${k} is required`);
  }
  const code = input.code as string, verifier = input.code_verifier as string, clientId = input.client_id as string;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new OAuthError("invalid_request", "code_verifier is malformed");
  const d = db();
  const row = d.prepare("SELECT * FROM auth_codes WHERE code_hash = ?").get(sha256(code)) as
    | { client_id: string; user_id: string; redirect_uri: string; code_challenge: string; expires_at: number; used: number }
    | undefined;
  if (!row || row.used || row.expires_at < now()) throw new OAuthError("invalid_grant", "code is invalid, used or expired");
  d.prepare("UPDATE auth_codes SET used = 1 WHERE code_hash = ?").run(sha256(code));
  if (row.client_id !== clientId) throw new OAuthError("invalid_grant", "code was issued to another client");
  if (row.redirect_uri !== input.redirect_uri) throw new OAuthError("invalid_grant", "redirect_uri mismatch");
  if (!safeEqual(sha256Base64Url(verifier), row.code_challenge)) throw new OAuthError("invalid_grant", "PKCE verification failed");
  const user = getUser(row.user_id);
  if (!user) throw new OAuthError("invalid_grant", "user no longer exists");

  const token = `mu_${randomToken(32)}`;
  d.prepare("INSERT INTO tokens (token_hash, client_id, user_id, created_at) VALUES (?, ?, ?, ?)").run(sha256(token), clientId, user.id, now());
  return {
    access_token: token,
    token_type: "Bearer",
    scope: "preferences",
    sub: pairwiseSub(user.id, clientId),
    preferences: user.prefs,
  };
}

export function resolveToken(authHeader: string | null): { clientId: string; userId: string } {
  const m = authHeader?.match(/^Bearer\s+(\S+)$/i);
  if (!m) throw new OAuthError("invalid_token", "Bearer token required", 401);
  const d = db();
  const row = d.prepare("SELECT client_id, user_id, revoked_at FROM tokens WHERE token_hash = ?").get(sha256(m[1])) as
    | { client_id: string; user_id: string; revoked_at: number | null }
    | undefined;
  if (!row || row.revoked_at) throw new OAuthError("invalid_token", "token is invalid or revoked", 401);
  d.prepare("UPDATE tokens SET last_used_at = ? WHERE token_hash = ?").run(now(), sha256(m[1]));
  return { clientId: row.client_id, userId: row.user_id };
}

export function preferencesForToken(authHeader: string | null): { sub: string; preferences: Preferences; updatedAt: string; clientId: string } {
  const { clientId, userId } = resolveToken(authHeader);
  const user = getUser(userId);
  if (!user) throw new OAuthError("invalid_token", "user no longer exists", 401);
  return { sub: pairwiseSub(userId, clientId), preferences: user.prefs, updatedAt: new Date(user.updatedAt).toISOString(), clientId };
}

export function revokeToken(token: unknown): { clientId: string | null } {
  if (typeof token !== "string" || !token) throw new OAuthError("invalid_request", "token is required");
  const d = db();
  const row = d.prepare("SELECT client_id FROM tokens WHERE token_hash = ?").get(sha256(token)) as { client_id: string } | undefined;
  d.prepare("UPDATE tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(now(), sha256(token));
  return { clientId: row?.client_id ?? null };
}

export interface Connection {
  clientId: string;
  name: string;
  connectedAt: number;
  lastUsedAt: number | null;
}

export function connectionsOf(userId: string): Connection[] {
  return db()
    .prepare(
      `SELECT t.client_id AS clientId, c.name AS name, MIN(t.created_at) AS connectedAt, MAX(t.last_used_at) AS lastUsedAt
       FROM tokens t JOIN clients c ON c.id = t.client_id
       WHERE t.user_id = ? AND t.revoked_at IS NULL GROUP BY t.client_id ORDER BY connectedAt DESC`,
    )
    .all(userId) as unknown as Connection[];
}

export function disconnectClient(userId: string, clientId: string): void {
  db().prepare("UPDATE tokens SET revoked_at = ? WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL").run(now(), userId, clientId);
}
