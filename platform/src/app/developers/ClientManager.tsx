"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";
import { Window } from "@/components/Window";

interface Client {
  id: string;
  name: string;
  allowedOrigins: string[];
  redirectUris: string[];
}

export function ClientManager({ initial, base }: { initial: Client[]; base: string }) {
  const { l } = usePrefs();
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
    if (!window.confirm(l("Bu sayt silinsin? Qoşulmuş istifadəçilərin bağlantısı da kəsiləcək.", "Delete this site? Connected users will be disconnected too."))) return;
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
          <Window key={c.id} title={c.name}>
            <div className="stack">
              <p>client_id: <code className="inline-code font-bold">{c.id}</code></p>
              {c.allowedOrigins.length > 0 && <p className="muted">{l("Saytlar:", "Sites:")} {c.allowedOrigins.join(", ")}</p>}
              {c.redirectUris.length > 0 && <p className="muted">{l("Mobil:", "Mobile:")} {c.redirectUris.join(", ")}</p>}
              {c.allowedOrigins.length > 0 && <pre className="code"><code>{snippet}</code></pre>}
              <div className="flex flex-wrap gap-3">
                {c.allowedOrigins.length > 0 && (
                  <button className="btn btn-primary btn-small" onClick={() => copy(snippet, c.id)}>
                    <Icon name={copied === c.id ? "check" : "copy"} /> {copied === c.id ? l("Kopyalandı", "Copied") : l("Kodu kopyala", "Copy the code")}
                  </button>
                )}
                <button className="btn btn-danger btn-small" onClick={() => remove(c.id)}>{l("Sil", "Delete")}</button>
              </div>
            </div>
          </Window>
        );
      })}

      <Window title={l("Yeni sayt və ya tətbiq", "New site or app")}>
        <form onSubmit={create} className="stack">
          <div>
            <label className="label" htmlFor="c-name">{l("Adı", "Name")}</label>
            <input id="c-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder={l("Məs: Mənim Mağazam", "For example: My Shop")} />
          </div>
          <div>
            <label className="label" htmlFor="c-origins">{l("Sayt ünvanları (hər sətirdə bir)", "Site addresses (one per line)")}</label>
            <textarea id="c-origins" className="field min-h-[5rem]" value={origins} onChange={(e) => setOrigins(e.target.value)} placeholder={"https://example.az\nhttp://localhost:5173"} />
            <p className="muted mt-1 text-[.9rem]">{l("Yalnız domen: https://saytim.az (yol olmadan). Test üçün http://localhost qəbul olunur.", "Domain only: https://example.az (no path). http://localhost is accepted for testing.")}</p>
          </div>
          <div>
            <label className="label" htmlFor="c-redirects">{l("Mobil redirect URI (istəyə görə)", "Mobile redirect URI (optional)")}</label>
            <input id="c-redirects" className="field" value={redirects} onChange={(e) => setRedirects(e.target.value)} placeholder="myapp://callback" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? l("Yaradılır…", "Creating…") : l("Qeydiyyatdan keçir", "Register")}</button>
        </form>
      </Window>
    </div>
  );
}
