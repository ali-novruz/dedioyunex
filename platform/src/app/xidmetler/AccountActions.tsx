"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    try {
      await api("/api/me", { method: "DELETE" });
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      <a className="btn btn-secondary btn-block" href="/api/me/export" download>
        ⬇️ Məlumatlarımı yüklə (JSON)
      </a>
      {!confirming ? (
        <button className="btn btn-danger btn-block" onClick={() => setConfirming(true)}>Hesabımı sil</button>
      ) : (
        <div className="card stack !border-[var(--danger)]" style={{ borderWidth: 3 }}>
          <p className="font-bold">Hesabınız, bütün ayarlarınız və qoşulmuş xidmətlər birdəfəlik silinəcək. Bunu geri qaytarmaq olmaz.</p>
          <button className="btn btn-danger btn-block" onClick={del}>Bəli, birdəfəlik sil</button>
          <button className="btn btn-secondary btn-block" onClick={() => setConfirming(false)}>Xeyr, saxla</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
