"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Window } from "@/components/Window";
import { LOCALE } from "@/lib/lang";

/** Helper mode: a relative sets up the profile, then the elderly user scans this QR with their own phone. */
export function TransferQr() {
  const { l, lang } = usePrefs();
  const [qr, setQr] = useState<{ url: string; svg: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    try {
      setQr(await api("/api/me/transfer", { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Window title={l("Başqa cihaza ötür", "Send to another device")}>
      <div className="stack">
        <p>{l("Yaxınınız üçün profili siz qurmusunuz? QR kodu onun telefonunun kamerası ilə oxutsun, ayarlar onun telefonunda açılacaq.", "Did you set up this profile for someone close to you? Let them scan the QR code with their phone camera and the settings will open on their phone.")}</p>
        {qr ? (
          <>
            <div className="mx-auto w-full max-w-[280px] border-2 border-[var(--ink)] bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} aria-label={l("QR kod", "QR code")} role="img" />
            <p className="muted text-center text-[.95rem]">
              {l("Bir dəfəlik. Etibarlıdır:", "Single use. Valid until:")} {new Date(qr.expiresAt).toLocaleTimeString(LOCALE[lang], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="break-all text-center text-[.8rem]">{qr.url}</p>
            <button className="btn btn-secondary btn-block" onClick={create}>{l("Yeni QR kod", "New QR code")}</button>
          </>
        ) : (
          <button className="btn btn-primary btn-block" onClick={create}>{l("QR kod yarat", "Create a QR code")}</button>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </Window>
  );
}
