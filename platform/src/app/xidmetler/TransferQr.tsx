"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

/** Helper mode: a relative sets up the profile, then the elderly user scans this QR with their own phone. */
export function TransferQr() {
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
    <div className="card stack">
      <p className="text-[1.15rem] font-extrabold">📱 Başqa cihaza ötür</p>
      <p className="muted">Yaxınınız üçün profili siz qurmusunuz? QR kodu onun telefonunun kamerası ilə oxutsun — ayarlar onun telefonunda açılacaq.</p>
      {qr ? (
        <>
          <div className="mx-auto w-full max-w-[280px] rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr.svg }} aria-label="QR kod" role="img" />
          <p className="muted text-center text-[.9rem]">
            Bir dəfəlik, {new Date(qr.expiresAt).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}-dək etibarlıdır.
          </p>
          <p className="break-all text-center text-[.8rem]">{qr.url}</p>
          <button className="btn btn-secondary btn-block" onClick={create}>Yeni QR kod</button>
        </>
      ) : (
        <button className="btn btn-primary btn-block" onClick={create}>QR kod yarat</button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
