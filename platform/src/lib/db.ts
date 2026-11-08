import { attachDatabasePool } from "@vercel/functions";
import "server-only";
import { Pool, types, type PoolClient } from "pg";
import { env } from "./env";
import { seedDemoClients } from "./clients";

// BIGINT (epoch milliseconds) as JS numbers instead of strings.
types.setTypeParser(20, (v) => Number(v));

/** All tables live in their own schema so the app can share a Supabase project safely (not exposed via PostgREST). */
const SCHEMA = "dedio";

/** Ordered migrations. Applied once each, tracked in dedio.schema_migrations. */
const MIGRATIONS: string[] = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE,
     categories TEXT NOT NULL DEFAULT '[]',
     prefs TEXT NOT NULL,
     onboarded BOOLEAN NOT NULL DEFAULT FALSE,
     created_at BIGINT NOT NULL,
     updated_at BIGINT NOT NULL
   );
   CREATE TABLE login_codes (
     email TEXT PRIMARY KEY,
     code_hash TEXT NOT NULL,
     expires_at BIGINT NOT NULL,
     attempts INT NOT NULL DEFAULT 0,
     sent_at BIGINT NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at BIGINT NOT NULL
   );
   CREATE TABLE clients (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
     allowed_origins TEXT NOT NULL DEFAULT '[]',
     redirect_uris TEXT NOT NULL DEFAULT '[]',
     created_at BIGINT NOT NULL,
     verified BOOLEAN NOT NULL DEFAULT FALSE
   );
   CREATE TABLE auth_codes (
     code_hash TEXT PRIMARY KEY,
     client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     redirect_uri TEXT NOT NULL,
     code_challenge TEXT NOT NULL,
     expires_at BIGINT NOT NULL,
     used BOOLEAN NOT NULL DEFAULT FALSE
   );
   CREATE TABLE tokens (
     token_hash TEXT PRIMARY KEY,
     client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at BIGINT NOT NULL,
     last_used_at BIGINT,
     revoked_at BIGINT
   );
   CREATE INDEX tokens_user ON tokens(user_id);
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE transfer_tokens (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at BIGINT NOT NULL
   );
   CREATE TABLE ai_usage (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     day TEXT NOT NULL,
     count INT NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day)
   );`,
  `CREATE TABLE ai_cache (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     created_at BIGINT NOT NULL
   );`,
  `ALTER TABLE users ADD COLUMN safe_until BIGINT, ADD COLUMN trusted_contact TEXT;`,
];

const g = globalThis as unknown as { __muPool?: Pool; __muReady?: Promise<void> };

function pool(): Pool {
  if (!g.__muPool) {
    const p = new Pool({
      connectionString: env.databaseUrl,
      // Supabase requires TLS. DATABASE_SSL=require encrypts without pinning the CA (set DATABASE_SSL=disable for a local Postgres).
      ssl: env.databaseSsl === "require" ? { rejectUnauthorized: false } : undefined,
      max: env.databasePoolMax,
      idleTimeoutMillis: 5_000,
    });
    // Closes idle connections before Vercel suspends the function. Without it, frozen instances keep them open and exhaust Supabase's pool.
    attachDatabasePool(p);
    p.on("connect", (c) => {
      c.query(`SET search_path TO ${SCHEMA}`).catch((e) => console.error("[db] search_path failed", e));
    });
    p.on("error", (e) => console.error("[db] idle client error", e));
    g.__muPool = p;
  }
  return g.__muPool;
}

async function migrate(): Promise<void> {
  const c = await pool().connect();
  try {
    await c.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await c.query(`SET search_path TO ${SCHEMA}`);
    await c.query("SELECT pg_advisory_lock(424242)"); // one migrator at a time (several containers / workers)
    try {
      await c.query("CREATE TABLE IF NOT EXISTS schema_migrations (version INT PRIMARY KEY, applied_at BIGINT NOT NULL)");
      const done = new Set((await c.query<{ version: number }>("SELECT version FROM schema_migrations")).rows.map((r) => r.version));
      for (let i = 0; i < MIGRATIONS.length; i++) {
        const version = i + 1;
        if (done.has(version)) continue;
        await c.query("BEGIN");
        try {
          await c.query(MIGRATIONS[i]);
          await c.query("INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)", [version, Date.now()]);
          await c.query("COMMIT");
        } catch (e) {
          await c.query("ROLLBACK");
          throw new Error(`Database migration ${version} failed: ${(e as Error).message}`);
        }
      }
    } finally {
      await c.query("SELECT pg_advisory_unlock(424242)");
    }
  } finally {
    c.release();
  }
  await seedDemoClients();
}

/** One query on cold start. The full migration takes several round trips and is needed only after a schema or origin change. */
async function isCurrent(): Promise<boolean> {
  try {
    const { rows } = await pool().query<{ n: number; o: string | null }>(
      `SELECT (SELECT count(*)::int FROM ${SCHEMA}.schema_migrations) n, (SELECT allowed_origins::text FROM ${SCHEMA}.clients WHERE id = 'demo-partner') o`,
    );
    return rows[0].n >= MIGRATIONS.length && rows[0].o === JSON.stringify(env.demoPartnerOrigins);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "42P01" || code === "3F000") return false; // first run: the schema or table does not exist yet
    throw e;
  }
}

function ready(): Promise<void> {
  g.__muReady ??= isCurrent().then((current) => (current ? undefined : migrate())).catch((e) => {
    g.__muReady = undefined; // retry on the next request instead of caching the failure forever
    throw e;
  });
  return g.__muReady;
}

export type Row = Record<string, unknown>;

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  return (await pool().query(sql, params)).rows as T[];
}

export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await query<T>(sql, params))[0];
}

/** Returns the number of affected rows. */
export async function exec(sql: string, params: unknown[] = []): Promise<number> {
  await ready();
  return (await pool().query(sql, params)).rowCount ?? 0;
}

/** Runs fn inside a transaction on one connection. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

/** Seeding runs inside migrate(), before ready() resolves: it must not call query()/exec(). */
export async function rawExec(sql: string, params: unknown[] = []): Promise<void> {
  await pool().query(sql, params);
}

export function now(): number {
  return Date.now();
}
