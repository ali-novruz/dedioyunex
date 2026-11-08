"use client";

import { useEffect, useRef, useState } from "react";
import { describeValue, type Category, type PreferenceKey, type Preferences } from "@sdk/schema";
import { api, usePrefs } from "@/components/PrefsProvider";
import { Icon } from "@/components/Icons";
import { Window } from "@/components/Window";

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

const SPEECH_LANG = { az: "az-AZ", en: "en-US" } as const;

function recognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function Assistant({ sttMode, aiReady, autoStart }: { sttMode: "server" | "browser"; aiReady: boolean; autoStart: boolean }) {
  const { saved, setPreview, save, say, setSaved, l, lang } = usePrefs();
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
    if (!t) return fail(l("Heç nə eşitmədim. Yenidən cəhd edin və bir az ucadan danışın.", "I didn’t hear anything. Please try again and speak a little louder."));
    // Typing while a suggestion is on screen steers that suggestion instead of starting over.
    const steering = phase === "proposal" ? proposal : null;
    setUsedVoice(viaVoice);
    setHeard(t);
    setPhase("thinking");
    setError(null);
    try {
      const r = await api<Proposal & { ignored: string[] }>("/api/assistant/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, previous: pendingQuestion, draft: steering?.patch }),
      });
      setTyped("");
      if (r.question) {
        // Too vague: ask one clarifying question instead of guessing.
        setPendingQuestion({ said: pendingQuestion ? `${pendingQuestion.said} / ${t}` : t, question: r.question });
        setPhase(steering ? "proposal" : "idle");
        if (viaVoice || saved.tts) say(r.question).catch(() => {});
        return;
      }
      setPendingQuestion(null);
      setProposal(r);
      setPreview(r.proposed);
      setPhase("proposal");
      if (viaVoice || r.proposed.tts) say(r.summary).catch(() => {});
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (steering) {
        setError(message);
        setPhase("proposal");
      } else {
        fail(message);
      }
    }
  }

  async function startListening() {
    setError(null);
    setHeard("");
    setProposal(null);
    setPreview(null);
    const denied = l("Mikrofona icazə verilmədi. Brauzerdə mikrofon icazəsini açın.", "Microphone access was refused. Please allow the microphone in your browser.");
    if (sttMode === "browser") {
      const Ctor = recognitionCtor();
      if (!Ctor) return fail(l("Bu brauzer səsli yazmanı dəstəkləmir. Chrome və ya Edge istifadə edin, ya da aşağıda yazın.", "This browser does not support voice input. Use Chrome or Edge, or type below."));
      const r = new Ctor();
      r.lang = SPEECH_LANG[lang];
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
        if (e.error === "not-allowed" || e.error === "service-not-allowed") fail(denied);
        else if (e.error === "no-speech") fail(l("Heç nə eşitmədim. Yenidən cəhd edin.", "I didn’t hear anything. Please try again."));
        else if (e.error !== "aborted") fail(l(`Səs tanınmadı (${e.error}). Yenidən cəhd edin və ya yazın.`, `Could not recognise the speech (${e.error}). Try again or type.`));
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
    if (!navigator.mediaDevices?.getUserMedia) return fail(l("Bu brauzer mikrofonu dəstəkləmir. Aşağıda yazın.", "This browser does not support the microphone. Please type below."));
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return fail(denied);
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
      if (next.language !== lang) {
        window.location.reload();
        return;
      }
      setPhase("saved");
      if (usedVoice || next.tts) say(l("Ayarlarınız yadda saxlanıldı.", "Your settings have been saved.")).catch(() => {});
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
        {l("Səsli köməkçi hələ qurulmayıb (AI açarı yoxdur). Ayarları əl ilə edə bilərsiniz.", "The voice assistant is not set up yet (no AI key). You can change the settings by hand.")}
      </p>
    );
  }

  const listening = phase === "listening";
  const thinking = phase === "thinking";
  const steering = phase === "proposal";

  const typeBox = (
    <Window title={steering ? l("Düzəliş", "Adjust") : l("Yazaraq", "By typing")}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void understand(typed, false);
        }}
      >
        <label htmlFor="typed" className="label">
          {steering ? l("Dəyişmək istədiyinizi yazın", "Type what you want to change") : l("Yazaraq deyin", "Say it by typing")}
        </label>
        <textarea
          id="typed"
          className="field min-h-[5.5rem]"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={
            steering
              ? l("Məsələn: Yazıları bir az da böyüt", "For example: Make the text a little bigger")
              : l("Məsələn: Səsləri yaxşı eşitmirəm, videolarda yazı olsun", "For example: I can’t hear well, I want captions on videos")
          }
        />
        <button className={`btn btn-block ${steering ? "btn-secondary" : "btn-primary"}`} disabled={!typed.trim() || thinking}>
          {thinking ? l("Anlayıram…", "Thinking…") : steering ? l("Düzəlt", "Adjust") : l("Göndər", "Send")}
        </button>
      </form>
    </Window>
  );

  return (
    <section aria-label={l("Köməkçi", "Assistant")} className="stack">
      {phase !== "proposal" && (
        <div className="ask">
          <div className="ask-voice">
            <button onClick={listening ? stopListening : startListening} disabled={thinking} aria-pressed={listening} className="mic">
              <Icon name={listening ? "stop" : "mic"} />
              <span>{listening ? l("Bitirdim", "I’m done") : thinking ? l("Anlayıram…", "Thinking…") : l("Danışın", "Speak")}</span>
              {listening && <span className="level" aria-hidden><i /><i /><i /></span>}
            </button>
          </div>
          {typeBox}
        </div>
      )}

      <p aria-live="polite" className="text-center text-[1.1rem] font-medium empty:hidden">
        {listening ? l("Dinləyirəm… danışın. Bitirəndə düyməyə yenidən basın.", "I’m listening. Speak, then press the key again when you finish.") : thinking ? l("Dediklərinizi anlayıram…", "Working out what you said…") : ""}
      </p>

      {heard && phase !== "proposal" && (
        <p className="tag w-full">
          {l("Siz dediniz:", "You said:")} “{heard}”
        </p>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {pendingQuestion && !thinking && (
        <Window title={l("Köməkçi soruşur", "The assistant asks")}>
          <div className="stack" role="status" aria-live="polite">
            <p className="text-[1.25rem] font-semibold">{pendingQuestion.question}</p>
            <p className="muted">{l("Düyməyə basıb cavab verin və ya aşağıda yazın.", "Press the key to answer, or type below.")}</p>
            <button className="btn btn-secondary" onClick={() => setPendingQuestion(null)}>{l("Sualı ləğv et", "Cancel the question")}</button>
          </div>
        </Window>
      )}

      {phase === "proposal" && proposal && (
        <Window title={l("Təklif", "Suggestion")}>
          <div className="stack" aria-live="polite">
            {heard && <p className="muted">{l("Siz dediniz:", "You said:")} “{heard}”</p>}
            <p className="text-[1.25rem] font-semibold">{proposal.summary}</p>
            {Object.keys(proposal.patch).length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {Object.entries(proposal.patch).map(([k, v]) => (
                  <li key={k} className="tag">{describeValue(k as PreferenceKey, v, lang)}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">{l("Heç bir ayar dəyişmədi.", "No settings were changed.")}</p>
            )}
            <p className="muted">{l("Ekran artıq yeni ayarlarla göstərilir. Bəyəndinizmi?", "The screen already shows the new settings. Do you like it?")}</p>
            <div className="grid gap-4">
              {Object.keys(proposal.patch).length > 0 && (
                <button className="btn btn-primary btn-block text-[1.2rem]" onClick={accept}><Icon name="check" /> {l("Bəli, saxla", "Yes, save")}</button>
              )}
              <button className="btn btn-secondary btn-block" onClick={retry}><Icon name="mic" /> {l("Yenidən de", "Say it again")}</button>
              <a className="btn btn-secondary btn-block" href="/ayarlar" onClick={() => setPreview(null)}><Icon name="sliders" /> {l("Özüm dəyişim", "Change it myself")}</a>
            </div>
          </div>
        </Window>
      )}

      {phase === "saved" && (
        <div className="stack">
          <p className="ok" role="status">{l("Ayarlarınız yadda saxlanıldı. Qoşulmuş bütün xidmətlərdə tətbiq olunacaq.", "Your settings are saved. They will apply in every connected service.")}</p>
          {previousPrefs && (
            <button className="btn btn-secondary btn-block" onClick={undo}><Icon name="back" /> {l("Əvvəlki ayarlara qayıt", "Go back to my previous settings")}</button>
          )}
        </div>
      )}

      {phase === "proposal" && typeBox}
    </section>
  );
}
