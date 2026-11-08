"use client";

import { useEffect, useRef, useState } from "react";
import { describeValue, type Category, type PreferenceKey, type Preferences } from "@sdk/schema";
import { api, usePrefs } from "@/components/PrefsProvider";

type Phase = "idle" | "listening" | "thinking" | "proposal" | "saved";

interface Proposal {
  patch: Partial<Preferences>;
  categories: Category[];
  summary: string;
  question: string | null;
  proposed: Preferences;
}

// Minimal typing for the Web Speech API recognition object.
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

const LANG: Record<string, string> = { az: "az-AZ", ru: "ru-RU", en: "en-US" };

function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Assistant({ sttMode, aiReady, autoStart }: { sttMode: "server" | "browser"; aiReady: boolean; autoStart: boolean }) {
  const { saved, setPreview, save, say, setSaved } = usePrefs();
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<{ said: string; question: string } | null>(null);
  const [previousPrefs, setPreviousPrefs] = useState<Preferences | null>(null);
  const rec = useRef<Recognition | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const finalText = useRef("");
  const started = useRef(false);

  useEffect(() => () => setPreview(null), [setPreview]);

  function fail(message: string) {
    setError(message);
    setPhase("idle");
    setPreview(null);
  }

  async function understand(text: string, viaVoice: boolean) {
    const t = text.trim();
    if (!t) return fail("Heç nə eşitmədim. Yenidən cəhd edin və bir az ucadan danışın.");
    setUsedVoice(viaVoice);
    setHeard(t);
    setPhase("thinking");
    setError(null);
    try {
      const r = await api<Proposal & { ignored: string[] }>("/api/assistant/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, previous: pendingQuestion }),
      });
      if (r.question) {
        // Too vague: ask one clarifying question instead of guessing.
        setPendingQuestion({ said: pendingQuestion ? `${pendingQuestion.said} / ${t}` : t, question: r.question });
        setPhase("idle");
        setTyped("");
        if (viaVoice || saved.tts) say(r.question).catch(() => {});
        return;
      }
      setPendingQuestion(null);
      setProposal(r);
      setPreview(r.proposed);
      setPhase("proposal");
      if (viaVoice || r.proposed.tts) say(r.summary).catch(() => {});
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
  }

  async function startListening() {
    setError(null);
    setHeard("");
    setProposal(null);
    setPreview(null);
    if (sttMode === "browser") {
      const Ctor = recognitionCtor();
      if (!Ctor) return fail("Bu brauzer səsli yazmanı dəstəkləmir. Chrome və ya Edge istifadə edin, ya da aşağıda yazın.");
      const r = new Ctor();
      r.lang = LANG[saved.language] ?? "az-AZ";
      r.interimResults = true;
      r.continuous = false;
      finalText.current = "";
      r.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        finalText.current = text;
        setHeard(text);
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") fail("Mikrofona icazə verilmədi. Brauzerdə mikrofon icazəsini açın.");
        else if (e.error === "no-speech") fail("Heç nə eşitmədim. Yenidən cəhd edin.");
        else if (e.error !== "aborted") fail(`Səs tanınmadı (${e.error}). Yenidən cəhd edin və ya yazın.`);
      };
      r.onend = () => {
        rec.current = null;
        if (finalText.current) void understand(finalText.current, true);
        else setPhase((p) => (p === "listening" ? "idle" : p));
      };
      rec.current = r;
      setPhase("listening");
      r.start();
      return;
    }
    // server mode: record and upload to the speech-to-text service
    if (!navigator.mediaDevices?.getUserMedia) return fail("Bu brauzer mikrofonu dəstəkləmir. Aşağıda yazın.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return fail("Mikrofona icazə verilmədi. Brauzerdə mikrofon icazəsini açın.");
    }
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      media.current = null;
      setPhase("thinking");
      const form = new FormData();
      const type = mr.mimeType || "audio/webm";
      form.append("audio", new Blob(chunks, { type }), type.includes("mp4") ? "speech.m4a" : "speech.webm");
      try {
        const { text } = await api<{ text: string }>("/api/assistant/transcribe", { method: "POST", body: form });
        await understand(text, true);
      } catch (e) {
        fail(e instanceof Error ? e.message : String(e));
      }
    };
    media.current = mr;
    mr.start();
    setPhase("listening");
  }

  function stopListening() {
    rec.current?.stop();
    media.current?.stop();
  }

  useEffect(() => {
    if (autoStart && !started.current && aiReady) {
      started.current = true;
      void startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, aiReady]);

  async function accept() {
    if (!proposal) return;
    setError(null);
    try {
      setPreviousPrefs(saved);
      const next = await save(proposal.patch);
      if (proposal.categories.length) {
        const me = await api<{ categories: Category[] }>("/api/me");
        const merged = [...new Set([...me.categories, ...proposal.categories])];
        await api("/api/me/categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categories: merged }) });
      }
      setSaved(next);
      setPreview(null);
      setPhase("saved");
      if (usedVoice || next.tts) say("Ayarlarınız yadda saxlanıldı.").catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function undo() {
    if (!previousPrefs) return;
    setError(null);
    try {
      const { preferences } = await api<{ preferences: Preferences }>("/api/me/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previousPrefs),
      });
      setSaved(preferences);
      setPreviousPrefs(null);
      setPhase("idle");
      setHeard("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function retry() {
    setPreview(null);
    setProposal(null);
    setHeard("");
    setPhase("idle");
  }

  if (!aiReady) {
    return (
      <p className="notice" role="status">
        Səsli köməkçi hələ qurulmayıb (AI açarı yoxdur). Ayarları əl ilə edə bilərsiniz.
      </p>
    );
  }

  const listening = phase === "listening";
  return (
    <section aria-label="Səsli köməkçi" className="stack">
      {phase !== "proposal" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={listening ? stopListening : startListening}
            disabled={phase === "thinking"}
            aria-pressed={listening}
            className={`grid h-48 w-48 place-items-center rounded-full text-white shadow-xl transition focus-visible:outline-[6px] ${
              listening ? "animate-pulse bg-[#b3261e]" : "bg-[var(--brand)] hover:bg-[var(--brand-dark)]"
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span aria-hidden className="text-[4rem] leading-none">{listening ? "⏹" : "🎤"}</span>
              <span className="text-[1.15rem] font-extrabold">{listening ? "Bitirdim" : phase === "thinking" ? "Anlayıram…" : "Danışın"}</span>
            </span>
          </button>
          <p aria-live="polite" className="min-h-[1.5em] text-center text-[1.1rem]">
            {listening ? "Dinləyirəm… danışın. Bitirəndə düyməyə yenidən basın." : phase === "thinking" ? "Dediklərinizi anlayıram…" : ""}
          </p>
          {heard && (
            <p className="card w-full">
              <span className="muted">Siz dediniz:</span> “{heard}”
            </p>
          )}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {pendingQuestion && phase !== "proposal" && (
        <div className="card stack !border-[var(--brand)]" style={{ borderWidth: 3 }} role="status" aria-live="polite">
          <p className="text-[1.25rem] font-bold">🤔 {pendingQuestion.question}</p>
          <p className="muted">Düyməyə basıb cavab verin və ya aşağıda yazın.</p>
          <button className="btn btn-secondary" onClick={() => setPendingQuestion(null)}>Sualı ləğv et</button>
        </div>
      )}

      {phase === "proposal" && proposal && (
        <div className="card stack !border-[var(--brand)]" style={{ borderWidth: 3 }} aria-live="polite">
          {heard && <p className="muted">Siz dediniz: “{heard}”</p>}
          <p className="text-[1.25rem] font-bold">{proposal.summary}</p>
          {Object.keys(proposal.patch).length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {Object.entries(proposal.patch).map(([k, v]) => (
                <li key={k} className="pill">{describeValue(k as PreferenceKey, v)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Heç bir ayar dəyişmədi.</p>
          )}
          <p className="muted">Ekran artıq yeni ayarlarla göstərilir. Bəyəndinizmi?</p>
          <div className="grid gap-3">
            {Object.keys(proposal.patch).length > 0 && (
              <button className="btn btn-primary btn-block text-[1.2rem]" onClick={accept}>✓ Bəli, saxla</button>
            )}
            <button className="btn btn-secondary btn-block" onClick={retry}>🎤 Yenidən de</button>
            <a className="btn btn-secondary btn-block" href="/ayarlar" onClick={() => setPreview(null)}>⚙️ Özüm dəyişim</a>
          </div>
        </div>
      )}

      {phase === "saved" && (
        <div className="stack">
          <p className="ok" role="status">✓ Ayarlarınız yadda saxlanıldı. Qoşulmuş bütün xidmətlərdə tətbiq olunacaq.</p>
          {previousPrefs && (
            <button className="btn btn-secondary btn-block" onClick={undo}>↩ Əvvəlki ayarlara qayıt</button>
          )}
        </div>
      )}

      {phase !== "proposal" && (
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            void understand(typed, false);
          }}
        >
          <label htmlFor="typed" className="label">⌨️ Və ya yazaraq deyin</label>
          <textarea
            id="typed"
            className="field min-h-[6rem]"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Məsələn: Səsləri yaxşı eşitmirəm, videolarda yazı olsun"
          />
          <button className="btn btn-primary btn-block" disabled={!typed.trim() || phase === "thinking"}>
            {phase === "thinking" ? "Anlayıram…" : "Göndər"}
          </button>
        </form>
      )}
    </section>
  );
}
