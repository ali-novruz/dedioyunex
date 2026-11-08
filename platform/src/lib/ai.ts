import "server-only";
import { CATEGORIES, SETTINGS, isCategory, validatePatch, type Category, type Preferences, PreferenceError } from "@sdk/schema";
import { env } from "./env";

export class AiError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}

function config() {
  const c = env.ai;
  if (!c.baseUrl || !c.apiKey) throw new AiError("AI is not configured: set AI_BASE_URL and AI_API_KEY", 503);
  return c;
}

/** Speech → text with an OpenAI-compatible /audio/transcriptions endpoint (e.g. Groq Whisper). */
export async function transcribe(audio: Blob, language: string): Promise<string> {
  const c = config();
  if (!c.sttModel) throw new AiError("AI_STT_MODEL is not set", 503);
  const form = new FormData();
  form.append("file", audio, "speech.webm");
  form.append("model", c.sttModel);
  form.append("language", language);
  form.append("response_format", "json");
  const r = await fetch(`${c.baseUrl}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${c.apiKey}` }, body: form });
  if (!r.ok) throw new AiError(`Transcription failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const body = (await r.json()) as { text?: string };
  return (body.text ?? "").trim();
}

function catalogue(): string {
  return SETTINGS.map((s) => {
    const values = s.control === "toggle" ? "true | false" : s.options.map((o) => `${JSON.stringify(o.value)} (${o.label})`).join(" | ");
    return `- ${s.key}: ${s.label} — ${s.help}. Values: ${values}`;
  }).join("\n");
}

const SYSTEM = () => `You configure accessibility settings for "MƏNƏ UYĞUN", a service used by elderly people and people with vision, hearing, motor, cognitive or reading difficulties.
The user describes in their own words (Azerbaijani, Turkish, Russian or English; may be informal, with speech-recognition errors) what is hard for them or what they want.
Choose the settings that help. Only use the keys and values below.

Settings:
${catalogue()}

Need categories (ids): ${CATEGORIES.map((c) => `${c.id} (${c.label})`).join(", ")}

Rules:
- Change only what the user's words justify. Relative requests ("daha böyük", "bir az kiçik") move one step from the current value.
- "Yazılar xırdadır / görə bilmirəm" → bigger fontScale (at least 1.5 if strong), maybe contrast high, strongFocus, largeTargets.
- Hearing problems → captions, visualAlerts, transcripts. Confusion with complex screens → simpleMode, hideDistractions, confirmActions, iconLabels, stepByStep, plainLanguage.
- Shaking hands / hard to tap → largeTargets, extendedTimeouts, noDrag. Reading difficulty / dyslexia → dyslexiaFont, lineSpacing, readingRuler, tts.
- If the user asks to read aloud / can't read → tts true.
- If the user wants to undo everything ("hamısını sıfırla"), set every changed key back to its normal value.
- Never invent keys. If nothing applies, return an empty patch and explain kindly.

Reply with ONLY a JSON object:
{"patch": {<key>: <value>, ...}, "categories": [<category ids that match the user's difficulties>], "summary": "<1–2 short, warm sentences in Azerbaijani, addressing the user as 'Siz', saying in plain words what you changed>"}`;

export interface Interpretation {
  patch: Partial<Omit<Preferences, "version">>;
  categories: Category[];
  summary: string;
  ignored: string[];
}

export async function interpret(text: string, current: Preferences): Promise<Interpretation> {
  const c = config();
  if (!c.chatModel) throw new AiError("AI_CHAT_MODEL is not set", 503);
  const input = text.trim();
  if (!input) throw new AiError("Mətn boşdur", 400);
  if (input.length > 2000) throw new AiError("Mətn çox uzundur", 400);

  const r = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: c.chatModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM() },
        { role: "user", content: `Current settings: ${JSON.stringify(current)}\n\nUser said: """${input}"""` },
      ],
    }),
  });
  if (!r.ok) throw new AiError(`AI request failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const body = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new AiError("AI returned an empty answer");
  return parseInterpretation(content);
}

/** Validates the model output. Invalid entries are dropped and reported in `ignored` (and logged). */
export function parseInterpretation(content: string): Interpretation {
  let raw: { patch?: unknown; categories?: unknown; summary?: unknown };
  try {
    raw = JSON.parse(content);
  } catch {
    throw new AiError(`AI returned invalid JSON: ${content.slice(0, 200)}`);
  }
  const patch: Record<string, unknown> = {};
  const ignored: string[] = [];
  if (raw.patch && typeof raw.patch === "object" && !Array.isArray(raw.patch)) {
    for (const [k, v] of Object.entries(raw.patch)) {
      try {
        Object.assign(patch, validatePatch({ [k]: v }));
      } catch (e) {
        if (!(e instanceof PreferenceError)) throw e;
        ignored.push(`${k}=${JSON.stringify(v)}`);
      }
    }
  }
  if (ignored.length) console.warn("[ai] ignored invalid suggestions:", ignored.join(", "));
  const categories = Array.isArray(raw.categories) ? [...new Set(raw.categories.filter(isCategory))] : [];
  const summary = typeof raw.summary === "string" && raw.summary.trim() ? raw.summary.trim() : "";
  if (!summary) throw new AiError("AI did not return a summary");
  return { patch: patch as Interpretation["patch"], categories, summary, ignored };
}
