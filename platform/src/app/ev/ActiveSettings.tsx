"use client";

import { changedKeys, describeValue } from "@sdk/schema";
import { usePrefs } from "@/components/PrefsProvider";

export function ActiveSettings() {
  const { saved, l, lang } = usePrefs();
  const keys = changedKeys(saved).filter((k) => k !== "language");
  return (
    <section aria-labelledby="active-h" className="stack">
      <h2 id="active-h" className="h2">{l("Hazırkı ayarlarınız", "Your current settings")}</h2>
      {keys.length === 0 ? (
        <p>{l("Hələ heç nə dəyişməmisiniz, hər şey normal ölçüdədir.", "You have not changed anything yet. Everything is at its normal size.")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {keys.map((k) => (
            <li key={k} className="tag">{describeValue(k, saved[k], lang)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
