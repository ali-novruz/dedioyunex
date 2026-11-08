"use client";

import { useState } from "react";
import { usePrefs } from "./PrefsProvider";
import { Icon } from "./Icons";
import { stopSpeaking } from "@sdk/tts";
import type { Lang } from "@/lib/lang";

const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: "az", short: "AZ", name: "Azərbaycan dili" },
  { id: "en", short: "EN", name: "English" },
];

/** Language keys, "Read this page" (when text-to-speech is on) and logout. */
export function HeaderActions({ signedIn }: { signedIn: boolean }) {
  const { shown, say, l, lang, setLanguage } = usePrefs();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readPage() {
    setError(null);
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    const main = document.querySelector("main");
    if (!main) return;
    setReading(true);
    try {
      await say(main.innerText);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTimeout(() => setReading(false), 500);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="topbar-actions">
      {shown.tts && (
        <button className="btn btn-secondary btn-small" onClick={readPage} aria-pressed={reading}>
          <Icon name={reading ? "stop" : "speaker"} />
          {reading ? l("Dayandır", "Stop") : l("Səhifəni oxu", "Read this page")}
        </button>
      )}
      <div className="langs" role="group" aria-label={l("Dil", "Language")}>
        {LANGS.map((x) => (
          <button key={x.id} type="button" lang={x.id} aria-pressed={lang === x.id} aria-label={x.name} onClick={() => lang !== x.id && void setLanguage(x.id)}>
            {x.short}
          </button>
        ))}
      </div>
      {signedIn && (
        <button className="btn btn-secondary btn-small" onClick={logout}>
          {l("Çıxış", "Sign out")}
        </button>
      )}
      {error && <span className="error">{l("Səsli oxunuş mümkün olmadı", "Could not read the page aloud")}</span>}
    </div>
  );
}
