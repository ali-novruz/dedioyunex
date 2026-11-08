import "server-only";
import type { Language } from "@sdk/schema";
import { env } from "./env";
import { AiError } from "./ai";

// Browsers have no Azerbaijani voice. Azure has real neural ones.
const VOICE: Record<Language, { locale: string; name: string }> = {
  az: { locale: "az-AZ", name: "az-AZ-BanuNeural" },
  en: { locale: "en-GB", name: "en-GB-SoniaNeural" },
};

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function speechAvailable(): boolean {
  return !!env.speech;
}

export async function synthesize(text: string, language: Language, rate: number): Promise<ArrayBuffer> {
  const c = env.speech;
  if (!c) throw new AiError("Speech is not configured: set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION", 503);
  const v = VOICE[language];
  const percent = Math.round((rate - 1) * 100);
  const ssml = `<speak version="1.0" xml:lang="${v.locale}"><voice name="${v.name}"><prosody rate="${percent >= 0 ? "+" : ""}${percent}%">${escapeXml(text)}</prosody></voice></speak>`;
  const r = await fetch(`https://${c.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": c.key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "cizzy",
    },
    signal: AbortSignal.timeout(15_000),
    body: ssml,
  });
  if (!r.ok) throw new AiError(`Speech request failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  return r.arrayBuffer();
}
