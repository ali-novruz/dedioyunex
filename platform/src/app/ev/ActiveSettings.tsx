"use client";

import { changedKeys, describeValue } from "@sdk/schema";
import { usePrefs } from "@/components/PrefsProvider";

export function ActiveSettings() {
  const { saved } = usePrefs();
  const keys = changedKeys(saved);
  return (
    <section aria-labelledby="active-h">
      <h2 id="active-h" className="h2">Hazırkı ayarlarınız</h2>
      {keys.length === 0 ? (
        <p className="muted">Hələ heç nə dəyişməmisiniz — hər şey normal ölçüdədir.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {keys.map((k) => (
            <li key={k} className="pill">{describeValue(k, saved[k])}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
