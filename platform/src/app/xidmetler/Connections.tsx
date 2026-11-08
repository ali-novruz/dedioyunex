"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

interface Connection {
  clientId: string;
  name: string;
  connectedAt: number;
  lastUsedAt: number | null;
}

const fmt = (t: number) => new Date(t).toLocaleString("az-AZ", { dateStyle: "medium", timeStyle: "short" });

export function Connections({ initial, demoUrl }: { initial: Connection[]; demoUrl: string | null }) {
  const [list, setList] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function remove(c: Connection) {
    if (!window.confirm(`${c.name} ayarlarınızı artıq görməsin?`)) return;
    try {
      await api(`/api/connections/${encodeURIComponent(c.clientId)}`, { method: "DELETE" });
      setList((l) => l.filter((x) => x.clientId !== c.clientId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      {error && <p className="error" role="alert">{error}</p>}
      {list.length === 0 ? (
        <div className="card stack">
          <p>Hələ heç bir xidmət qoşulmayıb.</p>
          <p className="muted">MƏNƏ UYĞUN düyməsi olan saytda “MƏNƏ UYĞUN-dan ayarları gətir” düyməsinə basın.</p>
          {demoUrl && (
            <a className="btn btn-secondary" href={demoUrl} target="_blank" rel="noreferrer">
              Nümunə sayta keç (DEMO Market)
            </a>
          )}
        </div>
      ) : (
        <ul className="stack">
          {list.map((c) => (
            <li key={c.clientId} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[1.2rem] font-extrabold">🔗 {c.name}</p>
                <p className="muted">Qoşulub: {fmt(c.connectedAt)}</p>
                {c.lastUsedAt && <p className="muted">Son istifadə: {fmt(c.lastUsedAt)}</p>}
              </div>
              <button className="btn btn-danger" onClick={() => remove(c)}>Ayır</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
