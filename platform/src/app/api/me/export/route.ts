import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { requireApiUser } from "@/lib/session";
import { connectionsOf } from "@/lib/oauth";

export function GET() {
  return handle(async () => {
    const u = await requireApiUser();
    const data = {
      exportedAt: new Date().toISOString(),
      email: u.email,
      categories: u.categories,
      preferences: u.prefs,
      connections: connectionsOf(u.id).map((c) => ({ service: c.name, connectedAt: new Date(c.connectedAt).toISOString() })),
    };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="mene-uygun-profil.json"' },
    });
  });
}
