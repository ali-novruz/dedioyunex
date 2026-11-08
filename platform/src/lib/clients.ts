import "server-only";
import { exec, now, one, query, rawExec } from "./db";
import { env } from "./env";
import { bi, type Bi } from "./lang";

export interface Client {
  id: string;
  name: string;
  ownerUserId: string | null;
  allowedOrigins: string[];
  redirectUris: string[];
  createdAt: number;
  verified: boolean;
}

interface Row {
  id: string;
  name: string;
  owner_user_id: string | null;
  allowed_origins: string;
  redirect_uris: string;
  created_at: number;
  verified: boolean;
}

const toClient = (r: Row): Client => ({
  id: r.id,
  name: r.name,
  ownerUserId: r.owner_user_id,
  allowedOrigins: JSON.parse(r.allowed_origins),
  redirectUris: JSON.parse(r.redirect_uris),
  createdAt: r.created_at,
  verified: r.verified || env.verifiedClientIds.includes(r.id),
});

export async function seedDemoClients(): Promise<void> {
  const upsert = `INSERT INTO clients (id, name, owner_user_id, allowed_origins, redirect_uris, created_at, verified)
     VALUES ($1, $2, NULL, $3, $4, $5, TRUE)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, allowed_origins = EXCLUDED.allowed_origins, redirect_uris = EXCLUDED.redirect_uris, verified = TRUE`;
  await rawExec(upsert, ["demo-partner", "DEMO Market (veb)", JSON.stringify(env.demoPartnerOrigins), "[]", now()]);
  await rawExec(upsert, ["demo-mobile", "DEMO Market (mobil)", "[]", JSON.stringify(["cizzy-demo://callback"]), now()]);
}

export async function getClient(id: string): Promise<Client | null> {
  const r = await one<Row>("SELECT * FROM clients WHERE id = $1", [id]);
  return r ? toClient(r) : null;
}

export async function clientsOf(userId: string): Promise<Client[]> {
  return (await query<Row>("SELECT * FROM clients WHERE owner_user_id = $1 ORDER BY created_at DESC", [userId])).map(toClient);
}

export class ClientInputError extends Error {
  readonly en: string;
  constructor(message: Bi) {
    super(message.az);
    this.en = message.en;
  }
}

/** Normalises "https://Example.com/" → "https://example.com". Throws on anything that is not a bare origin. */
export function normalizeOrigin(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ClientInputError(bi(`"${raw}" düzgün ünvan deyil (nümunə: https://sayt.az)`, `"${raw}" is not a valid address (example: https://example.az)`));
  }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))) {
    throw new ClientInputError(bi(`"${raw}": yalnız https:// (və ya test üçün http://localhost) qəbul olunur`, `"${raw}": only https:// (or http://localhost for testing) is accepted`));
  }
  return u.origin;
}

export function normalizeRedirectUri(raw: string): string {
  const v = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i.test(v)) throw new ClientInputError(bi(`"${raw}" düzgün redirect URI deyil (nümunə: myapp://callback)`, `"${raw}" is not a valid redirect URI (example: myapp://callback)`));
  if (/^(https?|javascript|data|file):/i.test(v)) throw new ClientInputError(bi(`"${raw}": mobil redirect üçün tətbiqin öz sxemini istifadə edin (məs. myapp://callback)`, `"${raw}": use the app’s own scheme for a mobile redirect (for example myapp://callback)`));
  return v;
}

function slug(name: string): string {
  const map: Record<string, string> = { ə: "e", ı: "i", ö: "o", ü: "u", ş: "s", ç: "c", ğ: "g" };
  return (
    name
      .toLowerCase()
      .replace(/[əıöüşçğ]/g, (c) => map[c])
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "sayt"
  );
}

export async function createClient(ownerUserId: string, input: { name: string; origins: string[]; redirectUris: string[] }): Promise<Client> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new ClientInputError(bi("Ad 2–60 simvol olmalıdır", "The name must be 2–60 characters"));
  const origins = [...new Set(input.origins.filter((s) => s.trim()).map(normalizeOrigin))];
  const redirects = [...new Set(input.redirectUris.filter((s) => s.trim()).map(normalizeRedirectUri))];
  if (origins.length === 0 && redirects.length === 0) throw new ClientInputError(bi("Ən azı bir sayt ünvanı və ya mobil redirect URI daxil edin", "Enter at least one site address or mobile redirect URI"));
  if (origins.length > 10 || redirects.length > 10) throw new ClientInputError(bi("Ən çox 10 ünvan", "At most 10 addresses"));
  const count = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM clients WHERE owner_user_id = $1", [ownerUserId]);
  if ((count?.n ?? 0) >= 20) throw new ClientInputError(bi("Bir hesab üçün ən çox 20 sayt", "At most 20 sites per account"));
  const id = `${slug(name)}-${crypto.randomUUID().slice(0, 8)}`;
  await exec("INSERT INTO clients (id, name, owner_user_id, allowed_origins, redirect_uris, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [
    id,
    name,
    ownerUserId,
    JSON.stringify(origins),
    JSON.stringify(redirects),
    now(),
  ]);
  return (await getClient(id))!;
}

export async function deleteClient(ownerUserId: string, id: string): Promise<void> {
  const n = await exec("DELETE FROM clients WHERE id = $1 AND owner_user_id = $2", [id, ownerUserId]);
  if (n === 0) throw new ClientInputError(bi("Tapılmadı", "Not found"));
}

export function originAllowed(client: Client, origin: string): boolean {
  return client.allowedOrigins.includes(origin);
}
