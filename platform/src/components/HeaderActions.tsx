"use client";

import { useState } from "react";
import { usePrefs } from "./PrefsProvider";
import { stopSpeaking } from "@sdk/tts";

/** "Read this page" button (shown when the user has text-to-speech on) and logout. */
export function HeaderActions({ signedIn }: { signedIn: boolean }) {
  const { shown, say } = usePrefs();
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
    <div className="flex flex-wrap items-center gap-2">
      {shown.tts && (
        <button className="btn btn-secondary" onClick={readPage} aria-pressed={reading}>
          {reading ? "⏹ Dayandır" : "🔊 Səhifəni oxu"}
        </button>
      )}
      {signedIn && (
        <button className="btn btn-secondary" onClick={logout}>
          Çıxış
        </button>
      )}
      {error && <span className="error">Səsli oxunuş mümkün olmadı</span>}
    </div>
  );
}
