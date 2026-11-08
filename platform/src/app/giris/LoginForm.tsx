"use client";

import { useState } from "react";
import { adoptLanguage, api, usePrefs } from "@/components/PrefsProvider";
import { Window } from "@/components/Window";

export function LoginForm({ next }: { next: string }) {
  const { l, lang } = usePrefs();
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
      if (!r.onboarded) await adoptLanguage(lang);
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
      <Window title={l("Addım 1 / 2", "Step 1 of 2")}>
        <form onSubmit={sendCode} className="stack">
          <div>
            <label htmlFor="email" className="label">{l("E-poçt ünvanınız", "Your e-mail address")}</label>
            <input
              id="email"
              className="field"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={l("nümunə@mail.az", "name@example.com")}
            />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? l("Göndərilir…", "Sending…") : l("Kodu göndər", "Send the code")}
          </button>
        </form>
      </Window>
    );
  }

  return (
    <Window title={l("Addım 2 / 2", "Step 2 of 2")}>
      <form onSubmit={verify} className="stack">
        <p>
          {l("Kod bu ünvana göndərildi:", "We sent the code to:")} <b>{email}</b>
        </p>
        {demoCode && (
          <p className="notice" role="status">
            <b>{l("Demo rejimi:", "Demo mode:")}</b> {l("e-poçt göndərilmir. Kodunuz:", "no e-mail is sent. Your code:")}{" "}
            <b className="text-[1.4rem] tracking-[.3em]">{demoCode}</b>
          </p>
        )}
        <div>
          <label htmlFor="code" className="label">{l("6 rəqəmli kod", "6-digit code")}</label>
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
          {busy ? l("Yoxlanılır…", "Checking…") : l("Daxil ol", "Sign in")}
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
          {l("E-poçtu dəyiş", "Change e-mail")}
        </button>
      </form>
    </Window>
  );
}
