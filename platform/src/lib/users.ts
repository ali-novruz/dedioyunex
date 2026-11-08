import "server-only";
import crypto from "node:crypto";
import { DEFAULT_PREFERENCES, isCategory, normalizePreferences, readPreferences, validatePatch, type Category, type Preferences } from "@sdk/schema";
import { exec, now, one } from "./db";
import { decryptField, encryptField } from "./crypto";

export interface User {
  id: string;
  email: string | null; // null = account without e-mail (this device only until an e-mail is added)
  categories: Category[];
  prefs: Preferences;
  onboarded: boolean;
  updatedAt: number;
}

interface Row {
  id: string;
  email: string | null;
  categories: string;
  prefs: string;
  onboarded: boolean;
  updated_at: number;
}

const toUser = (r: Row): User => ({
  id: r.id,
  email: r.email,
  categories: (JSON.parse(decryptField(r.categories)) as unknown[]).filter(isCategory),
  prefs: readPreferences(JSON.parse(r.prefs)),
  onboarded: r.onboarded,
  updatedAt: r.updated_at,
});

export async function getUser(id: string): Promise<User | null> {
  const r = await one<Row>("SELECT * FROM users WHERE id = $1", [id]);
  return r ? toUser(r) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const r = await one<Row>("SELECT * FROM users WHERE email = $1", [email]);
  return r ? toUser(r) : null;
}

export async function findOrCreateUser(email: string): Promise<User> {
  const t = now();
  // Insert-or-ignore then read: safe when two verifications for the same e-mail race.
  await exec(
    `INSERT INTO users (id, email, categories, prefs, onboarded, created_at, updated_at) VALUES ($1, $2, '[]', $3, FALSE, $4, $4)
     ON CONFLICT (email) DO NOTHING`,
    [crypto.randomUUID(), email, JSON.stringify(DEFAULT_PREFERENCES), t],
  );
  return (await findUserByEmail(email))!;
}

export async function createAnonymousUser(): Promise<User> {
  const id = crypto.randomUUID();
  const t = now();
  await exec("INSERT INTO users (id, email, categories, prefs, onboarded, created_at, updated_at) VALUES ($1, NULL, '[]', $2, FALSE, $3, $3)", [
    id,
    JSON.stringify(DEFAULT_PREFERENCES),
    t,
  ]);
  return (await getUser(id))!;
}

/** Adds an e-mail to an account created without one. Returns false if the account already has one. */
export async function attachEmail(userId: string, email: string): Promise<boolean> {
  return (await exec("UPDATE users SET email = $1, updated_at = $2 WHERE id = $3 AND email IS NULL", [email, now(), userId])) === 1;
}

export async function updatePreferences(userId: string, patch: unknown): Promise<Preferences> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");
  const next = normalizePreferences({ ...user.prefs, ...validatePatch(patch) });
  await exec("UPDATE users SET prefs = $1, updated_at = $2 WHERE id = $3", [JSON.stringify(next), now(), userId]);
  return next;
}

export async function replacePreferences(userId: string, prefs: unknown): Promise<Preferences> {
  const next = normalizePreferences(prefs);
  await exec("UPDATE users SET prefs = $1, updated_at = $2 WHERE id = $3", [JSON.stringify(next), now(), userId]);
  return next;
}

export async function setCategories(userId: string, cats: unknown): Promise<Category[]> {
  if (!Array.isArray(cats) || !cats.every(isCategory)) throw new CategoryError("categories must be an array of known category ids");
  const unique = [...new Set(cats)] as Category[];
  await exec("UPDATE users SET categories = $1, onboarded = TRUE, updated_at = $2 WHERE id = $3", [encryptField(JSON.stringify(unique)), now(), userId]);
  return unique;
}

export class CategoryError extends Error {}

export async function deleteUser(userId: string): Promise<void> {
  await exec("DELETE FROM users WHERE id = $1", [userId]);
}
