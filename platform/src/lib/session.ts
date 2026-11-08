import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exec, now, one } from "./db";
import { env } from "./env";
import { randomToken, sha256, sixDigitCode, safeEqual } from "./crypto";
import { attachEmail, createAnonymousUser, findOrCreateUser, findUserByEmail, getUser, type User } from "./users";
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
  const code = sixDigitCode();
  const t = now();
  // Upsert only when the previous code is older than RESEND_AFTER (atomic throttle).
  const n = await exec(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts, sent_at) VALUES ($1, $2, $3, 0, $4)
     ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = EXCLUDED.sent_at
     WHERE login_codes.sent_at < $5`,
    [email, sha256(`${email}:${code}`), t + CODE_TTL, t, t - RESEND_AFTER],
  );
  if (n === 0) throw new AuthError("Kod artıq göndərildi. 30 saniyə sonra yenidən cəhd edin.", 429);
  const demoDomain = env.demoEmailDomain;
  if (env.demoShowCodes || (demoDomain && email.endsWith(`@${demoDomain}`))) return { demoCode: code };
  if (!env.smtpUrl) {
    throw new AuthError(
      demoDomain
        ? `E-poçt göndərmə hələ qurulmayıb. Demo üçün @${demoDomain} ünvanı istifadə edin və ya “E-poçtsuz başla” düyməsini seçin.`
        : "E-poçt göndərmə hələ qurulmayıb. “E-poçtsuz başla” düyməsini seçin.",
      503,
    );
  }
  await sendLoginCode(email, code);
  return { demoCode: null };
}

export async function verifyCode(rawEmail: unknown, rawCode: unknown): Promise<User> {
  const email = normalizeEmail(rawEmail);
  const code = typeof rawCode === "string" ? rawCode.replace(/\D/g, "") : "";
  if (code.length !== 6) throw new AuthError("Kod 6 rəqəmdən ibarətdir");
  // Count the attempt atomically before comparing, so parallel guesses cannot exceed MAX_ATTEMPTS.
  const row = await one<{ code_hash: string; expires_at: number }>(
    "UPDATE login_codes SET attempts = attempts + 1 WHERE email = $1 AND attempts < $2 RETURNING code_hash, expires_at",
    [email, MAX_ATTEMPTS],
  );
  if (!row) {
    const exists = await one("SELECT 1 FROM login_codes WHERE email = $1", [email]);
    throw new AuthError(exists ? "Çox səhv cəhd. Yeni kod istəyin." : "Kodun vaxtı bitib. Yeni kod istəyin.", exists ? 429 : 400);
  }
  if (row.expires_at < now()) throw new AuthError("Kodun vaxtı bitib. Yeni kod istəyin.");
  if (!safeEqual(row.code_hash, sha256(`${email}:${code}`))) throw new AuthError("Kod səhvdir");
  await exec("DELETE FROM login_codes WHERE email = $1", [email]);

  // Signed in without e-mail on this device? Then the code adds the e-mail to that account.
  const current = await currentUser();
  if (current && current.email === null && !(await findUserByEmail(email))) {
    await attachEmail(current.id, email);
    return (await getUser(current.id))!;
  }
  // E-mail belongs to an existing account: sign this device into it (the e-mail-less session ends).
  if (current) await endSession();
  const user = await findOrCreateUser(email);
  await startSession(user.id);
  return user;
}

/** "Start without e-mail": an account that lives on this device until the user adds an e-mail. */
export async function startAnonymous(): Promise<User> {
  const user = await createAnonymousUser();
  await startSession(user.id);
  return user;
}

const TRANSFER_TTL = 15 * 60_000;

/** One-time link (shown as QR) that signs another device into this account — e.g. a relative sets up grandpa's phone. */
export async function createTransferToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(24);
  const expiresAt = now() + TRANSFER_TTL;
  await exec("DELETE FROM transfer_tokens WHERE user_id = $1 OR expires_at < $2", [userId, now()]);
  await exec("INSERT INTO transfer_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expiresAt]);
  return { token, expiresAt };
}

export async function consumeTransferToken(token: string): Promise<User> {
  // DELETE … RETURNING: single use even under concurrent requests.
  const row = await one<{ user_id: string; expires_at: number }>("DELETE FROM transfer_tokens WHERE token_hash = $1 RETURNING user_id, expires_at", [sha256(token)]);
  if (!row || row.expires_at < now()) throw new AuthError("Bu link artıq etibarlı deyil. Yeni QR kod yaradın.");
  const user = await getUser(row.user_id);
  if (!user) throw new AuthError("Hesab tapılmadı");
  await endSession(); // replace whatever account this device had
  await startSession(user.id);
  return user;
}

async function startSession(userId: string): Promise<void> {
  const token = randomToken();
  const expires = now() + SESSION_DAYS * 86_400_000;
  await exec("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expires]);
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
  const row = await one<{ user_id: string; expires_at: number }>("SELECT user_id, expires_at FROM sessions WHERE token_hash = $1", [sha256(token)]);
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
  if (token) await exec("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}
