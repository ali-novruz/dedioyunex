"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";

export function AccountActions() {
  const { l } = usePrefs();
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
        <Icon name="download" /> {l("Məlumatlarımı yüklə (JSON)", "Download my data (JSON)")}
      </a>
      {!confirming ? (
        <button className="btn btn-danger btn-block" onClick={() => setConfirming(true)}>{l("Hesabımı sil", "Delete my account")}</button>
      ) : (
        <div className="error stack">
          <p>{l("Hesabınız, bütün ayarlarınız və qoşulmuş xidmətlər birdəfəlik silinəcək. Bunu geri qaytarmaq olmaz.", "Your account, all your settings and connected services will be deleted for good. This cannot be undone.")}</p>
          <button className="btn btn-danger btn-block" onClick={del}>{l("Bəli, birdəfəlik sil", "Yes, delete for good")}</button>
          <button className="btn btn-secondary btn-block !border-[var(--ink)] !text-[var(--ink)]" onClick={() => setConfirming(false)}>{l("Xeyr, saxla", "No, keep it")}</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
