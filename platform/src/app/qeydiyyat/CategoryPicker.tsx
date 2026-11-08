"use client";

import { useState } from "react";
import { CATEGORIES, MAIN_CATEGORIES, categoryHelp, categoryLabel, presetFor, changedKeys, type Category } from "@sdk/schema";
import { api, usePrefs } from "@/components/PrefsProvider";
import { CATEGORY_ICON, Icon } from "@/components/Icons";

export function CategoryPicker({ initial, firstTime, next }: { initial: Category[]; firstTime: boolean; next: string }) {
  const { saved, save, l, lang } = usePrefs();
  const [selected, setSelected] = useState<Category[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { preset: boolean }>(null);
  const [more, setMore] = useState(initial.some((c) => !MAIN_CATEGORIES.includes(c)));
  const shown = more ? CATEGORIES : CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.id));

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
            {l("Seçiminizə uyğun başlanğıc ayarları tətbiq etdik. İstədiyiniz vaxt dəyişə bilərsiniz.", "We applied starter settings for your choices. You can change them at any time.")}
          </p>
        )}
        <h2 className="h2">{l("İndi ayarlarınızı necə qurmaq istəyirsiniz?", "How would you like to set things up?")}</h2>
        <a href="/ev?mic=1" className="btn btn-primary btn-block text-[1.2rem]"><Icon name="mic" /> {l("Danışaraq, köməkçi qursun", "By speaking, with the assistant")}</a>
        <a href="/ayarlar" className="btn btn-secondary btn-block text-[1.2rem]"><Icon name="sliders" /> {l("Özüm seçərək", "By choosing myself")}</a>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label={l("Çətinliklər", "Difficulties")}>
        {shown.map((c) => {
          const on = selected.includes(c.id);
          return (
            <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} className="need">
              <Icon name={CATEGORY_ICON[c.id]} className="need-icon" />
              <span>
                <span className="need-title">
                  {categoryLabel(c, lang)} {on && <Icon name="check" />}
                </span>
                <span className="need-help">{categoryHelp(c, lang)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!more && (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setMore(true)}>
          {l(`Başqa çətinliklər (${CATEGORIES.length - MAIN_CATEGORIES.length})`, `Other difficulties (${CATEGORIES.length - MAIN_CATEGORIES.length})`)}
        </button>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="pt-3">
        <button className="btn btn-primary btn-block text-[1.2rem]" disabled={busy || selected.length === 0} onClick={() => submit(selected)}>
          {busy ? l("Saxlanılır…", "Saving…") : `${l("Davam et", "Continue")}${selected.length ? ` (${selected.length})` : ""}`}
        </button>
      </div>
      <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => submit([])}>
        {firstTime ? l("Heç biri, bütün ayarları göstər", "None, show all settings") : l("Seçimi təmizlə, bütün ayarları göstər", "Clear my choices, show all settings")}
      </button>
    </div>
  );
}
