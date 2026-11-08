import "server-only";
import { NextResponse } from "next/server";
import { PreferenceError } from "@sdk/schema";
import { AuthError } from "./session";
import { AiError } from "./ai";
import { ClientInputError } from "./clients";
import { CategoryError } from "./users";
import { requestLang } from "./lang-server";
import { bi, tr } from "./lang";

/** Runs an API handler and maps known errors to JSON responses: { error: "<message>" }. */
export async function handle(fn: () => Promise<Response | unknown>): Promise<Response> {
  try {
    const out = await fn();
    return out instanceof Response ? out : NextResponse.json(out ?? {});
  } catch (e) {
    const lang = await requestLang();
    const l = tr(lang);
    if (e instanceof AuthError) return NextResponse.json({ error: l(e.message, e.en) }, { status: e.status });
    if (e instanceof ClientInputError) return NextResponse.json({ error: l(e.message, e.en) }, { status: 400 });
    if (e instanceof PreferenceError || e instanceof CategoryError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof AiError) {
      console.error("[ai]", e.message);
      return NextResponse.json({ error: e.status === 503 ? l("Səsli köməkçi hələ qurulmayıb (AI açarı yoxdur).", "The voice assistant is not set up yet (no AI key).") : l("Köməkçi cavab verə bilmədi. Yenidən cəhd edin.", "The assistant could not answer. Please try again.") }, { status: e.status });
    }
    console.error("[api] unexpected error", e);
    return NextResponse.json({ error: l("Gözlənilməz xəta baş verdi", "Something unexpected went wrong") }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new AuthError(bi("Sorğu JSON formatında olmalıdır", "Content-Type must be application/json"), 415);
  try {
    const b = await req.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new Error();
    return b as Record<string, unknown>;
  } catch {
    throw new AuthError(bi("Sorğu JSON obyekti olmalıdır", "Request body must be a JSON object"));
  }
}
