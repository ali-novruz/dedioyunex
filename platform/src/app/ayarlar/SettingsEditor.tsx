"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PREFERENCES, GROUPS, SETTINGS, groupOf, optionLabel, settingHelp, settingLabel, settingsForCategories, type Category, type PreferenceKey, type Preferences, type SettingDef } from "@sdk/schema";
import { voiceInfo } from "@sdk/tts";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";

const SWATCHES = ["#000000", "#ffffff", "#fff8e1", "#ffeb3b", "#f5bc4a", "#b71c1c", "#1b5e20", "#0d47a1", "#263238"];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function SettingsEditor({ categories }: { categories: Category[] }) {
  const { saved, save, say, setSaved, l, lang, setLanguage } = usePrefs();
  const [showAll, setShowAll] = useState(categories.length === 0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const colorTimers = useRef(new Map<PreferenceKey, ReturnType<typeof setTimeout>>());

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(lang === "az" ? "az" : "en");
    if (q) return SETTINGS.filter((s) => `${settingLabel(s, lang)} ${settingHelp(s, lang)}`.toLocaleLowerCase(lang === "az" ? "az" : "en").includes(q));
    if (showAll) return SETTINGS;
    return settingsForCategories(categories);
  }, [query, showAll, categories, lang]);

  async function change(key: keyof Preferences, value: unknown) {
    setError(null);
    try {
      if (key === "language") {
        await setLanguage(value as Preferences["language"]);
        return;
      }
      setStatus(l("Saxlanılır…", "Saving…"));
      await save({ [key]: value } as Partial<Preferences>);
      setStatus(l("Saxlanıldı", "Saved"));
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** The colour picker fires continuously while dragging: send only the final colour. */
  function changeColorSoon(key: PreferenceKey, value: string) {
    setSaved({ ...saved, [key]: value });
    clearTimeout(colorTimers.current.get(key));
    colorTimers.current.set(key, setTimeout(() => void change(key, value), 350));
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

  const render = (s: SettingDef) => {
    const value = saved[s.key];
    return (
      <div key={s.key}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-[12rem]">
            <h3 className="h3" id={`l-${s.key}`}>{settingLabel(s, lang)}</h3>
            <p className="muted">{settingHelp(s, lang)}</p>
            {s.kind === "B" && <p className="muted mt-1 text-[.9rem]">{l("Xidmət bu funksiyanı dəstəklədikdə işləyir.", "Works when the service supports this feature.")}</p>}
          </div>
          {s.control === "toggle" && (
            <button role="switch" aria-checked={!!value} aria-labelledby={`l-${s.key}`} onClick={() => change(s.key, !value)} className="switch">
              <span>{value ? l("Açıq", "On") : l("Bağlı", "Off")}</span>
            </button>
          )}
        </div>
        {s.control === "choice" && (
          <div role="radiogroup" aria-labelledby={`l-${s.key}`} className="mt-3 flex flex-wrap gap-3">
            {s.options.map((o) => {
              const on = value === o.value;
              return (
                <button key={String(o.value)} role="radio" aria-checked={on} onClick={() => change(s.key, o.value)} className={`btn btn-small ${on ? "btn-primary btn-on" : "btn-secondary"}`}>
                  {on && <Icon name="check" />} {optionLabel(s, o.value, lang)}
                </button>
              );
            })}
          </div>
        )}
        {s.control === "color" && (
          <div role="group" aria-labelledby={`l-${s.key}`} className="mt-3 flex flex-wrap items-center gap-2">
            <button aria-pressed={value === "default"} onClick={() => change(s.key, "default")} className={`btn btn-small ${value === "default" ? "btn-primary btn-on" : "btn-secondary"}`}>
              {value === "default" && <Icon name="check" />} {l("Normal", "Normal")}
            </button>
            {SWATCHES.map((c) => (
              <button key={c} aria-label={c} aria-pressed={value === c} onClick={() => change(s.key, c)} className="swatch" style={{ backgroundColor: c, color: luminance(c) > 0.4 ? "#000" : "#fff" }}>
                {value === c && <Icon name="check" />}
              </button>
            ))}
            <label className="btn btn-secondary btn-small">
              {l("Başqa rəng", "Other colour")}
              <input type="color" className="sr-only" value={value === "default" ? "#000000" : String(value)} onChange={(e) => changeColorSoon(s.key, e.target.value)} />
            </label>
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
  };

  const hardToRead = saved.textColor !== "default" && saved.backgroundColor !== "default" && contrast(saved.textColor, saved.backgroundColor) < 4.5;
  const narrowed = !showAll && !query.trim();

  return (
    <div className="stack">
      <p aria-live="polite" className="sticky top-2 z-10 !mt-0 h-0 overflow-visible text-right font-bold">{status}</p>
      {error && <p className="error" role="alert">{error}</p>}

      <div>
        <label htmlFor="find" className="label">{l("Ayar axtar", "Find a setting")}</label>
        <input id="find" className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={l("Məsələn: rəng, kursor, səs", "For example: colour, pointer, sound")} />
      </div>

      {narrowed && categories.length > 0 && (
        <p>
          {l("Sizin seçdiyiniz ehtiyaclara uyğun ayarlar göstərilir.", "Showing the settings that match the needs you chose.")}{" "}
          <Link href="/qeydiyyat" className="textlink">{l("Ehtiyaclarımı dəyiş", "Change my needs")}</Link>
        </p>
      )}

      {hardToRead && <p className="notice" role="status">{l("Seçdiyiniz yazı və fon rəngləri bir-birinə çox yaxındır, yazını oxumaq çətin ola bilər.", "The text and background colours you chose are very close, so the text may be hard to read.")}</p>}

      {visible.length === 0 && <p className="notice">{l("Belə ayar tapılmadı.", "No setting was found.")}</p>}

      {GROUPS.map((g, i) => {
        const items = visible.filter((s) => groupOf(s.key) === g.id);
        if (items.length === 0) return null;
        return (
          <details key={g.id} className="window fold-window" open={narrowed || !!query.trim() || i < 2}>
            <summary className="window-bar">
              <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
              <span>{lang === "en" ? g.en : g.label}</span>
              <span className="ml-auto font-normal">{items.length}</span>
            </summary>
            <div className="window-body rows">{items.map(render)}</div>
          </details>
        );
      })}

      <div className="pt-3 stack">
        {categories.length > 0 && (
          <button className="btn btn-secondary btn-block" onClick={() => setShowAll((v) => !v)}>
            {showAll ? l("Yalnız mənə uyğun ayarları göstər", "Show only the settings for me") : l(`Bütün ayarları göstər (${SETTINGS.length})`, `Show all settings (${SETTINGS.length})`)}
          </button>
        )}
        <button className="btn btn-danger btn-block" onClick={resetAll}>{l("Hamısını sıfırla", "Reset everything")}</button>
      </div>
    </div>
  );
}
