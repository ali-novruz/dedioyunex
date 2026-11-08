import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sha256Base64Url(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

/** Per-client pseudonymous user id: services cannot correlate the same user across clients. */
export function pairwiseSub(userId: string, clientId: string): string {
  return crypto.createHmac("sha256", env.secret).update(`${clientId}:${userId}`).digest("base64url").slice(0, 32);
}

export function sixDigitCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

let fieldKey: Buffer | null = null;
function key(): Buffer {
  fieldKey ??= Buffer.from(crypto.hkdfSync("sha256", env.secret, "mene-uygun", "field-encryption-v1", 32));
  return fieldKey;
}

/** AES-256-GCM for sensitive columns (need categories). Format: enc:v1:<iv>.<tag>.<ciphertext> (base64url). */
export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc:v1:${iv.toString("base64url")}.${c.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

export function decryptField(value: string): string {
  if (!value.startsWith("enc:v1:")) return value; // rows written before encryption was introduced
  const [iv, tag, data] = value.slice(7).split(".").map((s) => Buffer.from(s, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
