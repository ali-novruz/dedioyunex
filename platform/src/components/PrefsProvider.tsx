"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PreferenceEngine } from "@sdk/apply";
import { DEFAULT_PREFERENCES, type Preferences } from "@sdk/schema";
import { speak, stopSpeaking } from "@sdk/tts";

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
  if (!r.ok) throw new Error(body.error || `Xəta (${r.status})`);
  return body as T;
}

export function PrefsProvider({ initial, children }: { initial: Preferences | null; children: React.ReactNode }) {
  const [saved, setSaved] = useState<Preferences>(initial ?? DEFAULT_PREFERENCES);
  const [preview, setPreview] = useState<Preferences | null>(null);
  const engine = useRef<PreferenceEngine | null>(null);
  const shown = preview ?? saved;

  useEffect(() => {
    engine.current ??= new PreferenceEngine(document, { mode: "auto", assetBase: "" });
    engine.current.apply(shown);
  }, [shown]);

  useEffect(() => () => engine.current?.reset(), []);

  const save = useCallback(async (patch: Partial<Preferences>) => {
    const { preferences } = await api<{ preferences: Preferences }>("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(preferences);
    return preferences;
  }, []);

  const say = useCallback(
    async (text: string) => {
      stopSpeaking();
      await speak(text, { language: shown.language, rate: shown.ttsRate });
    },
    [shown.language, shown.ttsRate],
  );

  const value = useMemo(() => ({ saved, shown, setSaved, setPreview, save, say }), [saved, shown, save, say]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
