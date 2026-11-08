"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PreferenceEngine } from "@sdk/apply";
import { DEFAULT_PREFERENCES, type Preferences } from "@sdk/schema";
import { setCloudVoice, speak, stopSpeaking } from "@sdk/tts";
import { LANG_COOKIE, tr, type Lang } from "@/lib/lang";

interface Ctx {
  /** Saved preferences of the signed-in user (defaults when signed out). */
  saved: Preferences;
  /** What is applied on screen right now (preview or saved). */
  shown: Preferences;
  setSaved: (p: Preferences) => void;
  setPreview: (p: Preferences | null) => void;
  /** Patch + persist. Throws with the server's message on failure. */
  save: (patch: Partial<Preferences>) => Promise<Preferences>;
  say: (text: string) => Promise<void>;
  lang: Lang;
  /** Translation pair for the current language. */
  l: (az: string, en: string) => string;
  setLanguage: (next: Lang) => Promise<void>;
}

const PrefsContext = createContext<Ctx | null>(null);

export function usePrefs(): Ctx {
  const c = useContext(PrefsContext);
  if (!c) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return c;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `Error (${r.status})`);
  return body as T;
}

function writeLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/** A new account starts in the language the visitor was already using. */
export async function adoptLanguage(lang: Lang): Promise<void> {
  if (lang === "az") return;
  await api("/api/me/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: lang }),
  });
}

export function PrefsProvider({ initial, lang, children }: { initial: Preferences | null; lang: Lang; children: React.ReactNode }) {
  const [saved, setSaved] = useState<Preferences>(initial ?? DEFAULT_PREFERENCES);
  const [preview, setPreview] = useState<Preferences | null>(null);
  const engine = useRef<PreferenceEngine | null>(null);
  const shown = preview ?? saved;
  const signedIn = initial !== null;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const saveTurn = useRef(0);

  useEffect(() => {
    engine.current ??= new PreferenceEngine(document, { mode: "auto", assetBase: "" });
    engine.current.apply(shown);
  }, [shown]);

  useEffect(() => () => engine.current?.reset(), []);

  useEffect(() => {
    setCloudVoice({
      check: async () => ((await (await fetch("/v1/tts")).json()) as { available: boolean }).available,
      speak: async (text, rate) => {
        const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, rate }) });
        if (!r.ok) throw new Error(`Speech request failed (${r.status})`);
        return r.blob();
      },
    });
  }, []);

  // Server error messages read this cookie, so it must follow the account's language.
  useEffect(() => writeLangCookie(lang), [lang]);

  // The screen changes on press; the server catches up. A failed save puts the old value back and reports the error.
  const save = useCallback(async (patch: Partial<Preferences>) => {
    const before = savedRef.current;
    const turn = ++saveTurn.current;
    setSaved({ ...before, ...patch });
    try {
      const { preferences } = await api<{ preferences: Preferences }>("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (turn === saveTurn.current) setSaved(preferences);
      return preferences;
    } catch (e) {
      if (turn === saveTurn.current) setSaved(before);
      throw e;
    }
  }, []);

  const setLanguage = useCallback(
    async (next: Lang) => {
      writeLangCookie(next);
      if (signedIn) await save({ language: next });
      window.location.reload();
    },
    [save, signedIn],
  );

  const say = useCallback(
    async (text: string) => {
      stopSpeaking();
      await speak(text, { language: lang, rate: shown.ttsRate });
    },
    [lang, shown.ttsRate],
  );

  const value = useMemo(() => ({ saved, shown, setSaved, setPreview, save, say, lang, l: tr(lang), setLanguage }), [saved, shown, save, say, lang, setLanguage]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
