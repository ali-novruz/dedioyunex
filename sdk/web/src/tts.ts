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

export async function pickVoice(language: string): Promise<{ voice: SpeechSynthesisVoice | null; info: VoiceInfo }> {
  const voices = await loadVoices();
  if (!synth()) return { voice: null, info: { available: false, lang: null, name: null, substitute: false } };
  const order = SUBSTITUTES[language] ?? [language];
  for (const code of order) {
    const v = voices.find((x) => x.lang.toLowerCase().startsWith(code)) ?? null;
    if (v) return { voice: v, info: { available: true, lang: v.lang, name: v.name, substitute: code !== language } };
  }
  return { voice: null, info: { available: false, lang: null, name: null, substitute: false } };
}

export async function voiceInfo(language: string): Promise<VoiceInfo> {
  return (await pickVoice(language)).info;
}

export async function speak(text: string, opts: { language: string; rate: number; onEnd?: () => void }): Promise<VoiceInfo> {
  const s = synth();
  const { voice, info } = await pickVoice(opts.language);
  if (!s || !voice) throw new Error(`No speech voice available for "${opts.language}"`);
  s.cancel();
  // Long texts are split into sentences: some engines stop after ~15 s of a single utterance.
  const chunks = text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*/g) ?? [text];
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = opts.rate;
    if (i === chunks.length - 1 && opts.onEnd) u.onend = () => opts.onEnd?.();
    s.speak(u);
  });
  return info;
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

export function isSpeechSupported(): boolean {
  return synth() !== null;
}
