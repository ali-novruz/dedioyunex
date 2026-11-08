"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, DEFAULT_PREFERENCES, SETTINGS, categoryLabel, optionLabel, settingHelp, settingLabel, type Category, type Preferences, type SettingDef } from "@sdk/schema";
import { voiceInfo } from "@sdk/tts";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";
import { Window } from "@/components/Window";

/** Groups settings by category; each setting appears once, under the first visible category it belongs to. */
function groups(visible: Category[]): { cat: (typeof CATEGORIES)[number]; items: SettingDef[] }[] {
  const seen = new Set<string>();
  return CATEGORIES.filter((c) => visible.includes(c.id))
    .map((cat) => ({
      cat,
      items: SETTINGS.filter((s) => s.key !== "language" && s.categories.includes(cat.id) && !seen.has(s.key) && seen.add(s.key)),
    }))
    .filter((g) => g.items.length);
}

export function SettingsEditor({ categories }: { categories: Category[] }) {
  const { saved, save, say, setSaved, l, lang, setLanguage } = usePrefs();
  const [showAll, setShowAll] = useState(categories.length === 0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const visible = showAll ? CATEGORIES.map((c) => c.id) : categories;
  const general = SETTINGS.find((s) => s.key === "language")!;

  async function change(key: keyof Preferences, value: unknown) {
    setError(null);
    setStatus(l("Saxlanılır…", "Saving…"));
    try {
      if (key === "language") {
        await setLanguage(value as Preferences["language"]);
        return;
      }
      await save({ [key]: value } as Partial<Preferences>);
      setStatus(l("Saxlanıldı", "Saved"));
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function resetAll() {
    if (!window.confirm(l("Bütün ayarlar normal vəziyyətə qaytarılsın?", "Return all settings to normal?"))) return;
    try {
      const { preferences } = await api<{ preferences: Preferences }>("/api/me/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEFAULT_PREFERENCES, language: saved.language }),
      });
      setSaved(preferences);
      setStatus(l("Hamısı sıfırlandı", "All settings were reset"));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function testVoice() {
    setVoiceNote(null);
    try {
      const info = await voiceInfo(lang);
      if (!info.available) {
        setVoiceNote(l("Bu brauzerdə səsli oxunuş üçün səs yoxdur.", "This browser has no voice for reading aloud."));
        return;
      }
      if (info.substitute) setVoiceNote(l("Bu cihazda Azərbaycan səsi yoxdur, türk səsi ilə oxunur.", "This device has no Azerbaijani voice, so a Turkish voice is used."));
      await say(l("Salam! Mətnlər bu sürətlə oxunacaq.", "Hello! Text will be read at this speed."));
    } catch (e) {
      setVoiceNote(e instanceof Error ? e.message : String(e));
    }
  }

  const render = (s: SettingDef) => (
    <div key={s.key}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-[12rem]">
          <h3 className="h3" id={`l-${s.key}`}>{settingLabel(s, lang)}</h3>
          <p className="muted">{settingHelp(s, lang)}</p>
          {s.kind === "B" && <p className="muted mt-1 text-[.9rem]">{l("Xidmət bu funksiyanı dəstəklədikdə işləyir.", "Works when the service supports this feature.")}</p>}
        </div>
        {s.control === "toggle" && (
          <button role="switch" aria-checked={!!saved[s.key]} aria-labelledby={`l-${s.key}`} onClick={() => change(s.key, !saved[s.key])} className="switch">
            <span>{saved[s.key] ? l("Açıq", "On") : l("Bağlı", "Off")}</span>
          </button>
        )}
      </div>
      {s.control === "choice" && (
        <div role="radiogroup" aria-labelledby={`l-${s.key}`} className="mt-3 flex flex-wrap gap-3">
          {s.options.map((o) => {
            const on = saved[s.key] === o.value;
            return (
              <button key={String(o.value)} role="radio" aria-checked={on} onClick={() => change(s.key, o.value)} className={`btn btn-small ${on ? "btn-primary btn-on" : "btn-secondary"}`}>
                {on && <Icon name="check" />} {optionLabel(s, o.value, lang)}
              </button>
            );
          })}
        </div>
      )}
      {s.key === "ttsRate" && (
        <div className="mt-3 stack">
          <button className="btn btn-secondary btn-small" onClick={testVoice}><Icon name="speaker" /> {l("Səsi yoxla", "Test the voice")}</button>
          {voiceNote && <p className="notice">{voiceNote}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="stack">
      <p aria-live="polite" className="sticky top-2 z-10 !mt-0 h-0 overflow-visible text-right font-bold">{status}</p>
      {error && <p className="error" role="alert">{error}</p>}

      {!showAll && categories.length > 0 && (
        <p>
          {l("Sizin seçdiyiniz ehtiyaclara uyğun ayarlar göstərilir.", "Showing the settings that match the needs you chose.")}{" "}
          <Link href="/qeydiyyat" className="textlink">{l("Ehtiyaclarımı dəyiş", "Change my needs")}</Link>
        </p>
      )}

      {groups(visible).map(({ cat, items }) => (
        <Window key={cat.id} title={categoryLabel(cat, lang)}>
          <div className="rows">{items.map(render)}</div>
        </Window>
      ))}

      <Window title={l("Ümumi", "General")}>{render(general)}</Window>

      <div className="pt-3 stack">
        {categories.length > 0 && (
          <button className="btn btn-secondary btn-block" onClick={() => setShowAll((v) => !v)}>
            {showAll ? l("Yalnız mənə uyğun ayarları göstər", "Show only the settings for me") : l("Bütün ayarları göstər", "Show all settings")}
          </button>
        )}
        <button className="btn btn-danger btn-block" onClick={resetAll}>{l("Hamısını sıfırla", "Reset everything")}</button>
      </div>
    </div>
  );
}
