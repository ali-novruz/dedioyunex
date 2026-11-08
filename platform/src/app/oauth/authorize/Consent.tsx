"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";

type Decision =
  | { action: "postMessage"; origin: string; message: Record<string, unknown>; fallbackUrl: string | null }
  | { action: "redirect"; url: string };

export function Consent({ params }: { params: Record<string, string> }) {
  const { l } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(decision: "allow" | "deny") {
    setBusy(true);
    setError(null);
    const denied = l("İmtina edildi.", "Refused.");
    try {
      const r = await api<Decision>("/api/oauth/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params, decision }),
      });
      if (r.action === "redirect") {
        window.location.href = r.url;
        setDone(decision === "allow" ? l("Hazırdır. Tətbiqə qayıdılır…", "Done. Returning to the app…") : denied);
        return;
      }
      if (!window.opener) {
        if (!r.fallbackUrl) throw new Error(l("Sayt pəncərəsi tapılmadı. Bu pəncərəni bağlayıb saytda düyməyə yenidən basın.", "The site’s window was not found. Close this window and press the button on the site again."));
        setDone(decision === "allow" ? l("Hazırdır. Sayta qayıdılır…", "Done. Returning to the site…") : l("İmtina edildi. Sayta qayıdılır…", "Refused. Returning to the site…"));
        window.location.href = r.fallbackUrl;
        return;
      }
      window.opener.postMessage(r.message, r.origin);
      setDone(decision === "allow" ? l("Hazırdır! Sayta qayıdın.", "Done! Go back to the site.") : denied);
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
        <Icon name="check" /> {l("İcazə ver", "Allow")}
      </button>
      <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => decide("deny")}>
        {l("İmtina et", "Refuse")}
      </button>
    </div>
  );
}
