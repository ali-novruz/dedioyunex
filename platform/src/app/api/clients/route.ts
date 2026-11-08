import { handle, jsonBody } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { createClient } from "@/lib/clients";

const lines = (v: unknown) => (typeof v === "string" ? v.split(/[\n,]+/) : Array.isArray(v) ? v.map(String) : []);

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const body = await jsonBody(req);
    const client = await createClient(user.id, { name: String(body.name ?? ""), origins: lines(body.origins), redirectUris: lines(body.redirectUris) });
    return { client };
  });
}
