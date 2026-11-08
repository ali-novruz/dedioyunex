// Text-to-speech via the browser's Web Speech API.
// Azerbaijani voices are rare in browsers; when no "az" voice exists we use a Turkish voice
// (closest intelligible language) and report it through `voiceInfo()` so the UI can say so.

export interface VoiceInfo {
  available: boolean;
  lang: string | null;
  name: string | null;
  substitute: boolean; // true when the requested language had no voice and a substitute is used
}

const SUBSTITUTES: Record<string, string[]> = { az: ["az", "tr"], en: ["en"] };

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  const now = s.getVoices();
  if (now.length) return Promise.resolve(now);
  // Voices load asynchronously in some browsers; wait once, never cache an empty list.
  return new Promise((resolve) => {
    const done = () => resolve(s.getVoices());
    s.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

/** A server voice for languages browsers cannot speak. Registered by whoever knows how to reach the server. */
export interface CloudVoice {
  check(): Promise<boolean>;
  speak(text: string, rate: number): Promise<Blob>;
}

let cloud: CloudVoice | null = null;
let cloudReady: Promise<boolean> | null = null;
let audio: HTMLAudioElement | null = null;
let playTurn = 0;

export function setCloudVoice(voice: CloudVoice | null): void {
  cloud = voice;
  cloudReady = null;
}

function useCloud(language: string): Promise<boolean> {
  if (language !== "az" || !cloud) return Promise.resolve(false);
  cloudReady ??= cloud.check().catch((e) => {
    console.warn("[speech] could not reach the Azerbaijani voice", e);
    return false;
  });
  return cloudReady;
}

const play = (blob: Blob, turn: number) =>
  new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    audio = a;
    a.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onerror = () => reject(new Error("audio playback failed"));
    if (turn === playTurn) a.play().catch(reject);
  });

/** Groups sentences into requests of at most ~800 characters. */
function groupForCloud(chunks: string[]): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    if (out.length && out[out.length - 1].length + c.length < 800) out[out.length - 1] += " " + c;
    else out.push(c);
  }
  return out;
}

/** Online and neural voices sound far better than the old local ones. */
function quality(v: SpeechSynthesisVoice): number {
  return (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);
}

export async function pickVoice(language: string): Promise<{ voice: SpeechSynthesisVoice | null; info: VoiceInfo }> {
  const voices = await loadVoices();
  if (!synth()) return { voice: null, info: { available: false, lang: null, name: null, substitute: false } };
  const order = SUBSTITUTES[language] ?? [language];
  for (const code of order) {
    const v = voices.filter((x) => x.lang.toLowerCase().replace("_", "-").startsWith(code)).sort((a, b) => quality(b) - quality(a))[0] ?? null;
    if (v) return { voice: v, info: { available: true, lang: v.lang, name: v.name, substitute: code !== language } };
  }
  return { voice: null, info: { available: false, lang: null, name: null, substitute: false } };
}

/** Azerbaijani spelled so a Turkish voice pronounces it: Turkish has no ə, x or q and would skip or spell them out. */
export function forTurkishVoice(text: string): string {
  return text
    .replace(/q(?!\p{L})/gu, "k")
    .replace(/Q(?!\p{L})/gu, "K")
    .replace(/ə/g, "e")
    .replace(/Ə/g, "E")
    .replace(/x/g, "h")
    .replace(/X/g, "H")
    .replace(/q/g, "g")
    .replace(/Q/g, "G");
}

const MAX_CHUNK = 180;

/** Splits on sentence ends (not inside numbers like 15.30), then long sentences on commas and spaces. Some engines stop on long utterances. */
export function splitForSpeech(text: string): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?…:;])\s+/).filter(Boolean);
  const out: string[] = [];
  for (const sentence of sentences) {
    let rest = sentence;
    while (rest.length > MAX_CHUNK) {
      const head = rest.slice(0, MAX_CHUNK);
      const cut = Math.max(head.lastIndexOf(", "), head.lastIndexOf(" "));
      const at = cut > 40 ? cut + 1 : MAX_CHUNK;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

export async function voiceInfo(language: string): Promise<VoiceInfo> {
  if (await useCloud(language)) return { available: true, lang: "az-AZ", name: "Azerbaijani neural voice", substitute: false };
  return (await pickVoice(language)).info;
}

export async function speak(text: string, opts: { language: string; rate: number; pitch?: number; volume?: number; onEnd?: () => void; onError?: (reason: string) => void }): Promise<VoiceInfo> {
  const engine = synth();
  const wasBusy = !!engine && (engine.speaking || engine.pending);
  stopSpeaking();
  if (await useCloud(opts.language)) {
    const parts = groupForCloud(splitForSpeech(text));
    const turn = playTurn;
    try {
      let next: Promise<Blob> | null = cloud!.speak(parts[0] ?? "", opts.rate);
      await next; // the first part decides: if it fails, the browser voice below takes over
      void (async () => {
        for (let i = 0; i < parts.length && turn === playTurn; i++) {
          const blob: Blob = await next!;
          next = i + 1 < parts.length ? cloud!.speak(parts[i + 1], opts.rate) : null;
          await play(blob, turn);
        }
        if (turn === playTurn) opts.onEnd?.();
      })().catch((e) => {
        console.error("[speech] playback failed", e);
        opts.onError?.(String(e));
      });
      return { available: true, lang: "az-AZ", name: "Azerbaijani neural voice", substitute: false };
    } catch (e) {
      console.warn("[speech] Azerbaijani voice failed, using the browser voice", e);
    }
  }
  const s = synth();
  const { voice, info } = await pickVoice(opts.language);
  if (!s || !voice) throw new Error(`No speech voice available for "${opts.language}"`);
  // Chrome drops utterances queued in the same tick as cancel().
  if (wasBusy) await new Promise((resolve) => setTimeout(resolve, 120));
  const spoken = info.substitute && opts.language === "az" ? forTurkishVoice(text) : text;
  const chunks = splitForSpeech(spoken);
  if (chunks.length === 0) {
    opts.onEnd?.();
    return info;
  }
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate;
    u.pitch = opts.pitch ?? 1;
    u.volume = opts.volume ?? 1;
    u.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") opts.onError?.(e.error);
    };
    if (i === chunks.length - 1 && opts.onEnd) u.onend = () => opts.onEnd?.();
    s.speak(u);
  });
  return info;
}

export function stopSpeaking(): void {
  playTurn++;
  audio?.pause();
  audio = null;
  synth()?.cancel();
}

export function isSpeechSupported(): boolean {
  return synth() !== null;
}
