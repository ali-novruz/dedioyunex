"use client";

import { useState } from "react";
import { api } from "./PrefsProvider";

/** "Start without e-mail": creates an account bound to this device. */
export function StartAnonymous({ next = "" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/anonymous", { method: "POST" });
      window.location.href = `/qeydiyyat${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <button className="btn btn-secondary btn-block" onClick={start} disabled={busy}>
        {busy ? "Hazırlanır…" : "E-poçtsuz başla"}
      </button>
      <p className="muted text-[.9rem]">Ayarlar yalnız bu cihazda olacaq. İstəsəniz sonra e-poçt əlavə edib başqa cihazlarda da istifadə edərsiniz.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
