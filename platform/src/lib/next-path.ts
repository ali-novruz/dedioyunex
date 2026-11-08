/** Accepts only same-site relative paths like "/ev?x=1"; rejects "//evil", "/\\evil", schemes and control characters. */
export function safeNext(next: string | undefined | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\s\u0000-\u001f]/.test(next)) return "";
  try {
    const u = new URL(next, "http://internal.invalid");
    if (u.origin !== "http://internal.invalid") return "";
    return u.pathname + u.search + u.hash;
  } catch {
    return "";
  }
}
