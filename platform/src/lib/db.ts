import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";
import { seedDemoClients } from "./clients";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  categories TEXT NOT NULL DEFAULT '[]',
  prefs TEXT NOT NULL,
  onboarded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  allowed_origins TEXT NOT NULL DEFAULT '[]',
  redirect_uris TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tokens (
  token_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id);
`;

/** Ordered migrations; index + 2 = resulting PRAGMA user_version (version 1 is SCHEMA above). */
const MIGRATIONS: string[] = [
  // v2: accounts without e-mail, verified partners, profile transfer links, AI usage limits
  `CREATE TABLE users_v2 (
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE,
     categories TEXT NOT NULL DEFAULT '[]',
     prefs TEXT NOT NULL,
     onboarded INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   INSERT INTO users_v2 SELECT id, email, categories, prefs, onboarded, created_at, updated_at FROM users;
   DROP TABLE users;
   ALTER TABLE users_v2 RENAME TO users;
   ALTER TABLE clients ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
   CREATE TABLE transfer_tokens (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL
   );
   CREATE TABLE ai_usage (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     day TEXT NOT NULL,
     count INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (user_id, day)
   );`,
];

function migrate(d: DatabaseSync): void {
  const row = d.prepare("PRAGMA user_version").get() as { user_version: number };
  let version = row.user_version || 1;
  // foreign keys must be off while tables are rebuilt, otherwise DROP TABLE cascades
  d.exec("PRAGMA foreign_keys = OFF;");
  try {
    while (version - 1 < MIGRATIONS.length) {
      d.exec("BEGIN");
      try {
        d.exec(MIGRATIONS[version - 1]);
        d.exec(`PRAGMA user_version = ${version + 1}`);
        d.exec("COMMIT");
      } catch (e) {
        d.exec("ROLLBACK");
        throw new Error(`Database migration to v${version + 1} failed: ${(e as Error).message}`);
      }
      version++;
    }
  } finally {
    d.exec("PRAGMA foreign_keys = ON;");
  }
}

const g = globalThis as unknown as { __muDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__muDb) {
    const dir = path.resolve(env.dataDir);
    fs.mkdirSync(dir, { recursive: true });
    const d = new DatabaseSync(path.join(dir, "mene-uygun.db"));
    d.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    d.exec(SCHEMA);
    migrate(d);
    d.exec("PRAGMA foreign_keys = ON;");
    g.__muDb = d;
    seedDemoClients(d);
  }
  return g.__muDb;
}

export function now(): number {
  return Date.now();
}
