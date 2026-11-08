// MƏNƏ UYĞUN — preference schema. Single source of truth for platform, API, Web SDK.
// Android (Kotlin) and iOS (Swift) models mirror this file; keep keys and values identical.

export const SCHEMA_VERSION = 1 as const;

export type Category = "vision" | "hearing" | "motor" | "cognitive" | "reading" | "tech";

export const CATEGORIES: { id: Category; label: string; help: string; icon: string }[] = [
  { id: "vision", label: "Görmə", help: "Yazıları və rəngləri görməkdə çətinlik", icon: "👁️" },
  { id: "hearing", label: "Eşitmə", help: "Səsləri eşitməkdə çətinlik", icon: "👂" },
  { id: "motor", label: "Hərəkət", help: "Əl ilə dəqiq toxunmaqda və ya siçanla çətinlik", icon: "✋" },
  { id: "cognitive", label: "Anlama və yaddaş", help: "Mürəkkəb ekranlar çaşdırır, tez yorulursunuz", icon: "🧠" },
  { id: "reading", label: "Oxuma", help: "Uzun mətnləri oxumaq çətindir", icon: "📖" },
  { id: "tech", label: "Texnologiyadan istifadə", help: "Telefon və saytlardan istifadə etmək çətindir", icon: "📱" },
];

export type Contrast = "normal" | "high" | "dark";
export type ColorFilter = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "grayscale";
export type Language = "az" | "ru" | "en";

export interface Preferences {
  version: typeof SCHEMA_VERSION;
  // vision
  fontScale: number; // 1 | 1.25 | 1.5 | 1.75 | 2
  lineSpacing: number; // 1 (site default) | 1.5 | 2
  letterSpacing: number; // 0 | 0.05 | 0.1 (em)
  contrast: Contrast;
  colorFilter: ColorFilter;
  highlightLinks: boolean;
  largeCursor: boolean;
  strongFocus: boolean;
  screenReader: boolean;
  // hearing
  captions: boolean;
  visualAlerts: boolean;
  transcripts: boolean;
  signLanguage: boolean;
  // motor
  largeTargets: boolean;
  extendedTimeouts: boolean;
  noDrag: boolean;
  reduceMotion: boolean;
  // cognitive
  simpleMode: boolean;
  hideDistractions: boolean;
  plainLanguage: boolean;
  stepByStep: boolean;
  confirmActions: boolean;
  iconLabels: boolean;
  // reading
  dyslexiaFont: boolean;
  readingRuler: boolean;
  tts: boolean;
  ttsRate: number; // 0.6 | 0.8 | 1 | 1.2
  // general
  language: Language;
}

export type PreferenceKey = Exclude<keyof Preferences, "version">;

export const DEFAULT_PREFERENCES: Preferences = {
  version: SCHEMA_VERSION,
  fontScale: 1,
  lineSpacing: 1,
  letterSpacing: 0,
  contrast: "normal",
  colorFilter: "none",
  highlightLinks: false,
  largeCursor: false,
  strongFocus: false,
  screenReader: false,
  captions: false,
  visualAlerts: false,
  transcripts: false,
  signLanguage: false,
  largeTargets: false,
  extendedTimeouts: false,
  noDrag: false,
  reduceMotion: false,
  simpleMode: false,
  hideDistractions: false,
  plainLanguage: false,
  stepByStep: false,
  confirmActions: false,
  iconLabels: false,
  dyslexiaFont: false,
  readingRuler: false,
  tts: false,
  ttsRate: 1,
  language: "az",
};

/** A = SDK applies it automatically on any site. B = SDK exposes it, the service implements it. */
export type Kind = "A" | "B";

type Option<T> = { value: T; label: string };

export type SettingDef =
  | { key: PreferenceKey; kind: Kind; categories: Category[]; label: string; help: string; control: "toggle" }
  | { key: PreferenceKey; kind: Kind; categories: Category[]; label: string; help: string; control: "choice"; options: Option<string | number>[] };

