"use client";

import { useState } from "react";
import { api } from "@/components/PrefsProvider";

export function LoginForm({ next }: { next: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ demoCode: string | null }>("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDemoCode(r.demoCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ onboarded: boolean }>("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      // Full reload so the layout picks up the new session and the user's preferences.
      const target = !r.onboarded ? `/qeydiyyat${next ? `?next=${encodeURIComponent(next)}` : ""}` : next || "/ev";
      window.location.href = target;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="stack card">
        <div>
          <label htmlFor="email" className="label">E-poçt ünvanınız</label>
          <input
            id="email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nümunə@mail.az"
          />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Göndərilir…" : "Kodu göndər"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="stack card">
      <p>
        Kod <b>{email}</b> ünvanına göndərildi.
      </p>
      {demoCode && (
        <p className="notice" role="status">
          <b>Demo rejimi:</b> e-poçt göndərilmir. Kodunuz: <b className="text-[1.4rem] tracking-[.3em]">{demoCode}</b>
        </p>
      )}
      <div>
        <label htmlFor="code" className="label">6 rəqəmli kod</label>
        <input
          id="code"
          className="field text-center text-[1.8rem] tracking-[.5em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
        {busy ? "Yoxlanılır…" : "Daxil ol"}
      </button>
      <button type="button" className="btn btn-secondary btn-block" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
        E-poçtu dəyiş
      </button>
    </form>
  );
}
