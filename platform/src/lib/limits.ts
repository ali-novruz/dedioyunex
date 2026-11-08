import "server-only";
import { db } from "./db";
import { env } from "./env";
import { AuthError } from "./session";

const perMinute = new Map<string, number[]>();
const MINUTE_LIMIT = 8;

/** Per-user AI limits: a short burst limit (memory) and a daily limit (database). Throws 429 when exceeded. */
export function takeAiQuota(userId: string): void {
  const nowMs = Date.now();
  const recent = (perMinute.get(userId) ?? []).filter((t) => nowMs - t < 60_000);
  if (recent.length >= MINUTE_LIMIT) throw new AuthError("Çox tez-tez sorğu. Bir dəqiqə gözləyin.", 429);
  const day = new Date(nowMs).toISOString().slice(0, 10);
  const d = db();
  const row = d.prepare("SELECT count FROM ai_usage WHERE user_id = ? AND day = ?").get(userId, day) as { count: number } | undefined;
  if ((row?.count ?? 0) >= env.aiDailyLimit) throw new AuthError("Bu günlük köməkçi limiti bitdi. Ayarları əl ilə edə bilərsiniz.", 429);
  d.prepare("INSERT INTO ai_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1").run(userId, day);
  recent.push(nowMs);
  perMinute.set(userId, recent);
}
