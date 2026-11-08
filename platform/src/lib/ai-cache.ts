import "server-only";
import crypto from "node:crypto";
import { exec, now, one } from "./db";

const TTL = 7 * 24 * 60 * 60_000;

export const cacheKey = (input: unknown) => crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");

/** AI answers keyed by the exact input, shared by all users and server instances. Identical pages cost no AI call. */
export async function readCache<T>(key: string): Promise<T | null> {
  const row = await one<{ value: string }>("SELECT value FROM ai_cache WHERE key = $1 AND created_at > $2", [key, now() - TTL]);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  const t = now();
  await exec("INSERT INTO ai_cache (key, value, created_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = $2, created_at = $3", [key, JSON.stringify(value), t]);
  await exec("DELETE FROM ai_cache WHERE created_at < $1", [t - TTL]);
}
