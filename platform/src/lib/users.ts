import "server-only";
import crypto from "node:crypto";
import { DEFAULT_PREFERENCES, isCategory, normalizePreferences, validatePatch, type Category, type Preferences } from "@sdk/schema";
import { db, now } from "./db";

export interface User {
  id: string;
  email: string;
  categories: Category[];
  prefs: Preferences;
  onboarded: boolean;
  updatedAt: number;
}

interface Row {
  id: string;
  email: string;
  categories: string;
  prefs: string;
  onboarded: number;
  updated_at: number;
}

const toUser = (r: Row): User => ({
  id: r.id,
  email: r.email,
  categories: JSON.parse(r.categories),
  prefs: normalizePreferences(JSON.parse(r.prefs)),
  onboarded: r.onboarded === 1,
  updatedAt: r.updated_at,
});

export function getUser(id: string): User | null {
  const r = db().prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
  return r ? toUser(r) : null;
}

export function findOrCreateUser(email: string): User {
  const d = db();
  const r = d.prepare("SELECT * FROM users WHERE email = ?").get(email) as Row | undefined;
  if (r) return toUser(r);
  const id = crypto.randomUUID();
  const t = now();
  d.prepare("INSERT INTO users (id, email, categories, prefs, onboarded, created_at, updated_at) VALUES (?, ?, '[]', ?, 0, ?, ?)")
    .run(id, email, JSON.stringify(DEFAULT_PREFERENCES), t, t);
  return getUser(id)!;
}

export function updatePreferences(userId: string, patch: unknown): Preferences {
  const user = getUser(userId);
  if (!user) throw new Error("User not found");
  const next = normalizePreferences({ ...user.prefs, ...validatePatch(patch) });
  db().prepare("UPDATE users SET prefs = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(next), now(), userId);
  return next;
}

export function replacePreferences(userId: string, prefs: unknown): Preferences {
  const next = normalizePreferences(prefs);
  db().prepare("UPDATE users SET prefs = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(next), now(), userId);
  return next;
}

export function setCategories(userId: string, cats: unknown): Category[] {
  if (!Array.isArray(cats) || !cats.every(isCategory)) throw new Error("categories must be an array of known category ids");
  const unique = [...new Set(cats)] as Category[];
  db().prepare("UPDATE users SET categories = ?, onboarded = 1, updated_at = ? WHERE id = ?").run(JSON.stringify(unique), now(), userId);
  return unique;
}

export function deleteUser(userId: string): void {
  db().prepare("DELETE FROM users WHERE id = ?").run(userId);
}
