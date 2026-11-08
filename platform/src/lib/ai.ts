import "server-only";
import { CATEGORIES, SETTINGS, isCategory, optionLabel, settingHelp, validatePatch, type Category, type Language, type Preferences, PreferenceError } from "@sdk/schema";
import { env } from "./env";

const LANG_NAME: Record<Language, string> = { az: "Azerbaijani", en: "English" };

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
// Biases Whisper toward correct Azerbaijani spelling and the vocabulary of this product.
const STT_PROMPT: Record<string, string> = {
  az: "Yazılar xırdadır, gözüm zəif görür. Səsləri eşitmirəm. Əllərim əsir, düymələrə toxuna bilmirəm. Menyular qarışıqdır, nə edəcəyimi unuduram. Sadə rejim olsun.",
  en: "The text is too small, I can't see well. I can't hear sounds. My hands shake. The menus are confusing.",
};

// Whisper learned from subtitled videos: on silence or noise it writes their closing lines. Confidence scores do not reveal it.
// [iİ]: the i flag does not fold the Turkic dotted capital.
const STT_HALLUCINATION = /[iİ]zl[əe]diyiniz üçün|izlediğiniz için|abun[əe] ol|thanks for watching|thank you for watching|subtitles? by|amara\.org|altyaz[ıi]/i;

