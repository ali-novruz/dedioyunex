import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { db, now } from "./db";
import { env } from "./env";

export interface Client {
  id: string;
  name: string;
  ownerUserId: string | null;
  allowedOrigins: string[];
  redirectUris: string[];
  createdAt: number;
}

interface Row {
  id: string;
  name: string;
  owner_user_id: string | null;
  allowed_origins: string;
  redirect_uris: string;
  created_at: number;
}

const toClient = (r: Row): Client => ({
  id: r.id,
  name: r.name,
  ownerUserId: r.owner_user_id,
  allowedOrigins: JSON.parse(r.allowed_origins),
  redirectUris: JSON.parse(r.redirect_uris),
  createdAt: r.created_at,
});

export function seedDemoClients(d: DatabaseSync): void {
  const upsert = d.prepare(
    `INSERT INTO clients (id, name, owner_user_id, allowed_origins, redirect_uris, created_at)
     VALUES (?, ?, NULL, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, allowed_origins = excluded.allowed_origins, redirect_uris = excluded.redirect_uris`,
  );
  upsert.run("demo-partner", "DEMO Market (veb)", JSON.stringify(env.demoPartnerOrigins), "[]", now());
  upsert.run("demo-mobile", "DEMO Market (mobil)", "[]", JSON.stringify(["meneuygun-demo://callback"]), now());
}

export function getClient(id: string): Client | null {
  const r = db().prepare("SELECT * FROM clients WHERE id = ?").get(id) as Row | undefined;
  return r ? toClient(r) : null;
}

export function clientsOf(userId: string): Client[] {
  return (db().prepare("SELECT * FROM clients WHERE owner_user_id = ? ORDER BY created_at DESC").all(userId) as unknown as Row[]).map(toClient);
}

export class ClientInputError extends Error {}

/** Normalises "https://Example.com/" → "https://example.com". Throws on anything that is not a bare origin. */
export function normalizeOrigin(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ClientInputError(`"${raw}" düzgün ünvan deyil (nümunə: https://sayt.az)`);
  }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))) {
    throw new ClientInputError(`"${raw}": yalnız https:// (və ya test üçün http://localhost) qəbul olunur`);
  }
  return u.origin;
}

export function normalizeRedirectUri(raw: string): string {
  const v = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i.test(v)) throw new ClientInputError(`"${raw}" düzgün redirect URI deyil (nümunə: myapp://callback)`);
  if (/^http:/i.test(v)) throw new ClientInputError(`"${raw}": redirect URI http ola bilməz`);
  return v;
}

function slug(name: string): string {
  const map: Record<string, string> = { ə: "e", ı: "i", ö: "o", ü: "u", ş: "s", ç: "c", ğ: "g" };
  return name
    .toLowerCase()
    .replace(/[əıöüşçğ]/g, (c) => map[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "sayt";
}

export function createClient(ownerUserId: string, input: { name: string; origins: string[]; redirectUris: string[] }): Client {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new ClientInputError("Ad 2–60 simvol olmalıdır");
  const origins = [...new Set(input.origins.filter((s) => s.trim()).map(normalizeOrigin))];
  const redirects = [...new Set(input.redirectUris.filter((s) => s.trim()).map(normalizeRedirectUri))];
  if (origins.length === 0 && redirects.length === 0) throw new ClientInputError("Ən azı bir sayt ünvanı və ya mobil redirect URI daxil edin");
  const id = `${slug(name)}-${Math.random().toString(36).slice(2, 8)}`;
  db().prepare("INSERT INTO clients (id, name, owner_user_id, allowed_origins, redirect_uris, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, name, ownerUserId, JSON.stringify(origins), JSON.stringify(redirects), now());
  return getClient(id)!;
}

export function deleteClient(ownerUserId: string, id: string): void {
  const r = db().prepare("DELETE FROM clients WHERE id = ? AND owner_user_id = ?").run(id, ownerUserId);
  if (r.changes === 0) throw new ClientInputError("Tapılmadı");
}

export function originAllowed(client: Client, origin: string): boolean {
  return client.allowedOrigins.includes(origin);
}
