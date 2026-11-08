"use client";

import { DEFAULT_PREFERENCES, type Preferences } from "@sdk/schema";
import { usePrefs } from "./PrefsProvider";
import { Icon } from "./Icons";
import { useState } from "react";

type Demo = "big" | "dark" | "simple";

const PATCH: Record<Demo, Partial<Preferences>> = {
  big: { fontScale: 1.5 },
  dark: { contrast: "dark" },
  simple: { lineSpacing: 1.5, letterSpacing: 0.05 },
};

/** Landing proof: the visitor presses a key and this very page changes, before any account exists. */
export function TryIt() {
  const { setPreview, l } = usePrefs();
  const [on, setOn] = useState<Demo[]>([]);

  function press(d: Demo) {
    const next = on.includes(d) ? on.filter((x) => x !== d) : [...on, d];
    setOn(next);
    setPreview(next.length ? next.reduce<Preferences>((p, x) => ({ ...p, ...PATCH[x] }), { ...DEFAULT_PREFERENCES }) : null);
  }

  const keys: { id: Demo; label: string }[] = [
    { id: "big", label: l("Yazıları böyüt", "Larger text") },
    { id: "dark", label: l("Qaranlıq fon", "Dark background") },
    { id: "simple", label: l("Geniş aralıq", "Wider spacing") },
  ];

  return (
    <div className="stack">
      <p>{l("Basın, bu səhifə dərhal dəyişsin. Yenidən bassanız, geri qayıdır.", "Press a key and this page changes at once. Press again to undo.")}</p>
      <div className="try-keys">
        {keys.map((k) => {
          const pressed = on.includes(k.id);
          return (
            <button key={k.id} type="button" aria-pressed={pressed} className={`btn btn-primary ${pressed ? "btn-on" : ""}`} onClick={() => press(k.id)}>
              {pressed && <Icon name="check" />}
              {k.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
