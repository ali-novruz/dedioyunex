"use client";

import { useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Window } from "@/components/Window";

interface Contact {
  name: string;
  phone: string;
  email: string | null;
}

/** Who is told when the user presses the scam button. Stored encrypted and never shared with sites. */
export function TrustedContact({ initial }: { initial: Contact | null }) {
  const { l } = usePrefs();
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ contact: Contact }>("/api/me/contact", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, email }) });
      setSaved(r.contact);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove() {
    setError(null);
    try {
      await api("/api/me/contact", { method: "DELETE" });
      setSaved(null);
      setName("");
      setPhone("");
      setEmail("");
      setEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Window title={l("Etibarlı şəxs", "Trusted person")}>
      <div className="stack">
        <p>{l("Kimsə sizdən kod və ya pul istəsə, bu şəxsə bir toxunuşla xəbər verəcəksiniz. Heç bir sayta ötürülmür.", "If someone asks you for a code or money, you can tell this person with one tap. It is never passed to any site.")}</p>
        {error && <p className="error" role="alert">{error}</p>}
        {!editing && saved ? (
          <>
            <p className="h3">{saved.name}</p>
            <p className="muted">{saved.phone}{saved.email ? ` · ${saved.email}` : ""}</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-secondary btn-small" onClick={() => setEditing(true)}>{l("Dəyiş", "Change")}</button>
              <button className="btn btn-danger btn-small" onClick={remove}>{l("Sil", "Delete")}</button>
            </div>
          </>
        ) : (
          <form onSubmit={save} className="stack">
            <div>
              <label className="label" htmlFor="tc-name">{l("Adı", "Name")}</label>
              <input id="tc-name" className="field" required value={name} onChange={(e) => setName(e.target.value)} placeholder={l("Məs: Qızım Aytən", "For example: My daughter Ayten")} />
            </div>
            <div>
              <label className="label" htmlFor="tc-phone">{l("Telefon", "Phone")}</label>
              <input id="tc-phone" className="field" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994501234567" />
            </div>
            <div>
              <label className="label" htmlFor="tc-email">{l("E-poçt (istəyə görə)", "E-mail (optional)")}</label>
              <input id="tc-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block">{l("Saxla", "Save")}</button>
          </form>
        )}
      </div>
    </Window>
  );
}