export async function transcribe(audio: Blob, language: string): Promise<string> {
  const c = config();
  if (!c.sttModel) throw new AiError("AI_STT_MODEL is not set", 503);
  const form = new FormData();
  const ext = audio.type.includes("mp4") || audio.type.includes("m4a") ? "m4a" : audio.type.includes("ogg") ? "ogg" : audio.type.includes("wav") ? "wav" : "webm";
  form.append("file", audio, `speech.${ext}`);
  form.append("model", c.sttModel);
  form.append("language", language);
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (STT_PROMPT[language]) form.append("prompt", STT_PROMPT[language]);
  const r = await fetch(`${c.baseUrl}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${c.apiKey}` }, body: form });
  if (!r.ok) throw new AiError(`Transcription failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const body = (await r.json()) as { text?: string };
  const text = (body.text ?? "").trim();
  if (text.length < 90 && STT_HALLUCINATION.test(text)) {
    console.warn("[stt] discarded a transcript invented from silence:", text);
    return "";
  }
  return text;
}

// ---------------------------------------------------------------------------
// One way to ask the model for JSON. Free-tier limits are small and shared, so an answer must survive a busy model.

interface Msg {
  role: "system" | "user" | "assistant";
  content: string;
}

/** The model is busy or gave an unusable answer: worth trying again or on the backup model. */
class AiBusy extends AiError {
  constructor(message: string, readonly retryAfter: number | null = null) {
    super(message);
  }
}

const ATTEMPT_TIMEOUT_MS = 20_000;
const MAX_WAIT_S = 8;

async function callModel(model: string, messages: Msg[], temperature: number, maxTokens: number): Promise<string> {
  const c = config();
  // gpt-oss models spend output tokens on hidden reasoning before the answer.
  const reasons = model.startsWith("openai/gpt-oss");
  let r: Response;
  try {
    r = await fetch(`${c.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: reasons ? maxTokens + 700 : maxTokens,
        response_format: { type: "json_object" },
        ...(reasons ? { reasoning_effort: "low" } : {}),
        messages,
      }),
    });
  } catch (e) {
    throw new AiBusy(`${model}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    const wait = Number(r.headers.get("retry-after"));
    const message = `AI request failed (${r.status}, ${model}): ${detail}`;
    if (r.status === 429 || r.status >= 500 || detail.includes("json_validate_failed") || detail.includes("failed_generation")) {
      throw new AiBusy(message, Number.isFinite(wait) && wait > 0 ? wait : null);
    }
    throw new AiError(message);
  }
  const body = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new AiBusy(`${model} returned an empty answer`);
  return content;
}

/** Main model, then the backup model, then one short wait when the provider says how long. */
async function askJson<T>(messages: Msg[], temperature: number, maxTokens: number, parse: (content: string) => T): Promise<T> {
  const c = config();
  if (!c.chatModel) throw new AiError("AI_CHAT_MODEL is not set", 503);
  const models = c.backupModel ? [c.chatModel, c.backupModel] : [c.chatModel];
  let last: AiError | null = null;
  let wait: number | null = null;
  const attempt = async (model: string, isBackup: boolean): Promise<{ value: T } | null> => {
    try {
      const value = parse(await callModel(model, messages, temperature, maxTokens));
      if (isBackup) console.warn(`[ai] answered by backup model ${model} because: ${last?.message.slice(0, 160)}`);
      return { value };
    } catch (e) {
      if (!(e instanceof AiError)) throw e;
      last = e;
      if (e instanceof AiBusy && e.retryAfter !== null) wait = e.retryAfter;
      console.warn(`[ai] ${model} failed: ${e.message.slice(0, 200)}`);
      return null;
    }
  };
  for (const [i, model] of models.entries()) {
    const got = await attempt(model, i > 0);
    if (got) return got.value;
  }
  if (wait !== null && wait <= MAX_WAIT_S) {
    await new Promise((resolve) => setTimeout(resolve, wait! * 1000 + 250));
    const got = await attempt(c.chatModel, false);
    if (got) return got.value;
  }
  throw last ?? new AiError("AI gave no answer");
}

function catalogue(): string {
  return SETTINGS.map((s) => {
    const values =
      s.control === "toggle" ? "true|false" : s.control === "color" ? '"default" or #rrggbb' : s.options.map((o) => `${JSON.stringify(o.value)} (${optionLabel(s, o.value, "en")})`).join("|");
    return `- ${s.key}: ${settingHelp(s, "en")}. ${values}`;
  }).join("\n");
}

const QUESTION_EXAMPLE: Record<Language, string> = {
  az: "Sizə nə çətindir: yazıları oxumaq, səsləri eşitmək, yoxsa düymələrə toxunmaq?",
  en: "What is hard for you: reading text, hearing sounds, or tapping buttons?",
};

const SYSTEM = (lang: Language) => `You configure accessibility settings for "MƏNƏ UYĞUN", a service used by elderly people and people with vision, hearing, motor, cognitive or reading difficulties.
The user describes in their own words (Azerbaijani, Turkish or English; may be informal, with speech-recognition errors) what is hard for them or what they want.
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
- Light hurts, migraine → brightness, warmth. Flashing, epilepsy → flashGuard, reduceMotion, stopAutoplay. Cannot focus, ADHD → focusMode, hideDistractions. Noise bothers, autism → muteAudio, stopAutoplay, saturation. Shaking, Parkinson → clickGuard, largeTargets. One hand → handedness, largeTargets. Memory, dementia → simpleMode, stepByStep, confirmActions. Dyslexia → dyslexiaFont, wordSpacing, textAlign. Colours by name ("sarı fon") → backgroundColor, textColor, etc. as #rrggbb; keep text readable against its background.
- If the user wants to undo everything ("hamısını sıfırla"), set every changed key back to its normal value.
- Never invent keys. If the words are not about a difficulty or a setting (greetings, thanks, unrelated talk, speech-recognition noise), do not guess: return an empty patch and ONE short question asking what is hard for them.
- If the request is too vague to pick settings safely (e.g. only "kömək edin", "pisdir", "bilmirəm"), do NOT guess:
  return an empty patch and ONE short, simple clarifying question in ${LANG_NAME[lang]} in "question" (e.g. "${QUESTION_EXAMPLE[lang]}").
  Statements like "gözüm zəif görür" or "yazılar xırdadır" are clear enough — act on them.

Reply with ONLY a JSON object:
{"patch": {<key>: <value>, ...}, "categories": [<category ids that match the user's difficulties>], "summary": "<1–2 short, warm sentences in ${LANG_NAME[lang]}, addressing the user politely, saying in plain words what you changed; empty string if you ask a question>", "question": "<clarifying question or empty string>"}`;

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
  const input = text.trim();
  if (!input) throw new AiError("Empty text", 400);
  if (input.length > 2000) throw new AiError("Text too long", 400);

  const messages: Msg[] = [
    { role: "system", content: SYSTEM(current.language) },
    ...(previous
      ? ([
          { role: "user", content: `Current settings: ${JSON.stringify(current)}\n\nUser said: """${previous.said.slice(0, 1000)}"""` },
          { role: "assistant", content: JSON.stringify({ patch: {}, categories: [], summary: "", question: previous.question.slice(0, 300) }) },
          { role: "user", content: `User answered: """${input}"""` },
        ] satisfies Msg[])
      : ([{ role: "user", content: `Current settings: ${JSON.stringify(current)}\n\nUser said: """${input}"""` }] satisfies Msg[])),
  ];
  return askJson(messages, 0.1, 450, parseInterpretation);
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
  language: Language;
}

export interface PageHelp {
  headline: string;
  summary: string;
  points: string[];
  actions: { id: string; explain: string }[];
}


const ASSIST_SYSTEM = (lang: Language) => `MENE_UYGUN_PAGE_HELP
You explain a web page to an elderly person or a person with cognitive or reading difficulties.
Write ONLY in ${LANG_NAME[lang]}, with very simple everyday words, short sentences, no jargon, address the user politely.
From the page title, headings, text and list of interactive controls, return ONLY a JSON object:
{"headline": "<what this page is about, max 12 words>",
 "summary": "<2-3 short sentences: the main message / what the user can do here>",
 "points": ["<max 3 key facts, each max 10 words>"],
 "actions": [{"id": "<id from the list>", "explain": "<what happens if the user presses/uses it, max 12 words>"}]}
Rules: explain at most 6 of the most useful actions, most important first; prefer controls whose purpose is not obvious from their label (icons, symbols, abbreviations).
Do not invent facts that are not on the page. Never ask for or repeat passwords, card numbers or personal data.`;

export async function assistPage(input: PageInput): Promise<PageHelp> {
  const actions = input.actions.map((a) => `${a.id} | ${a.kind} | ${a.label}${a.hint ? ` | ${a.hint}` : ""}`).join("\n");
  const user = `URL: ${input.url}\nTitle: ${input.title}\nHeadings:\n${input.headings.join("\n")}\n\nText:\n${input.text}\n\nControls (id | kind | label | hint):\n${actions}`;
  const known = new Set(input.actions.map((a) => a.id));
  return askJson(
    [
      { role: "system", content: ASSIST_SYSTEM(input.language) },
      { role: "user", content: user },
    ],
    0.2,
    650,
    (content) => parsePageHelp(content, known),
  );
}

export interface ControlInput {
  title: string;
  headings: string[];
  text: string;
  control: { label: string; kind: string; hint?: string };
  language: Language;
}

const CONTROL_SYSTEM = (lang: Language) => `You tell an elderly person what one button or link on a web page does.
Write ONLY in ${LANG_NAME[lang]}, in one short sentence of plain everyday words, at most 16 words, politely. If it is not certain, say what it most likely does.
Return ONLY a JSON object: {"explain": "<the sentence>"}`;

/** Explains a single control. Small and cheap, so every button on a page can be explained on demand. */
export async function assistControl(input: ControlInput): Promise<{ explain: string }> {
  const { label, kind, hint } = input.control;
  const user = `Page: ${input.title}\nHeadings: ${input.headings.join(" / ")}\nPage text: ${input.text}\n\nControl: ${kind} | ${label}${hint ? ` | ${hint}` : ""}`;
  return askJson(
    [
      { role: "system", content: CONTROL_SYSTEM(input.language) },
      { role: "user", content: user },
    ],
    0.2,
    90,
    (content) => {
      let raw: { explain?: unknown };
      try {
        raw = JSON.parse(content);
      } catch {
        throw new AiError(`AI returned invalid JSON: ${content.slice(0, 200)}`);
      }
      const explain = str(raw.explain, 240);
      if (!explain) throw new AiError("AI answer has no explanation");
      return { explain };
    },
  );
}

const parseObject = (content: string): Record<string, unknown> => {
  try {
    return JSON.parse(content);
  } catch {
    throw new AiError(`AI returned invalid JSON: ${content.slice(0, 200)}`);
  }
};

const SIMPLIFY_SYSTEM = `You simplify a busy web page for an elderly person. From the list of controls, keep only those needed for the main task of this page, at most 6, and the ones without which the task cannot be finished.
Return ONLY a JSON object: {"keep": ["<id>", ...]}`;

/** Which controls matter on this page; the SDK hides the others and offers "show all". */
export async function assistSimplify(input: PageInput): Promise<{ keep: string[] }> {
  const actions = input.actions.map((a) => `${a.id} | ${a.kind} | ${a.label}${a.hint ? ` | ${a.hint}` : ""}`).join("\n");
  const known = new Set(input.actions.map((a) => a.id));
  return askJson(
    [
      { role: "system", content: SIMPLIFY_SYSTEM },
      { role: "user", content: `Title: ${input.title}\nHeadings: ${input.headings.slice(0, 4).join(" / ")}\nText: ${input.text.slice(0, 600)}\n\nControls (id | kind | label | hint):\n${actions}` },
    ],
    0.1,
    90,
    (content) => {
      const raw = parseObject(content);
      const keep = Array.isArray(raw.keep) ? raw.keep.filter((id): id is string => typeof id === "string" && known.has(id)) : [];
      if (keep.length === 0) throw new AiError("AI kept no controls");
      return { keep };
    },
  );
}

const REWRITE_SYSTEM = (lang: Language) => `Rewrite the text for an elderly person or someone with reading difficulties. Write ONLY in ${LANG_NAME[lang]}, in 2 or 3 very short sentences of everyday words. Keep every number, date and name that matters. Add nothing that is not in the text.
Return ONLY a JSON object: {"plain": "<the rewritten text>"}`;

export async function assistRewrite(text: string, language: Language): Promise<{ plain: string }> {
  return askJson(
    [
      { role: "system", content: REWRITE_SYSTEM(language) },
      { role: "user", content: text },
    ],
    0.2,
    200,
    (content) => {
      const plain = str(parseObject(content).plain, 700);
      if (!plain) throw new AiError("AI returned no rewritten text");
      return { plain };
    },
  );
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
  const points = Array.isArray(raw.points) ? raw.points.map((p) => str(p, 200)).filter(Boolean).slice(0, 3) : [];
  const actions = Array.isArray(raw.actions)
    ? (raw.actions as Record<string, unknown>[])
        .map((a) => ({ id: str(a?.id, 20), explain: str(a?.explain, 200) }))
        .filter((a) => knownIds.has(a.id) && a.explain) // only ids that exist on the page
        .slice(0, 6)
    : [];
  return { headline, summary, points, actions };
}
