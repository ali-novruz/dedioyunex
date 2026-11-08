"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, DEFAULT_PREFERENCES, SETTINGS, type Category, type Preferences, type SettingDef } from "@sdk/schema";
import { voiceInfo } from "@sdk/tts";
import { api, usePrefs } from "@/components/PrefsProvider";

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
  const { saved, save, say, setSaved } = usePrefs();
  const [showAll, setShowAll] = useState(categories.length === 0);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const visible = showAll ? CATEGORIES.map((c) => c.id) : categories;
  const general = SETTINGS.find((s) => s.key === "language")!;

  async function change(key: keyof Preferences, value: unknown) {
    setError(null);
    setStatus("Saxlanılır…");
    try {
      await save({ [key]: value } as Partial<Preferences>);
      setStatus("✓ Saxlanıldı");
    } catch (e) {
      setStatus("");
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function resetAll() {
    if (!window.confirm("Bütün ayarlar normal vəziyyətə qaytarılsın?")) return;
    try {
      const { preferences } = await api<{ preferences: Preferences }>("/api/me/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEFAULT_PREFERENCES, language: saved.language }),
      });
      setSaved(preferences);
      setStatus("✓ Hamısı sıfırlandı");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function testVoice() {
    setVoiceNote(null);
    try {
      const info = await voiceInfo(saved.language);
      if (!info.available) {
        setVoiceNote("Bu brauzerdə səsli oxunuş üçün səs yoxdur.");
        return;
      }
      if (info.substitute) setVoiceNote("Bu cihazda Azərbaycan səsi yoxdur — türk səsi ilə oxunur.");
      await say("Salam! Mətnlər bu sürətlə oxunacaq.");
    } catch (e) {
      setVoiceNote(e instanceof Error ? e.message : String(e));
    }
  }

  const render = (s: SettingDef) => (
    <div key={s.key} className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.2rem] font-extrabold" id={`l-${s.key}`}>{s.label}</h3>
          <p className="muted">{s.help}</p>
          {s.kind === "B" && <p className="mt-1 text-[.85rem] text-[var(--muted)]">ℹ️ Xidmət bu funksiyanı dəstəklədikdə işləyir.</p>}
        </div>
        {s.control === "toggle" && (
          <button
            role="switch"
            aria-checked={!!saved[s.key]}
            aria-labelledby={`l-${s.key}`}
            onClick={() => change(s.key, !saved[s.key])}
            className={`relative h-12 w-24 shrink-0 rounded-full border-[3px] transition ${saved[s.key] ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[#8a8f98] bg-[#e7e9ec]"}`}
          >
            <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all ${saved[s.key] ? "left-[3.2rem]" : "left-1"}`} />
            <span className="sr-only">{saved[s.key] ? "Açıq" : "Bağlı"}</span>
          </button>
        )}
      </div>
      {s.control === "choice" && (
        <div role="radiogroup" aria-labelledby={`l-${s.key}`} className="mt-3 flex flex-wrap gap-2">
          {s.options.map((o) => {
            const on = saved[s.key] === o.value;
            return (
              <button
                key={String(o.value)}
                role="radio"
                aria-checked={on}
                onClick={() => change(s.key, o.value)}
                className={`btn ${on ? "btn-primary" : "btn-secondary"}`}
              >
                {on && <span aria-hidden>✓</span>} {o.label}
              </button>
            );
          })}
        </div>
      )}
      {s.key === "ttsRate" && (
        <div className="mt-3 stack">
          <button className="btn btn-secondary" onClick={testVoice}>🔊 Səsi yoxla</button>
          {voiceNote && <p className="notice">{voiceNote}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="stack">
      <p aria-live="polite" className="sticky top-2 z-10 min-h-[1.5em] text-right font-bold text-[var(--brand)]">{status}</p>
      {error && <p className="error" role="alert">{error}</p>}

      {!showAll && categories.length > 0 && (
        <p className="muted">
          Sizin seçdiyiniz ehtiyaclara uyğun ayarlar göstərilir.{" "}
          <Link href="/qeydiyyat" className="font-bold text-[var(--brand)] underline">Ehtiyaclarımı dəyiş</Link>
        </p>
      )}

      {groups(visible).map(({ cat, items }) => (
        <section key={cat.id} aria-labelledby={`g-${cat.id}`} className="stack">
          <h2 id={`g-${cat.id}`} className="h2">
            <span aria-hidden>{cat.icon}</span> {cat.label}
          </h2>
          {items.map(render)}
        </section>
      ))}

      <section aria-labelledby="g-general" className="stack">
        <h2 id="g-general" className="h2">🌐 Ümumi</h2>
        {render(general)}
      </section>

      {categories.length > 0 && (
        <button className="btn btn-secondary btn-block" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Yalnız mənə uyğun ayarları göstər" : "Bütün ayarları göstər"}
        </button>
      )}
      <button className="btn btn-danger btn-block" onClick={resetAll}>Hamısını sıfırla</button>
    </div>
  );
}