export const SETTINGS: SettingDef[] = [
  { key: "fontScale", kind: "A", categories: ["vision", "tech", "reading"], label: "Yazı ölçüsü", help: "Bütün yazıları böyüdür", control: "choice",
    options: [{ value: 1, label: "Normal" }, { value: 1.25, label: "Böyük" }, { value: 1.5, label: "Daha böyük" }, { value: 1.75, label: "Çox böyük" }, { value: 2, label: "Ən böyük" }] },
  { key: "lineSpacing", kind: "A", categories: ["vision", "reading", "cognitive"], label: "Sətir aralığı", help: "Sətirlər arasında daha çox boşluq", control: "choice",
    options: [{ value: 1, label: "Normal" }, { value: 1.5, label: "Geniş" }, { value: 2, label: "Çox geniş" }] },
  { key: "letterSpacing", kind: "A", categories: ["vision", "reading"], label: "Hərf aralığı", help: "Hərflər arasında daha çox boşluq", control: "choice",
    options: [{ value: 0, label: "Normal" }, { value: 0.05, label: "Geniş" }, { value: 0.1, label: "Çox geniş" }] },
  { key: "contrast", kind: "A", categories: ["vision", "tech"], label: "Kontrast", help: "Yazılar fondan daha aydın seçilir", control: "choice",
    options: [{ value: "normal", label: "Normal" }, { value: "high", label: "Yüksək" }, { value: "dark", label: "Qaranlıq fon" }] },
  { key: "colorFilter", kind: "A", categories: ["vision"], label: "Rəng filtri", help: "Rəngləri ayırd etməkdə çətinlik üçün", control: "choice",
    options: [{ value: "none", label: "Yoxdur" }, { value: "protanopia", label: "Qırmızı (protanopiya)" }, { value: "deuteranopia", label: "Yaşıl (deyteranopiya)" }, { value: "tritanopia", label: "Mavi (tritanopiya)" }, { value: "grayscale", label: "Ağ-qara" }] },
  { key: "highlightLinks", kind: "A", categories: ["vision", "cognitive"], label: "Linkləri vurğula", help: "Bütün linklər qalın və altı xətli olur", control: "toggle" },
  { key: "largeCursor", kind: "A", categories: ["vision", "motor"], label: "Böyük kursor", help: "Siçan göstəricisi böyük olur", control: "toggle" },
  { key: "strongFocus", kind: "A", categories: ["vision", "motor"], label: "Seçimi aydın göstər", help: "Seçilmiş element qalın çərçivə ilə görünür", control: "toggle" },
  { key: "screenReader", kind: "B", categories: ["vision"], label: "Ekran oxuyucudan istifadə edirəm", help: "Xidmət VoiceOver/TalkBack üçün uyğunlaşır", control: "toggle" },

  { key: "captions", kind: "A", categories: ["hearing"], label: "Altyazı həmişə açıq", help: "Videolarda altyazı avtomatik açılır", control: "toggle" },
  { key: "visualAlerts", kind: "B", categories: ["hearing"], label: "Səs əvəzinə görüntü ilə xəbərdarlıq", help: "Səsli siqnal əvəzinə ekranda mesaj", control: "toggle" },
  { key: "transcripts", kind: "B", categories: ["hearing"], label: "Səsin mətn variantı", help: "Audio və videolar üçün yazılı mətn", control: "toggle" },
  { key: "signLanguage", kind: "B", categories: ["hearing"], label: "İşarə dili", help: "Varsa işarə dili videosu göstərilir", control: "toggle" },

  { key: "largeTargets", kind: "A", categories: ["motor", "tech", "vision"], label: "Böyük düymələr", help: "Düymələrə toxunmaq asanlaşır", control: "toggle" },
  { key: "extendedTimeouts", kind: "B", categories: ["motor", "cognitive", "tech"], label: "Daha çox vaxt", help: "Sessiya və formalar tez bağlanmır", control: "toggle" },
  { key: "noDrag", kind: "B", categories: ["motor"], label: "Sürüşdürmə əvəzinə düymə", help: "Sürükləmə tələb edən yerlərdə düymə", control: "toggle" },
  { key: "reduceMotion", kind: "A", categories: ["motor", "cognitive", "vision"], label: "Hərəkəti azalt", help: "Animasiyalar və hərəkətli effektlər dayanır", control: "toggle" },

  { key: "simpleMode", kind: "A", categories: ["cognitive", "tech"], label: "Sadə rejim", help: "Yalnız əsas funksiyalar qalır", control: "toggle" },
  { key: "hideDistractions", kind: "A", categories: ["cognitive", "tech", "reading"], label: "Reklamları gizlət", help: "Reklam və yayındırıcı hissələr gizlənir", control: "toggle" },
  { key: "plainLanguage", kind: "B", categories: ["cognitive", "tech"], label: "Sadə dil", help: "Mətnlər sadə sözlərlə", control: "toggle" },
  { key: "stepByStep", kind: "B", categories: ["cognitive", "tech"], label: "Addım-addım", help: "Bir ekranda bir iş", control: "toggle" },
  { key: "confirmActions", kind: "B", categories: ["cognitive", "tech"], label: "Əməliyyatdan əvvəl soruş", help: "Ödənişdən əvvəl “Əminsiniz?” sualı", control: "toggle" },
  { key: "iconLabels", kind: "A", categories: ["cognitive", "tech"], label: "İkonların yanında yazı", help: "Yazısız düymələrin adı göstərilir", control: "toggle" },

  { key: "dyslexiaFont", kind: "A", categories: ["reading"], label: "Oxunaqlı şrift", help: "Oxunması asan şrift", control: "toggle" },
  { key: "readingRuler", kind: "A", categories: ["reading", "cognitive"], label: "Oxuma xətti", help: "Oxuduğunuz sətri vurğulayan zolaq", control: "toggle" },
  { key: "tts", kind: "A", categories: ["vision", "reading", "tech", "cognitive"], label: "Səsli oxunuş", help: "Mətnləri səslə oxuyur", control: "toggle" },
  { key: "ttsRate", kind: "A", categories: ["vision", "reading", "tech", "cognitive"], label: "Oxunuş sürəti", help: "Səsli oxunuşun sürəti", control: "choice",
    options: [{ value: 0.6, label: "Çox yavaş" }, { value: 0.8, label: "Yavaş" }, { value: 1, label: "Normal" }, { value: 1.2, label: "Sürətli" }] },

  { key: "language", kind: "B", categories: ["vision", "hearing", "motor", "cognitive", "reading", "tech"], label: "Dil", help: "Xidmətin dili", control: "choice",
    options: [{ value: "az", label: "Azərbaycan" }, { value: "ru", label: "Русский" }, { value: "en", label: "English" }] },
];

