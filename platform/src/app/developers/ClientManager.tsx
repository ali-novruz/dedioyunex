"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

interface Client {
  id: string;
  name: string;
  allowedOrigins: string[];
  redirectUris: string[];
}

export function ClientManager({ initial, base }: { initial: Client[]; base: string }) {
  const [clients, setClients] = useState(initial);
  const [name, setName] = useState("");
  const [origins, setOrigins] = useState("");
  const [redirects, setRedirects] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { client } = await api<{ client: Client }>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, origins, redirectUris: redirects }),
      });
      setClients((c) => [client, ...c]);
      setName("");
      setOrigins("");
      setRedirects("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Bu sayt silinsin? Qoşulmuş istifadəçilərin bağlantısı da kəsiləcək.")) return;
    try {
      await api(`/api/clients/${encodeURIComponent(id)}`, { method: "DELETE" });
      setClients((c) => c.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="stack">
      {clients.map((c) => {
        const snippet = `<script src="${base}/sdk.js" data-client-id="${c.id}"></script>`;
        return (
          <div key={c.id} className="card stack">
            <p className="text-[1.2rem] font-extrabold">{c.name}</p>
            <p>
              client_id: <code className="rounded bg-[var(--brand-soft)] px-2 py-1 font-bold">{c.id}</code>
            </p>
            {c.allowedOrigins.length > 0 && <p className="muted">Saytlar: {c.allowedOrigins.join(", ")}</p>}
            {c.redirectUris.length > 0 && <p className="muted">Mobil: {c.redirectUris.join(", ")}</p>}
            {c.allowedOrigins.length > 0 && (
              <>
                <pre className="overflow-x-auto rounded-2xl bg-[#14181f] p-3 text-[.8rem] text-[#e8eaed]"><code>{snippet}</code></pre>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary" onClick={() => copy(snippet, c.id)}>{copied === c.id ? "✓ Kopyalandı" : "📋 Kodu kopyala"}</button>
                  <button className="btn btn-danger" onClick={() => remove(c.id)}>Sil</button>
                </div>
              </>
            )}
            {c.allowedOrigins.length === 0 && <button className="btn btn-danger" onClick={() => remove(c.id)}>Sil</button>}
          </div>
        );
      })}

      <form onSubmit={create} className="card stack">
        <p className="text-[1.15rem] font-extrabold">Yeni sayt və ya tətbiq</p>
        <div>
          <label className="label" htmlFor="c-name">Adı</label>
          <input id="c-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Məs: Mənim Mağazam" />
        </div>
        <div>
          <label className="label" htmlFor="c-origins">Sayt ünvanları (hər sətirdə bir)</label>
          <textarea id="c-origins" className="field min-h-[5rem]" value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder={"https://saytim.az\nhttp://localhost:5173"} />
          <p className="muted text-[.85rem]">Yalnız domen: https://saytim.az (yol olmadan). Test üçün http://localhost qəbul olunur.</p>
        </div>
        <div>
          <label className="label" htmlFor="c-redirects">Mobil redirect URI (istəyə görə)</label>
          <input id="c-redirects" className="field" value={redirects} onChange={(e) => setRedirects(e.target.value)} placeholder="myapp://callback" />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Yaradılır…" : "Qeydiyyatdan keçir"}</button>
      </form>
    </div>
  );
}
