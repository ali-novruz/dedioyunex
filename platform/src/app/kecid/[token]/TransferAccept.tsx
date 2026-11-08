"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";

export function TransferAccept({ token }: { token: string }) {
  const { l } = usePrefs();
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
        {busy ? l("Açılır…", "Opening…") : <><Icon name="check" /> {l("Bu cihazda davam et", "Continue on this device")}</>}
      </button>
    </div>
  );
}