const SETTING_BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

export function settingsForCategories(cats: Category[]): SettingDef[] {
  if (cats.length === 0) return SETTINGS;
  return SETTINGS.filter((s) => s.categories.some((c) => cats.includes(c)));
}

export class PreferenceError extends Error {
  constructor(message: string, readonly key?: string) {
    super(message);
    this.name = "PreferenceError";
  }
}

function checkValue(key: string, value: unknown): void {
  const def = SETTING_BY_KEY.get(key as PreferenceKey);
  if (!def) throw new PreferenceError(`Unknown preference key: ${key}`, key);
  if (def.control === "toggle") {
    if (typeof value !== "boolean") throw new PreferenceError(`${key} must be boolean`, key);
    return;
  }
  if (!def.options.some((o) => o.value === value)) {
    throw new PreferenceError(`${key} must be one of ${def.options.map((o) => JSON.stringify(o.value)).join(", ")}`, key);
  }
}

/** Validates a partial update. Throws PreferenceError on any unknown key or invalid value. */
export function validatePatch(input: unknown): Partial<Omit<Preferences, "version">> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new PreferenceError("Preferences patch must be an object");
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "version") continue;
    checkValue(k, v);
    out[k] = v;
  }
  return out as Partial<Omit<Preferences, "version">>;
}

/** Validates a full preferences object strictly (missing keys are filled from defaults). Use when WRITING. */
export function normalizePreferences(input: unknown): Preferences {
  return { ...DEFAULT_PREFERENCES, ...validatePatch(input), version: SCHEMA_VERSION };
}

/**
 * Lenient reader for stored or received preferences (forward/backward compatible):
 * unknown keys are ignored and invalid values fall back to the default. Use when READING.
 */
export function readPreferences(input: unknown): Preferences {
  const out: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input)) {
      if (k === "version" || !SETTING_BY_KEY.has(k as PreferenceKey)) continue;
      try {
        checkValue(k, v);
        out[k] = v;
      } catch {
        /* invalid value: keep the default for this key */
      }
    }
  }
  out.version = SCHEMA_VERSION;
  return out as unknown as Preferences;
}

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && CATEGORIES.some((c) => c.id === v);
}

/** Starter settings applied when a user picks need categories during registration (they can change everything later). */
export const PRESETS: Record<Category, Partial<Omit<Preferences, "version">>> = {
  vision: { fontScale: 1.5, contrast: "high", strongFocus: true, largeTargets: true, highlightLinks: true },
  hearing: { captions: true, visualAlerts: true, transcripts: true },
  motor: { largeTargets: true, extendedTimeouts: true, noDrag: true, reduceMotion: true, largeCursor: true },
  cognitive: { simpleMode: true, hideDistractions: true, confirmActions: true, iconLabels: true, stepByStep: true, plainLanguage: true },
  reading: { lineSpacing: 1.5, readingRuler: true, tts: true, ttsRate: 0.8 },
  tech: { fontScale: 1.25, simpleMode: true, largeTargets: true, confirmActions: true, extendedTimeouts: true, iconLabels: true },
};

/** Merges presets of several categories; numeric values take the larger one. */
export function presetFor(cats: Category[]): Partial<Omit<Preferences, "version">> {
  const out: Record<string, unknown> = {};
  for (const c of cats) {
    for (const [k, v] of Object.entries(PRESETS[c])) {
      out[k] = typeof v === "number" && typeof out[k] === "number" ? Math.max(out[k] as number, v) : v;
    }
  }
  return out as Partial<Omit<Preferences, "version">>;
}

/** Human-readable value of a setting, e.g. "Yazı ölçüsü: Daha böyük". */
export function describeValue(key: PreferenceKey, value: unknown): string {
  const def = SETTING_BY_KEY.get(key);
  if (!def) return `${key}: ${String(value)}`;
  if (def.control === "toggle") return `${def.label}: ${value ? "açıq" : "bağlı"}`;
  const opt = def.options.find((o) => o.value === value);
  return `${def.label}: ${opt ? opt.label : String(value)}`;
}

export function changedKeys(prefs: Preferences, base: Preferences = DEFAULT_PREFERENCES): PreferenceKey[] {
  return (Object.keys(base) as (keyof Preferences)[]).filter((k) => k !== "version" && prefs[k] !== base[k]) as PreferenceKey[];
}

export function settingDef(key: PreferenceKey): SettingDef | undefined {
  return SETTING_BY_KEY.get(key);
}
