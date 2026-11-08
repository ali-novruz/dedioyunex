"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Window } from "@/components/Window";
import { LOCALE } from "@/lib/lang";

interface Connection {
  clientId: string;
  name: string;
  connectedAt: number;
  lastUsedAt: number | null;
}

export function Connections({ initial, demoUrl }: { initial: Connection[]; demoUrl: string | null }) {
  const { l, lang } = usePrefs();
  const [list, setList] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const fmt = (t: number) => new Date(t).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" });

  async function remove(c: Connection) {
    if (!window.confirm(l(`${c.name} ayarlarınızı artıq görməsin?`, `Stop ${c.name} from seeing your settings?`))) return;
    try {
      await api(`/api/connections/${encodeURIComponent(c.clientId)}`, { method: "DELETE" });
      setList((x) => x.filter((y) => y.clientId !== c.clientId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      {error && <p className="error" role="alert">{error}</p>}
      <Window title={l("Xidmətlər", "Services")}>
        {list.length === 0 ? (
          <div className="stack">
            <p className="font-semibold">{l("Hələ heç bir xidmət qoşulmayıb.", "No services are connected yet.")}</p>
            <p className="muted">{l("Cizzy düyməsi olan saytda “Cizzy-dən ayarları gətir” düyməsinə basın.", "On a site with the Cizzy button, press “Bring my Cizzy settings”.")}</p>
            {demoUrl && (
              <a className="btn btn-primary" href={demoUrl} target="_blank" rel="noreferrer">
                {l("Nümunə sayta keç (DEMO Market)", "Open the sample site (DEMO Market)")}
              </a>
            )}
          </div>
        ) : (
          <ul className="rows">
            {list.map((c) => (
              <li key={c.clientId} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="h3">{c.name}</p>
                  <p className="muted">{l("Qoşulub:", "Connected:")} {fmt(c.connectedAt)}</p>
                  {c.lastUsedAt && <p className="muted">{l("Son istifadə:", "Last used:")} {fmt(c.lastUsedAt)}</p>}
                </div>
                <button className="btn btn-danger btn-small" onClick={() => remove(c)}>{l("Ayır", "Disconnect")}</button>
              </li>
            ))}
          </ul>
        )}
      </Window>
    </div>
  );
}
