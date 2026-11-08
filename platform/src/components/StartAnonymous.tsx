"use client";

import { useState } from "react";
import { adoptLanguage, api, usePrefs } from "./PrefsProvider";

/** "Start without e-mail": creates an account bound to this device. */
export function StartAnonymous({ next = "", keyOnly = false }: { next?: string; keyOnly?: boolean }) {
  const { l, lang } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/anonymous", { method: "POST" });
      await adoptLanguage(lang);
      window.location.href = `/qeydiyyat${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <button className={`btn ${keyOnly ? "btn-primary" : "btn-secondary"} btn-block`} onClick={start} disabled={busy}>
        {busy ? l("Hazırlanır…", "Preparing…") : l("E-poçtsuz başla", "Start without e-mail")}
      </button>
      {!keyOnly && (
        <p className="text-[.95rem]">
          {l(
            "Ayarlar yalnız bu cihazda olacaq. İstəsəniz sonra e-poçt əlavə edib başqa cihazlarda da istifadə edərsiniz.",
            "Your settings will stay on this device only. You can add an e-mail later to use them on other devices.",
          )}
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
