"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

export function TransferAccept({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ onboarded: boolean }>("/api/auth/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      window.location.href = r.onboarded ? "/ev" : "/qeydiyyat";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block text-[1.25rem]" onClick={accept} disabled={busy}>
        {busy ? "Açılır…" : "✓ Bu cihazda davam et"}
      </button>
    </div>
  );
}
