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
  const ext = audio.type.includes("mp4") || audio.type.includes("m4a") ? "m4a" : audio.type.includes("ogg") ? "ogg" : audio.type.includes("wav") ? "wav" : "webm";
  form.append("file", audio, `speech.${ext}`);
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
- If the request is too vague to pick settings safely (e.g. only "kömək edin", "pisdir", "bilmirəm"), do NOT guess:
  return an empty patch and ONE short, simple clarifying question in Azerbaijani in "question" (e.g. "Sizə nə çətindir: yazıları oxumaq, səsləri eşitmək, yoxsa düymələrə toxunmaq?").
  Statements like "gözüm zəif görür" or "yazılar xırdadır" are clear enough — act on them.

Reply with ONLY a JSON object:
{"patch": {<key>: <value>, ...}, "categories": [<category ids that match the user's difficulties>], "summary": "<1–2 short, warm sentences in Azerbaijani, addressing the user as 'Siz', saying in plain words what you changed; empty string if you ask a question>", "question": "<clarifying question or empty string>"}`;

export interface Interpretation {
  patch: Partial<Omit<Preferences, "version">>;
  categories: Category[];
  summary: string;
  question: string | null;
  ignored: string[];
}

export interface Turn {
  said: string;
  question: string;
}

export async function interpret(text: string, current: Preferences, previous: Turn | null = null): Promise<Interpretation> {
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
        ...(previous
          ? [
              { role: "user", content: `Current settings: ${JSON.stringify(current)}\n\nUser said: """${previous.said.slice(0, 1000)}"""` },
              { role: "assistant", content: JSON.stringify({ patch: {}, categories: [], summary: "", question: previous.question.slice(0, 300) }) },
              { role: "user", content: `User answered: """${input}"""` },
            ]
          : [{ role: "user", content: `Current settings: ${JSON.stringify(current)}\n\nUser said: """${input}"""` }]),
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
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const q = (raw as { question?: unknown }).question;
  const question = typeof q === "string" && q.trim() ? q.trim() : null;
  if (question && Object.keys(patch).length === 0) return { patch: {}, categories, summary: "", question, ignored };
  if (!summary) throw new AiError("AI did not return a summary");
  return { patch: patch as Interpretation["patch"], categories, summary, question: null, ignored };
}

// ---------------------------------------------------------------------------
// Page explainer: makes any partner page understandable (summary, simple headline, what each control does).

export interface PageAction {
  id: string;
  label: string;
  kind: string; // "button" | "link" | "input" | ...
  hint?: string; // title / aria-label / href path, to help guess hidden functions
}

export interface PageInput {
  url: string;
  title: string;
  headings: string[];
  text: string;
  actions: PageAction[];
  language: string;
}

export interface PageHelp {
  headline: string;
  summary: string;
  points: string[];
  actions: { id: string; explain: string }[];
}

const LANG_NAME: Record<string, string> = { az: "Azerbaijani", ru: "Russian", en: "English" };

const ASSIST_SYSTEM = (lang: string) => `MENE_UYGUN_PAGE_HELP
You explain a web page to an elderly person or a person with cognitive or reading difficulties.
Write ONLY in ${LANG_NAME[lang] ?? "Azerbaijani"}, with very simple everyday words, short sentences, no jargon, address the user politely.
From the page title, headings, text and list of interactive controls, return ONLY a JSON object:
{"headline": "<what this page is about, max 12 words>",
 "summary": "<2-3 short sentences: the main message / what the user can do here>",
 "points": ["<max 4 key facts, each max 12 words>"],
 "actions": [{"id": "<id from the list>", "explain": "<what happens if the user presses/uses it, max 15 words>"}]}
Rules: explain at most 12 of the most useful actions, most important first; include controls whose purpose is not obvious from their label (icons, symbols, abbreviations).
Do not invent facts that are not on the page. Never ask for or repeat passwords, card numbers or personal data.`;

export async function assistPage(input: PageInput): Promise<PageHelp> {
  const c = config();
  if (!c.chatModel) throw new AiError("AI_CHAT_MODEL is not set", 503);
  const actions = input.actions.map((a) => `${a.id} | ${a.kind} | ${a.label}${a.hint ? ` | ${a.hint}` : ""}`).join("\n");
  const user = `URL: ${input.url}\nTitle: ${input.title}\nHeadings:\n${input.headings.join("\n")}\n\nText:\n${input.text}\n\nControls (id | kind | label | hint):\n${actions}`;
  const r = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: c.chatModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ASSIST_SYSTEM(input.language) },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new AiError(`AI request failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const body = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new AiError("AI returned an empty answer");
  return parsePageHelp(content, new Set(input.actions.map((a) => a.id)));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parsePageHelp(content: string, knownIds: Set<string>): PageHelp {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new AiError(`AI returned invalid JSON: ${content.slice(0, 200)}`);
  }
  const headline = str(raw.headline, 200);
  const summary = str(raw.summary, 800);
  if (!headline || !summary) throw new AiError("AI answer is missing headline or summary");
  const points = Array.isArray(raw.points) ? raw.points.map((p) => str(p, 200)).filter(Boolean).slice(0, 4) : [];
  const actions = Array.isArray(raw.actions)
    ? (raw.actions as Record<string, unknown>[])
        .map((a) => ({ id: str(a?.id, 20), explain: str(a?.explain, 200) }))
        .filter((a) => knownIds.has(a.id) && a.explain) // only ids that exist on the page
        .slice(0, 12)
    : [];
  return { headline, summary, points, actions };
}
