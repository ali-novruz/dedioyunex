import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, now } from "./db";
import { env } from "./env";
import { randomToken, sha256, sixDigitCode, safeEqual } from "./crypto";
import { findOrCreateUser, getUser, type User } from "./users";
import { sendLoginCode } from "./mail";

const COOKIE = "mu_session";
const SESSION_DAYS = 30;
const CODE_TTL = 10 * 60_000;
const RESEND_AFTER = 30_000;
const MAX_ATTEMPTS = 5;

export class AuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function normalizeEmail(raw: unknown): string {
  if (typeof raw !== "string") throw new AuthError("E-poçt daxil edin");
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) throw new AuthError("E-poçt ünvanı düzgün deyil");
  return e;
}

/** Creates and delivers a login code. Returns the code only in demo mode (DEMO_SHOW_CODES=true). */
export async function requestCode(rawEmail: unknown): Promise<{ demoCode: string | null }> {
  const email = normalizeEmail(rawEmail);
  const d = db();
  const existing = d.prepare("SELECT sent_at FROM login_codes WHERE email = ?").get(email) as { sent_at: number } | undefined;
  if (existing && now() - existing.sent_at < RESEND_AFTER) {
    throw new AuthError("Kod artıq göndərildi. 30 saniyə sonra yenidən cəhd edin.", 429);
  }
  const code = sixDigitCode();
  d.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = excluded.sent_at`,
  ).run(email, sha256(`${email}:${code}`), now() + CODE_TTL, now());
  if (env.demoShowCodes) return { demoCode: code };
  await sendLoginCode(email, code);
  return { demoCode: null };
}

export async function verifyCode(rawEmail: unknown, rawCode: unknown): Promise<User> {
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
  if (code.length !== 6) throw new AuthError("Kod 6 rəqəmdən ibarətdir");
  const d = db();
  const row = d.prepare("SELECT * FROM login_codes WHERE email = ?").get(email) as
    | { code_hash: string; expires_at: number; attempts: number }
    | undefined;
  if (!row || row.expires_at < now()) throw new AuthError("Kodun vaxtı bitib. Yeni kod istəyin.");
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError("Çox səhv cəhd. Yeni kod istəyin.", 429);
  if (!safeEqual(row.code_hash, sha256(`${email}:${code}`))) {
    d.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?").run(email);
    throw new AuthError("Kod səhvdir");
  }
  d.prepare("DELETE FROM login_codes WHERE email = ?").run(email);
  const user = findOrCreateUser(email);
  await startSession(user.id);
  return user;
}

async function startSession(userId: string): Promise<void> {
  const token = randomToken();
  const expires = now() + SESSION_DAYS * 86_400_000;
  db().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    expires: new Date(expires),
  });
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(sha256(token)) as
    | { user_id: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < now()) return null;
  return getUser(row.user_id);
}

/** For pages: redirect to login (keeping the return path) when there is no session. */
export async function requireUser(returnTo: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/giris?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For API routes: throw 401 when there is no session. */
export async function requireApiUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new AuthError("Daxil olun", 401);
  return user;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  jar.delete(COOKIE);
}
