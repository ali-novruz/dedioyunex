import "server-only";
import { NextResponse } from "next/server";
import { PreferenceError } from "@sdk/schema";
import { AuthError } from "./session";
import { AiError } from "./ai";
import { ClientInputError } from "./clients";

/** Runs an API handler and maps known errors to JSON responses: { error: "<message>" }. */
export async function handle(fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    const out = await fn();
    return out instanceof Response ? out : NextResponse.json(out ?? {});
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof PreferenceError || e instanceof ClientInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof AiError) {
      console.error("[ai]", e.message);
      return NextResponse.json({ error: e.status === 503 ? "Səsli köməkçi hələ qurulmayıb (AI açarı yoxdur)." : "Köməkçi cavab verə bilmədi. Yenidən cəhd edin.", detail: e.message }, { status: e.status });
    }
    console.error("[api] unexpected error", e);
    return NextResponse.json({ error: "Gözlənilməz xəta baş verdi" }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new Error();
    return b as Record<string, unknown>;
  } catch {
    throw new AuthError("Request body must be a JSON object");
  }
}
