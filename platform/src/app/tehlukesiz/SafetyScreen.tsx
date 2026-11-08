"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";
import { Window } from "@/components/Window";
import { LOCALE } from "@/lib/lang";

interface Contact {
  name: string;
  phone: string;
}

export function SafetyScreen({ signedIn, safeUntil, contact: initialContact }: { signedIn: boolean; safeUntil: number | null; contact: Contact | null }) {
  const { l, lang, say } = usePrefs();
  const [until, setUntil] = useState(safeUntil);
  const [contact, setContact] = useState(initialContact);
  const [emailed, setEmailed] = useState(false);
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<{ verdict: string; explain: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const advice = [
    l("Telefonu indi bağlayın.", "Hang up the phone now."),
    l("Heç kimə kod, kart nömrəsi, CVV və ya şifrə deməyin.", "Do not give anyone a code, card number, CVV or password."),
    l("Heç bir bank və ya dövlət qurumu bunları telefonla istəmir.", "No bank or government office asks for these by phone."),
    l("Heç bir linkə basmayın, pul köçürməyin.", "Do not press any link or transfer money."),
  ];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(`${l("Bu fırıldaqdır. Heç nə göndərməyin.", "This is a scam. Do not send anything.")} ${advice.join(" ")}`).catch((e) => console.warn("[safety] could not read aloud", e));
    if (!signedIn || safeUntil) return;
    api<{ until: number; emailed: boolean; contact: Contact | null }>("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) })
      .then((r) => {
        setUntil(r.until);
        setEmailed(r.emailed);
        setContact(r.contact);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message = l("Cizzy: Kimsə mənə zəng edib kod və ya pul istəyir. Zəhmət olmasa mənə zəng edin.", "Cizzy: Someone phoned me asking for a code or money. Please call me.");
  const digits = contact?.phone.replace(/[^0-9]/g, "") ?? "";

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ verdict: string; explain: string }>("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check", text }) });
      setVerdict(r);
      say(r.explain).catch((err) => console.warn("[safety] could not read aloud", err));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!window.confirm(l("Təhlükə həqiqətən keçdi? Kimsə sizdən bunu etməyinizi istəmir ki?", "Is the danger really over? Nobody is telling you to do this?"))) return;
    setError(null);
    try {
      await api("/api/safety", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "end" }) });
      window.location.href = "/ev";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="stack">
      <Window title={l("İndi nə edim?", "What should I do now?")}>
        <ol className="rows">
          {advice.map((a, i) => (
            <li key={a} className="step">
              <span className="step-n" aria-hidden>{i + 1}</span>
              <p className="text-[1.2rem] font-semibold">{a}</p>
            </li>
          ))}
        </ol>
      </Window>

      {error && <p className="error" role="alert">{error}</p>}

      {signedIn && until && (
        <p className="ok" role="status">
          {l("Təhlükəsiz rejim açıqdır. Qoşulmuş saytlarda ödənişlər əlavə yoxlama ilə olacaq. Bitmə vaxtı:", "Safe mode is on. Payments on connected sites will have extra checks. Ends:")}{" "}
          {new Date(until).toLocaleString(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" })}
        </p>
      )}

      {signedIn && (
        <Window title={l("Etibarlı şəxs", "Trusted person")}>
          {contact ? (
            <div className="stack">
              {emailed && <p className="ok">{l(`${contact.name} e-poçtla xəbərdar edildi.`, `${contact.name} was told by e-mail.`)}</p>}
              <a className="btn btn-primary btn-block text-[1.2rem]" href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`}>{l(`${contact.name} adlı şəxsə zəng et`, `Call ${contact.name}`)}</a>
              <a className="btn btn-secondary btn-block" href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">{l("WhatsApp ilə xəbər ver", "Tell them on WhatsApp")}</a>
              <a className="btn btn-secondary btn-block" href={`sms:${contact.phone.replace(/[^+0-9]/g, "")}?body=${encodeURIComponent(message)}`}>{l("SMS ilə xəbər ver", "Tell them by SMS")}</a>
            </div>
          ) : (
            <div className="stack">
              <p>{l("Etibar etdiyiniz bir nəfəri əlavə etsəniz, bir toxunuşla xəbər verə bilərsiniz.", "Add someone you trust and you can tell them with one tap.")}</p>
              <Link className="btn btn-secondary btn-block" href="/xidmetler">{l("Etibarlı şəxs əlavə et", "Add a trusted person")}</Link>
            </div>
          )}
        </Window>
      )}

      {signedIn && (
        <Window title={l("Yoxla", "Check")}>
          <form onSubmit={check} className="stack">
            <label htmlFor="said" className="label">{l("Sizə nə dedilər və ya yazdılar?", "What did they say or write?")}</label>
            <textarea id="said" className="field min-h-[5rem]" value={text} onChange={(e) => setText(e.target.value)} placeholder={l("Məsələn: Bankdan zəng edirik, kartınız bloklanıb, SMS kodunu deyin", "For example: We are calling from the bank, your card is blocked, tell us the SMS code")} />
            <button className="btn btn-primary btn-block" disabled={busy || !text.trim()}>{busy ? l("Yoxlanılır…", "Checking…") : l("Yoxla", "Check")}</button>
            {verdict && <p className={verdict.verdict === "safe" ? "notice" : "error"} role="status">{verdict.explain}</p>}
            <p className="muted text-[.95rem]">{l("Bu, AI məsləhətidir. Şübhə varsa, heç nə göndərməyin.", "This is AI advice. If in doubt, send nothing.")}</p>
          </form>
        </Window>
      )}

      {!signedIn && (
        <Link className="btn btn-secondary btn-block" href="/">{l("Əsas səhifəyə qayıt", "Back to the main page")}</Link>
      )}

      {signedIn && until && (
        <button className="btn btn-secondary btn-block" onClick={end}><Icon name="check" /> {l("Təhlükə keçdi, qorumanı bitir", "The danger is over, end protection")}</button>
      )}
    </div>
  );
}
