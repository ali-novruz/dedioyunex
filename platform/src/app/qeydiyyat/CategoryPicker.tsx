"use client";

import { useState } from "react";
import { CATEGORIES, presetFor, changedKeys, type Category } from "@sdk/schema";
import { api, usePrefs } from "@/components/PrefsProvider";

export function CategoryPicker({ initial, firstTime, next }: { initial: Category[]; firstTime: boolean; next: string }) {
  const { saved, save } = usePrefs();
  const [selected, setSelected] = useState<Category[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { preset: boolean }>(null);

  const toggle = (c: Category) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  async function submit(cats: Category[]) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: cats }) });
      // First-time users with untouched settings get a starter preset for the chosen needs.
      const applyPreset = cats.length > 0 && changedKeys(saved).length === 0;
      if (applyPreset) await save(presetFor(cats));
      if (next) {
        window.location.href = next;
        return;
      }
      setDone({ preset: applyPreset });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="stack">
        {done.preset && (
          <p className="ok" role="status">
            Seçiminizə uyğun başlanğıc ayarları tətbiq etdik. İstədiyiniz vaxt dəyişə bilərsiniz.
          </p>
        )}
        <h2 className="h2">İndi ayarlarınızı necə qurmaq istəyirsiniz?</h2>
        <a href="/ev?mic=1" className="btn btn-primary btn-block text-[1.2rem]">🎤 Danışaraq — köməkçi qursun</a>
        <a href="/ayarlar" className="btn btn-secondary btn-block text-[1.2rem]">✋ Özüm seçərək</a>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Çətinliklər">
        {CATEGORIES.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className={`card flex min-h-[7rem] items-start gap-3 text-left transition ${on ? "!border-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
              style={{ borderWidth: 3 }}
            >
              <span aria-hidden className="text-[2.2rem] leading-none">{c.icon}</span>
              <span>
                <span className="block text-[1.2rem] font-extrabold">
                  {c.label} {on && <span aria-hidden>✓</span>}
                </span>
                <span className="muted block">{c.help}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block text-[1.2rem]" disabled={busy || selected.length === 0} onClick={() => submit(selected)}>
        {busy ? "Saxlanılır…" : `Davam et${selected.length ? ` (${selected.length})` : ""}`}
      </button>
      <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => submit([])}>
        {firstTime ? "Heç biri — bütün ayarları göstər" : "Seçimi təmizlə — bütün ayarları göstər"}
      </button>
    </div>
  );
}
