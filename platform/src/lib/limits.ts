import "server-only";
import { one } from "./db";
import { env } from "./env";
import { AuthError } from "./session";
import type { Bi } from "./lang";
import { bi } from "./lang";

const perMinute = new Map<string, number[]>();
const windows = new Map<string, number[]>();

/** Client IP as seen behind Traefik / Vercel (first X-Forwarded-For hop). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Generic sliding-window limit (in memory, per instance). Throws 429 when exceeded. */
export function takeIpQuota(bucket: string, ip: string, limit: number, windowMs: number, message: Bi): void {
  const key = `${bucket}:${ip}`;
  const t = Date.now();
  const hits = (windows.get(key) ?? []).filter((x) => t - x < windowMs);
  if (hits.length >= limit) throw new AuthError(message, 429);
  hits.push(t);
  windows.set(key, hits);
  if (windows.size > 50_000) windows.clear();
}
const MINUTE_LIMIT = 8;
const LIGHT_MINUTE_LIMIT = 30;

/** Per-user AI limits: a short burst limit (memory) and a daily limit (database). Throws 429 when exceeded. */
export async function takeAiQuota(userId: string, opts: { light?: boolean } = {}): Promise<void> {
  const nowMs = Date.now();
  const bucket = opts.light ? `${userId}:light` : userId;
  const recent = (perMinute.get(bucket) ?? []).filter((t) => nowMs - t < 60_000);
  if (recent.length >= (opts.light ? LIGHT_MINUTE_LIMIT : MINUTE_LIMIT)) throw new AuthError(bi("Çox tez-tez sorğu. Bir dəqiqə gözləyin.", "Too many requests. Please wait a minute."), 429);
  recent.push(nowMs);
  perMinute.set(bucket, recent);
  if (opts.light) return; // one-sentence answers do not count against the daily limit
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const row = await one<{ count: number }>(
    `INSERT INTO ai_usage (user_id, day, count) VALUES ($1, $2, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1 RETURNING count`,
    [userId, day],
  );
  if ((row?.count ?? 0) > env.aiDailyLimit) throw new AuthError(bi("Bu günlük köməkçi limiti bitdi. Ayarları əl ilə edə bilərsiniz.", "Today’s assistant limit is used up. You can change the settings by hand."), 429);
  if (perMinute.size > 10_000) perMinute.clear(); // bound memory
}
