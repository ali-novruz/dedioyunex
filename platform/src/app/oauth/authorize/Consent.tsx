"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

type Decision =
  | { action: "postMessage"; origin: string; message: Record<string, unknown>; fallbackUrl: string | null }
  | { action: "redirect"; url: string };

export function Consent({ params }: { params: Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(decision: "allow" | "deny") {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Decision>("/api/oauth/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params, decision }),
      });
      if (r.action === "redirect") {
        window.location.href = r.url;
        setDone(decision === "allow" ? "Hazırdır. Tətbiqə qayıdılır…" : "İmtina edildi.");
        return;
      }
      if (!window.opener) {
        if (!r.fallbackUrl) throw new Error("Sayt pəncərəsi tapılmadı. Bu pəncərəni bağlayıb saytda düyməyə yenidən basın.");
        setDone(decision === "allow" ? "Hazırdır. Sayta qayıdılır…" : "İmtina edildi. Sayta qayıdılır…");
        window.location.href = r.fallbackUrl;
        return;
      }
      window.opener.postMessage(r.message, r.origin);
      setDone(decision === "allow" ? "✓ Hazırdır! Sayta qayıdın." : "İmtina edildi.");
      setTimeout(() => window.close(), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (done) return <p className="ok" role="status">{done}</p>;

  return (
    <div className="stack">
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block text-[1.25rem]" disabled={busy} onClick={() => decide("allow")}>
        ✓ İcazə ver
      </button>
      <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => decide("deny")}>
        İmtina et
      </button>
    </div>
  );
}
