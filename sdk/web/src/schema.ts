// MƏNƏ UYĞUN — preference schema. Single source of truth for platform, API, Web SDK.
// Android (Kotlin) and iOS (Swift) models mirror this file; keep keys and values identical.

export const SCHEMA_VERSION = 1 as const;

export type Category = "vision" | "hearing" | "motor" | "cognitive" | "reading" | "tech" | "color" | "light" | "seizure" | "attention" | "sensory" | "tremor" | "oneHand" | "memory" | "dyslexia" | "numbers" | "speech" | "fatigue";

export const CATEGORIES: { id: Category; label: string; help: string; en: { label: string; help: string } }[] = [
  { id: "vision", label: "Görmə", help: "Yazıları və rəngləri görməkdə çətinlik", en: { label: "Vision", help: "Difficulty seeing text and colours" } },
  { id: "hearing", label: "Eşitmə", help: "Səsləri eşitməkdə çətinlik", en: { label: "Hearing", help: "Difficulty hearing sounds" } },
  { id: "motor", label: "Hərəkət", help: "Əl ilə dəqiq toxunmaqda və ya siçanla çətinlik", en: { label: "Movement", help: "Difficulty tapping accurately or using a mouse" } },
  { id: "cognitive", label: "Anlama və yaddaş", help: "Mürəkkəb ekranlar çaşdırır, tez yorulursunuz", en: { label: "Understanding and memory", help: "Complicated screens are confusing or tiring" } },
  { id: "reading", label: "Oxuma", help: "Uzun mətnləri oxumaq çətindir", en: { label: "Reading", help: "Long texts are hard to read" } },
  { id: "tech", label: "Texnologiyadan istifadə", help: "Telefon və saytlardan istifadə etmək çətindir", en: { label: "Using technology", help: "Phones and websites are hard to use" } },
  { id: "color", label: "Rəngləri ayırd etmək", help: "Məsələn: rəng korluğu", en: { label: "Telling colours apart", help: "For example: colour blindness" } },
  { id: "light", label: "İşığa həssaslıq", help: "Məsələn: miqren, göz yorğunluğu", en: { label: "Sensitivity to light", help: "For example: migraine, tired eyes" } },
  { id: "seizure", label: "Yanıb-sönən görüntülər", help: "Məsələn: epilepsiya", en: { label: "Flashing images", help: "For example: epilepsy" } },
  { id: "attention", label: "Diqqəti toplamaq", help: "Məsələn: DEHB, tez yayınma", en: { label: "Keeping attention", help: "For example: ADHD, getting distracted" } },
  { id: "sensory", label: "Səs və hərəkətdən narahatlıq", help: "Məsələn: autizm, tinnitus", en: { label: "Bothered by sound and movement", help: "For example: autism, tinnitus" } },
  { id: "tremor", label: "Əl titrəməsi", help: "Məsələn: Parkinson", en: { label: "Shaking hands", help: "For example: Parkinson’s" } },
  { id: "oneHand", label: "Bir əllə istifadə", help: "Məsələn: insult, zədə", en: { label: "Using one hand", help: "For example: stroke, injury" } },
  { id: "memory", label: "Yaddaş", help: "Məsələn: demensiya, Alzheimer", en: { label: "Memory", help: "For example: dementia, Alzheimer’s" } },
  { id: "dyslexia", label: "Hərfləri qarışdırmaq", help: "Məsələn: disleksiya", en: { label: "Mixing up letters", help: "For example: dyslexia" } },
  { id: "numbers", label: "Rəqəmlərlə çətinlik", help: "Məsələn: diskalkuliya", en: { label: "Difficulty with numbers", help: "For example: dyscalculia" } },
  { id: "speech", label: "Danışmaq və söz tapmaq", help: "Məsələn: afaziya, kəkələmə", en: { label: "Speaking and finding words", help: "For example: aphasia, stammering" } },
  { id: "fatigue", label: "Tez yorulma", help: "Məsələn: xroniki yorğunluq, MS", en: { label: "Getting tired quickly", help: "For example: chronic fatigue, MS" } },
];

/** The six everyday needs shown first; the rest open with one press. */
export const MAIN_CATEGORIES: Category[] = ["vision", "hearing", "motor", "cognitive", "reading", "tech"];

export type Contrast = "normal" | "high" | "dark";
export type ColorFilter = "none" | "protanopia" | "deuteranopia" | "tritanopia" | "grayscale";
export type Language = "az" | "en";

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
  aiHelp: boolean; // page explainer: summary, simple headline, what each control does
  // general
  language: Language;
  // text
  fontFamily: string; // default | sans | serif | mono | rounded
  fontWeight: string; // default | medium | bold
  wordSpacing: number; // 0 | 0.1 | 0.2 | 0.4 (em)
  paragraphSpacing: number; // 0 | 1 | 2 (em)
  textAlign: string; // default | left
  maxLineWidth: string; // default | 80ch | 60ch
  noItalics: boolean;
  noUppercase: boolean;
  emphasizeHeadings: boolean;
  clearNumbers: boolean;
  // colours: "default" or #rrggbb
  textColor: string;
  backgroundColor: string;
  linkColor: string;
  headingColor: string;
  buttonColor: string;
  buttonTextColor: string;
  borderColor: string;
  focusColor: string;
  // display
  brightness: number; // 1 | 0.85 | 0.7 | 0.55
  saturation: number; // 1 | 1.5 | 0.5 | 0.25
  warmth: number; // 0 | 0.3 | 0.6
  pageZoom: number; // 1 | 1.1 | 1.25 | 1.5
  flatDesign: boolean;
  outlineControls: boolean;
  // images and media
  hideImages: boolean;
  hoverZoom: boolean;
  hideVideos: boolean;
  hideBackgroundImages: boolean;
  flashGuard: boolean;
  stopAutoplay: boolean;
  muteAudio: boolean;
  // page structure
  unstickHeaders: boolean;
  hideFooter: boolean;
  skipLink: boolean;
  // pointer and reading
  cursorColor: string; // default | black | white | yellow | red | blue
  hoverHighlight: boolean;
  readingGuide: boolean;
  focusMode: boolean;
  // touch
  clickGuard: boolean;
  dwellClick: number; // 0 | 1000 | 1500 | 2500 (ms)
  handedness: string; // right | left
  // sound and voice
  captionSize: number; // 1 | 1.5 | 2
  captionStyle: string; // default | yellow | white
  ttsPitch: number; // 1 | 0.8 | 1.2
  ttsVolume: number; // 1 | 0.75 | 0.5
  readOnSelect: boolean;
  readOnHover: boolean;
  // safety and rest
  warnExternalLinks: boolean;
  breakReminder: number; // 0 | 20 | 40 (minutes)
  // simplifying complicated sites
  readerMode: boolean;
  singleColumn: boolean;
  collapseMenus: boolean;
  hideSidebars: boolean;
  hidePopups: boolean;
  hideComments: boolean;
  hideSocial: boolean;
  aiSimplify: boolean;
  simplifyParagraphs: boolean;
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
  aiHelp: false,
  language: "az",
  fontFamily: "default", fontWeight: "default", wordSpacing: 0, paragraphSpacing: 0, textAlign: "default", maxLineWidth: "default",
  noItalics: false, noUppercase: false, emphasizeHeadings: false, clearNumbers: false,
  textColor: "default", backgroundColor: "default", linkColor: "default", headingColor: "default", buttonColor: "default", buttonTextColor: "default", borderColor: "default", focusColor: "default",
  brightness: 1, saturation: 1, warmth: 0, pageZoom: 1, flatDesign: false, outlineControls: false,
  hideImages: false, hoverZoom: false, hideVideos: false, hideBackgroundImages: false, flashGuard: false, stopAutoplay: false, muteAudio: false,
  unstickHeaders: false, hideFooter: false, skipLink: false,
  cursorColor: "default", hoverHighlight: false, readingGuide: false, focusMode: false,
  clickGuard: false, dwellClick: 0, handedness: "right",
  captionSize: 1, captionStyle: "default", ttsPitch: 1, ttsVolume: 1, readOnSelect: false, readOnHover: false,
  warnExternalLinks: false, breakReminder: 0,
  readerMode: false, singleColumn: false, collapseMenus: false, hideSidebars: false, hidePopups: false, hideComments: false, hideSocial: false, aiSimplify: false, simplifyParagraphs: false,
};

/** A = SDK applies it automatically on any site. B = SDK exposes it, the service implements it. */
export type Kind = "A" | "B";

type Option<T> = { value: T; label: string };

export type SettingDef =
  | { key: PreferenceKey; kind: Kind; categories: Category[]; label: string; help: string; control: "toggle" }
  | { key: PreferenceKey; kind: Kind; categories: Category[]; label: string; help: string; control: "choice"; options: Option<string | number>[] }
  | { key: PreferenceKey; kind: Kind; categories: Category[]; label: string; help: string; control: "color" };

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

  { key: "aiHelp", kind: "A", categories: ["cognitive", "tech", "reading", "vision"], label: "Səhifəni izah et (AI)", help: "Saytda “Bu səhifə nədir?” düyməsi: qısa xülasə və hər düymənin nə etdiyi", control: "toggle" },

  // ---- text
  pick("fontFamily", ["vision", "reading"], "Şrift növü", "Bütün yazıların görünüşü", [["default", "Saytın öz şrifti"], ["sans", "Sadə"], ["serif", "Klassik"], ["mono", "Bərabər enli"], ["rounded", "Yumru"]]),
  pick("fontWeight", ["vision", "reading"], "Yazının qalınlığı", "Nazik yazıları qalınlaşdırır", [["default", "Normal"], ["medium", "Orta"], ["bold", "Qalın"]]),
  pick("wordSpacing", ["reading", "vision"], "Söz aralığı", "Sözlər arasında daha çox boşluq", [[0, "Normal"], [0.1, "Geniş"], [0.2, "Daha geniş"], [0.4, "Çox geniş"]]),
  pick("paragraphSpacing", ["reading", "cognitive"], "Abzas aralığı", "Abzaslar arasında daha çox boşluq", [[0, "Normal"], [1, "Geniş"], [2, "Çox geniş"]]),
  pick("textAlign", ["reading"], "Mətnin düzülüşü", "Bərabər yayılmış mətni sola düzür", [["default", "Saytdakı kimi"], ["left", "Sola"]]),
  pick("maxLineWidth", ["reading", "vision", "cognitive"], "Sətrin uzunluğu", "Uzun sətirləri qısaldır", [["default", "Saytdakı kimi"], ["80ch", "Orta"], ["60ch", "Qısa"]]),
  tog("noItalics", ["reading"], "Maili yazını düzəlt", "Maili yazılar düz görünür"),
  tog("noUppercase", ["reading"], "Böyük hərfləri ləğv et", "BÖYÜK HƏRFLƏRLƏ yazılanlar adi görünür"),
  tog("emphasizeHeadings", ["vision", "cognitive"], "Başlıqları vurğula", "Başlıqlar qalın və altı xətli olur"),
  tog("clearNumbers", ["vision"], "Rəqəmləri aydın göstər", "Rəqəmlər bərabər enli və aydın olur"),
  // ---- colours
  col("textColor", ["vision"], "Yazı rəngi", "Bütün yazıların rəngi"),
  col("backgroundColor", ["vision"], "Fon rəngi", "Səhifənin arxa fonu"),
  col("linkColor", ["vision"], "Link rəngi", "Linklərin rəngi"),
  col("headingColor", ["vision"], "Başlıq rəngi", "Başlıqların rəngi"),
  col("buttonColor", ["vision"], "Düymə rəngi", "Düymələrin fonu"),
  col("buttonTextColor", ["vision"], "Düymə yazısının rəngi", "Düymələrin üzərindəki yazı"),
  col("borderColor", ["vision"], "Çərçivə rəngi", "Bütün xətt və çərçivələr"),
  col("focusColor", ["vision", "motor"], "Seçim çərçivəsinin rəngi", "Seçilmiş elementin çərçivəsi"),
  // ---- display
  pick("brightness", ["vision"], "Ekranın parlaqlığı", "Səhifəni tündləşdirir", [[1, "Normal"], [0.85, "Bir az tünd"], [0.7, "Tünd"], [0.55, "Çox tünd"]]),
  pick("saturation", ["vision"], "Rənglərin canlılığı", "Rəngləri solğun və ya canlı edir", [[1, "Normal"], [1.5, "Canlı"], [0.5, "Solğun"], [0.25, "Çox solğun"]]),
  pick("warmth", ["vision"], "İsti işıq", "Gözü yoran mavi işığı azaldır", [[0, "Yoxdur"], [0.3, "Bir az"], [0.6, "Çox"]]),
  pick("pageZoom", ["vision", "tech"], "Bütün səhifəni böyüt", "Yazı ilə birlikdə hər şey böyüyür", [[1, "Normal"], [1.1, "110%"], [1.25, "125%"], [1.5, "150%"]]),
  tog("flatDesign", ["cognitive", "vision"], "Sadə görünüş", "Kölgələr və yuvarlaq künclər yığışdırılır"),
  tog("outlineControls", ["vision", "cognitive", "tech"], "Düymələri çərçivəyə al", "Basıla bilən hər şey çərçivə ilə görünür"),
  // ---- images and media
  tog("hideImages", ["cognitive"], "Şəkilləri gizlət", "Yalnız mətn qalır"),
  tog("hoverZoom", ["vision"], "Şəkli böyüdərək göstər", "Kursor gələn şəkil böyüyür"),
  tog("hideVideos", ["cognitive"], "Videoları gizlət", "Videolar səhifədə görünmür"),
  tog("hideBackgroundImages", ["vision", "reading"], "Fon şəkillərini yığışdır", "Yazının arxasındakı şəkillər silinir"),
  tog("flashGuard", ["cognitive"], "Yanıb-sönməni dayandır", "Animasiya, GIF və avtomatik video dayanır"),
  tog("stopAutoplay", ["cognitive", "hearing"], "Avtomatik başlamasın", "Video və səs özü-özünə açılmır"),
  tog("muteAudio", ["cognitive"], "Bütün səsləri bağla", "Sayt səs çıxarmır"),
  // ---- page structure
  tog("unstickHeaders", ["vision", "cognitive"], "Sabit zolaqları burax", "Ekrana yapışan menyular yazını örtmür"),
  tog("hideFooter", ["cognitive"], "Səhifənin altını gizlət", "Alt hissədəki linklər görünmür"),
  tog("skipLink", ["motor", "vision"], "Əsas məzmuna keçid", "Klaviatura ilə menyunu keçmək üçün"),
  // ---- pointer and reading
  pick("cursorColor", ["vision", "motor"], "Kursorun rəngi", "Böyük və seçdiyiniz rəngdə kursor", [["default", "Normal"], ["black", "Qara"], ["white", "Ağ"], ["yellow", "Sarı"], ["red", "Qırmızı"], ["blue", "Mavi"]]),
  tog("hoverHighlight", ["vision", "cognitive"], "Kursor gələn yeri vurğula", "Kursorun altındakı element çərçivələnir"),
  tog("readingGuide", ["reading", "cognitive"], "Oxuma zolağı", "Səhifəni tündləşdirmədən sətri vurğulayır"),
  tog("focusMode", ["cognitive", "reading"], "Diqqət rejimi", "Yalnız kursorun altındakı mətn parlaq qalır"),
  // ---- touch
  tog("clickGuard", ["motor"], "Təsadüfi ikiqat basmanı əngəllə", "Dalbadal ikinci basma nəzərə alınmır"),
  pick("dwellClick", ["motor"], "Kursoru saxlayanda bas", "Kursor düymənin üstündə dayananda özü basılır. Ödəniş və silmə üçün işləmir", [[0, "Bağlı"], [2500, "2,5 saniyə"], [1500, "1,5 saniyə"], [1000, "1 saniyə"]]),
  pick("handedness", ["motor"], "İstifadə etdiyiniz əl", "MƏNƏ UYĞUN düymələri bu tərəfə keçir", [["right", "Sağ əl"], ["left", "Sol əl"]]),
  // ---- sound and voice
  pick("captionSize", ["hearing", "vision"], "Altyazının ölçüsü", "Videolardakı altyazı", [[1, "Normal"], [1.5, "Böyük"], [2, "Çox böyük"]]),
  pick("captionStyle", ["hearing", "vision"], "Altyazının görünüşü", "Altyazının rəngi və fonu", [["default", "Normal"], ["yellow", "Qara fonda sarı"], ["white", "Ağ fonda qara"]]),
  pick("ttsPitch", ["vision", "reading", "hearing"], "Səsin tonu", "Oxuyan səsin qalınlığı", [[1, "Normal"], [0.8, "Qalın"], [1.2, "İncə"]]),
  pick("ttsVolume", ["vision", "reading", "hearing"], "Səsin gücü", "Oxuyan səsin ucalığı", [[1, "Tam"], [0.75, "Orta"], [0.5, "Az"]]),
  tog("readOnSelect", ["vision", "reading"], "Seçdiyimi oxu", "Seçdiyiniz mətn səslə oxunur"),
  tog("readOnHover", ["vision", "reading"], "Kursor gələni oxu", "Kursorun altındakı mətn oxunur"),
  // ---- simplifying complicated sites
  tog("readerMode", ["cognitive", "reading", "tech", "vision"], "Oxuma görünüşü", "Yalnız əsas məzmun qalır: menyu, reklam və yan hissələr gedir"),
  tog("aiSimplify", ["cognitive", "tech"], "Düymələri AI ilə azalt", "AI bu səhifədə lazım olan düymələri seçir, qalanını gizlədir"),
  tog("simplifyParagraphs", ["cognitive", "reading", "tech"], "Mətni sadə dilə çevir", "Uzun abzasların altında “Sadə dildə” düyməsi çıxır"),
  tog("collapseMenus", ["cognitive", "tech"], "Uzun menyuları qısalt", "Menyuda ilk 5 bənd qalır, qalanı “Daha çox” altındadır"),
  tog("singleColumn", ["cognitive", "vision", "tech"], "Tək sütun", "Yan-yana hissələr bir-birinin altına düzülür"),
  tog("hideSidebars", ["cognitive", "tech"], "Yan panelləri gizlət", "Səhifənin yanlarındakı bloklar görünmür"),
  tog("hidePopups", ["cognitive", "tech"], "Açılan pəncərələri gizlət", "Çerez, abunə və reklam pəncərələri görünmür"),
  tog("hideComments", ["cognitive"], "Şərhləri gizlət", "Səhifənin altındakı şərhlər görünmür"),
  tog("hideSocial", ["cognitive", "tech"], "Paylaşım düymələrini gizlət", "Sosial şəbəkə düymələri görünmür"),
  // ---- safety and rest
  tog("warnExternalLinks", ["cognitive", "tech"], "Başqa sayta keçəndə soruş", "Fırıldaqçı linklərdən qorunmaq üçün"),
  pick("breakReminder", ["vision", "cognitive"], "Fasilə xatırlatması", "Vaxtaşırı dincəlməyi xatırladır", [[0, "Bağlı"], [20, "20 dəqiqədən bir"], [40, "40 dəqiqədən bir"]]),

  { key: "language", kind: "B", categories: ["vision", "hearing", "motor", "cognitive", "reading", "tech"], label: "Dil", help: "Xidmətin dili", control: "choice",
    options: [{ value: "az", label: "Azərbaycan" }, { value: "en", label: "English" }] },
];

/** English texts. A missing key does not compile; a missing option throws in optionLabel. */
const SETTING_EN: Record<PreferenceKey, { label: string; help: string; options?: Record<string, string> }> = {
  fontFamily: { label: "Font style", help: "The look of all text", options: { default: "The site’s own", sans: "Plain", serif: "Classic", mono: "Even width", rounded: "Rounded" } },
  fontWeight: { label: "Text thickness", help: "Makes thin text thicker", options: { default: "Normal", medium: "Medium", bold: "Bold" } },
  wordSpacing: { label: "Word spacing", help: "More space between words", options: { "0": "Normal", "0.1": "Wide", "0.2": "Wider", "0.4": "Very wide" } },
  paragraphSpacing: { label: "Paragraph spacing", help: "More space between paragraphs", options: { "0": "Normal", "1": "Wide", "2": "Very wide" } },
  textAlign: { label: "Text alignment", help: "Aligns justified text to the left", options: { default: "As on the site", left: "Left" } },
  maxLineWidth: { label: "Line length", help: "Shortens long lines", options: { default: "As on the site", "80ch": "Medium", "60ch": "Short" } },
  noItalics: { label: "Straighten italics", help: "Italic text appears upright" },
  noUppercase: { label: "Remove all capitals", help: "TEXT IN CAPITALS appears normally" },
  emphasizeHeadings: { label: "Emphasise headings", help: "Headings become bold and underlined" },
  clearNumbers: { label: "Show numbers clearly", help: "Numbers become even-width and clear" },
  textColor: { label: "Text colour", help: "The colour of all text" },
  backgroundColor: { label: "Background colour", help: "The background of the page" },
  linkColor: { label: "Link colour", help: "The colour of links" },
  headingColor: { label: "Heading colour", help: "The colour of headings" },
  buttonColor: { label: "Button colour", help: "The background of buttons" },
  buttonTextColor: { label: "Button text colour", help: "The text on buttons" },
  borderColor: { label: "Border colour", help: "All lines and borders" },
  focusColor: { label: "Selection outline colour", help: "The outline of the selected item" },
  brightness: { label: "Screen brightness", help: "Darkens the page", options: { "1": "Normal", "0.85": "A little darker", "0.7": "Dark", "0.55": "Very dark" } },
  saturation: { label: "Colour strength", help: "Makes colours paler or stronger", options: { "1": "Normal", "1.5": "Strong", "0.5": "Pale", "0.25": "Very pale" } },
  warmth: { label: "Warm light", help: "Reduces tiring blue light", options: { "0": "None", "0.3": "A little", "0.6": "A lot" } },
  pageZoom: { label: "Enlarge the whole page", help: "Everything grows, not only text", options: { "1": "Normal", "1.1": "110%", "1.25": "125%", "1.5": "150%" } },
  flatDesign: { label: "Plain look", help: "Removes shadows and rounded corners" },
  outlineControls: { label: "Outline buttons", help: "Everything you can press gets an outline" },
  hideImages: { label: "Hide pictures", help: "Only the text remains" },
  hoverZoom: { label: "Enlarge pictures", help: "A picture grows under the pointer" },
  hideVideos: { label: "Hide videos", help: "Videos do not appear on the page" },
  hideBackgroundImages: { label: "Remove background pictures", help: "Pictures behind text are removed" },
  flashGuard: { label: "Stop flashing", help: "Stops animation, GIFs and automatic video" },
  stopAutoplay: { label: "No automatic start", help: "Video and sound do not start by themselves" },
  muteAudio: { label: "Turn off all sound", help: "The site makes no sound" },
  unstickHeaders: { label: "Release fixed bars", help: "Menus pinned to the screen stop covering text" },
  hideFooter: { label: "Hide the page bottom", help: "The links at the bottom are hidden" },
  skipLink: { label: "Skip to main content", help: "For passing the menu with a keyboard" },
  cursorColor: { label: "Pointer colour", help: "A large pointer in the colour you choose", options: { default: "Normal", black: "Black", white: "White", yellow: "Yellow", red: "Red", blue: "Blue" } },
  hoverHighlight: { label: "Highlight under the pointer", help: "The item under the pointer gets an outline" },
  readingGuide: { label: "Reading band", help: "Highlights the line without darkening the page" },
  focusMode: { label: "Focus mode", help: "Only the text under the pointer stays bright" },
  clickGuard: { label: "Block accidental double presses", help: "A quick second press is ignored" },
  dwellClick: { label: "Press by resting the pointer", help: "A button presses itself when the pointer rests on it. Not for payments or deleting", options: { "0": "Off", "2500": "2.5 seconds", "1500": "1.5 seconds", "1000": "1 second" } },
  handedness: { label: "The hand you use", help: "MƏNƏ UYĞUN buttons move to this side", options: { right: "Right hand", left: "Left hand" } },
  captionSize: { label: "Caption size", help: "Captions in videos", options: { "1": "Normal", "1.5": "Large", "2": "Very large" } },
  captionStyle: { label: "Caption look", help: "Caption colour and background", options: { default: "Normal", yellow: "Yellow on black", white: "Black on white" } },
  ttsPitch: { label: "Voice pitch", help: "How deep the reading voice is", options: { "1": "Normal", "0.8": "Deep", "1.2": "High" } },
  ttsVolume: { label: "Voice volume", help: "How loud the reading voice is", options: { "1": "Full", "0.75": "Medium", "0.5": "Low" } },
  readOnSelect: { label: "Read what I select", help: "Selected text is read aloud" },
  readOnHover: { label: "Read under the pointer", help: "Text under the pointer is read aloud" },
  warnExternalLinks: { label: "Ask before leaving the site", help: "To protect you from scam links" },
  readerMode: { label: "Reading view", help: "Only the main content stays: menus, ads and side parts go" },
  aiSimplify: { label: "Fewer buttons with AI", help: "AI picks the buttons needed on this page and hides the rest" },
  simplifyParagraphs: { label: "Turn text into plain language", help: "An “In plain words” button appears under long paragraphs" },
  collapseMenus: { label: "Shorten long menus", help: "The first 5 items stay, the rest go under “More”" },
  singleColumn: { label: "Single column", help: "Parts side by side are placed one under another" },
  hideSidebars: { label: "Hide side panels", help: "Blocks at the sides of the page are hidden" },
  hidePopups: { label: "Hide pop-up windows", help: "Cookie, subscribe and advert windows are hidden" },
  hideComments: { label: "Hide comments", help: "Comments at the bottom of the page are hidden" },
  hideSocial: { label: "Hide sharing buttons", help: "Social network buttons are hidden" },
  breakReminder: { label: "Break reminder", help: "Reminds you to rest from time to time", options: { "0": "Off", "20": "Every 20 minutes", "40": "Every 40 minutes" } },
  fontScale: { label: "Text size", help: "Makes all text larger", options: { "1": "Normal", "1.25": "Large", "1.5": "Larger", "1.75": "Very large", "2": "Largest" } },
  lineSpacing: { label: "Line spacing", help: "More space between lines", options: { "1": "Normal", "1.5": "Wide", "2": "Very wide" } },
  letterSpacing: { label: "Letter spacing", help: "More space between letters", options: { "0": "Normal", "0.05": "Wide", "0.1": "Very wide" } },
  contrast: { label: "Contrast", help: "Text stands out more clearly from the background", options: { normal: "Normal", high: "High", dark: "Dark background" } },
  colorFilter: { label: "Colour filter", help: "For difficulty telling colours apart", options: { none: "None", protanopia: "Red (protanopia)", deuteranopia: "Green (deuteranopia)", tritanopia: "Blue (tritanopia)", grayscale: "Black and white" } },
  highlightLinks: { label: "Highlight links", help: "All links become bold and underlined" },
  largeCursor: { label: "Large cursor", help: "The mouse pointer becomes larger" },
  strongFocus: { label: "Show the selection clearly", help: "The selected item gets a thick outline" },
  screenReader: { label: "I use a screen reader", help: "The service adapts for VoiceOver/TalkBack" },
  captions: { label: "Captions always on", help: "Captions turn on automatically in videos" },
  visualAlerts: { label: "Visual alerts instead of sounds", help: "A message on screen instead of a sound" },
  transcripts: { label: "Written version of audio", help: "Written text for audio and video" },
  signLanguage: { label: "Sign language", help: "Shows a sign language video when there is one" },
  largeTargets: { label: "Large buttons", help: "Buttons are easier to tap" },
  extendedTimeouts: { label: "More time", help: "Sessions and forms do not close quickly" },
  noDrag: { label: "Buttons instead of dragging", help: "A button wherever dragging is required" },
  reduceMotion: { label: "Reduce motion", help: "Animations and moving effects stop" },
  simpleMode: { label: "Simple mode", help: "Only the main functions remain" },
  hideDistractions: { label: "Hide adverts", help: "Adverts and distracting parts are hidden" },
  plainLanguage: { label: "Plain language", help: "Text in simple words" },
  stepByStep: { label: "Step by step", help: "One task per screen" },
  confirmActions: { label: "Ask before acting", help: "An “Are you sure?” question before payment" },
  iconLabels: { label: "Words next to icons", help: "Shows the name of buttons without text" },
  dyslexiaFont: { label: "Easy-to-read font", help: "A font that is easier to read" },
  readingRuler: { label: "Reading guide", help: "A band that highlights the line you are reading" },
  tts: { label: "Reading aloud", help: "Reads text out loud" },
  ttsRate: { label: "Reading speed", help: "How fast text is read aloud", options: { "0.6": "Very slow", "0.8": "Slow", "1": "Normal", "1.2": "Fast" } },
  aiHelp: { label: "Explain this page (AI)", help: "A “What is this page?” button on sites: a short summary and what each button does" },
  language: { label: "Language", help: "The language of the service", options: { az: "Azərbaycan", en: "English" } },
};

export function settingLabel(def: SettingDef, lang: Language): string {
  return lang === "en" ? SETTING_EN[def.key].label : def.label;
}

export function settingHelp(def: SettingDef, lang: Language): string {
  return lang === "en" ? SETTING_EN[def.key].help : def.help;
}

export function optionLabel(def: SettingDef, value: string | number, lang: Language): string {
  if (def.control !== "choice") throw new Error(`${def.key} has no options`);
  if (lang === "en") {
    const text = SETTING_EN[def.key].options?.[String(value)];
    if (!text) throw new Error(`Missing English label for ${def.key}=${value}`);
    return text;
  }
  const opt = def.options.find((o) => o.value === value);
  if (!opt) throw new Error(`Unknown option ${def.key}=${value}`);
  return opt.label;
}

export function categoryLabel(c: (typeof CATEGORIES)[number], lang: Language): string {
  return lang === "en" ? c.en.label : c.label;
}

export function categoryHelp(c: (typeof CATEGORIES)[number], lang: Language): string {
  return lang === "en" ? c.en.help : c.help;
}

function tog(key: PreferenceKey, categories: Category[], label: string, help: string): SettingDef {
  return { key, kind: "A", categories: [...categories], label, help, control: "toggle" };
}

function pick(key: PreferenceKey, categories: Category[], label: string, help: string, options: [string | number, string][]): SettingDef {
  return { key, kind: "A", categories: [...categories], label, help, control: "choice", options: options.map(([value, text]) => ({ value, label: text })) };
}

function col(key: PreferenceKey, categories: Category[], label: string, help: string): SettingDef {
  return { key, kind: "A", categories: [...categories], label, help, control: "color" };
}

/** Which settings each specific need brings up. */
const NEED_SETTINGS: Partial<Record<Category, PreferenceKey[]>> = {
  color: ["colorFilter", "saturation", "textColor", "backgroundColor", "linkColor", "buttonColor", "highlightLinks", "outlineControls", "contrast"],
  light: ["brightness", "warmth", "saturation", "contrast", "backgroundColor", "textColor", "hideBackgroundImages", "hideImages", "reduceMotion", "breakReminder"],
  seizure: ["flashGuard", "reduceMotion", "stopAutoplay", "hideVideos", "hideDistractions", "saturation", "brightness"],
  attention: ["readerMode", "hidePopups", "hideSidebars", "hideComments", "hideSocial", "collapseMenus", "focusMode", "hideDistractions", "simpleMode", "readingGuide", "reduceMotion", "stopAutoplay", "hideImages", "hideVideos", "hideFooter", "breakReminder", "flatDesign"],
  sensory: ["hidePopups", "muteAudio", "stopAutoplay", "flashGuard", "reduceMotion", "saturation", "brightness", "hideDistractions", "hideVideos", "flatDesign", "warmth"],
  tremor: ["clickGuard", "largeTargets", "dwellClick", "largeCursor", "cursorColor", "noDrag", "extendedTimeouts", "confirmActions", "pageZoom"],
  oneHand: ["handedness", "largeTargets", "noDrag", "dwellClick", "skipLink", "extendedTimeouts", "clickGuard"],
  memory: ["readerMode", "aiSimplify", "simplifyParagraphs", "collapseMenus", "hidePopups", "simpleMode", "stepByStep", "confirmActions", "plainLanguage", "aiHelp", "iconLabels", "extendedTimeouts", "hideDistractions", "warnExternalLinks", "emphasizeHeadings"],
  dyslexia: ["readerMode", "singleColumn", "simplifyParagraphs", "dyslexiaFont", "fontFamily", "letterSpacing", "wordSpacing", "lineSpacing", "paragraphSpacing", "textAlign", "maxLineWidth", "noItalics", "noUppercase", "readingGuide", "readingRuler", "backgroundColor", "tts", "ttsRate", "readOnSelect"],
  numbers: ["clearNumbers", "fontScale", "confirmActions", "plainLanguage", "stepByStep", "tts", "extendedTimeouts"],
  speech: ["simplifyParagraphs", "plainLanguage", "iconLabels", "aiHelp", "tts", "ttsRate", "stepByStep", "extendedTimeouts"],
  fatigue: ["extendedTimeouts", "brightness", "warmth", "largeTargets", "reduceMotion", "breakReminder", "hideDistractions", "simpleMode", "dwellClick", "tts"],
};
for (const [category, keys] of Object.entries(NEED_SETTINGS) as [Category, PreferenceKey[]][]) {
  for (const key of keys) SETTINGS.find((s) => s.key === key)!.categories.push(category);
}

export type SettingGroup = "text" | "colors" | "display" | "media" | "layout" | "pointer" | "reading" | "motor" | "sound" | "voice" | "help" | "general";

export const GROUPS: { id: SettingGroup; label: string; en: string }[] = [
  { id: "text", label: "Yazı", en: "Text" },
  { id: "colors", label: "Rənglər", en: "Colours" },
  { id: "display", label: "Ekran", en: "Screen" },
  { id: "media", label: "Şəkil, video və səs", en: "Pictures, video and sound" },
  { id: "layout", label: "Səhifənin quruluşu", en: "Page layout" },
  { id: "pointer", label: "Kursor və seçim", en: "Pointer and selection" },
  { id: "reading", label: "Oxumağa kömək", en: "Reading aids" },
  { id: "motor", label: "Toxunma və hərəkət", en: "Touch and movement" },
  { id: "sound", label: "Eşitmə və altyazı", en: "Hearing and captions" },
  { id: "voice", label: "Səsli oxunuş", en: "Reading aloud" },
  { id: "help", label: "Sadələşdirmə və qoruma", en: "Simplifying and protection" },
  { id: "general", label: "Ümumi", en: "General" },
];

const GROUP_OF: Record<PreferenceKey, SettingGroup> = {
  fontScale: "text", lineSpacing: "text", letterSpacing: "text", dyslexiaFont: "text", highlightLinks: "text", fontFamily: "text", fontWeight: "text", wordSpacing: "text", paragraphSpacing: "text", textAlign: "text", maxLineWidth: "text", noItalics: "text", noUppercase: "text", emphasizeHeadings: "text", clearNumbers: "text",
  contrast: "colors", colorFilter: "colors", textColor: "colors", backgroundColor: "colors", linkColor: "colors", headingColor: "colors", buttonColor: "colors", buttonTextColor: "colors", borderColor: "colors",
  brightness: "display", saturation: "display", warmth: "display", pageZoom: "display", flatDesign: "display", outlineControls: "display", reduceMotion: "display",
  hideImages: "media", hoverZoom: "media", hideVideos: "media", hideBackgroundImages: "media", flashGuard: "media", stopAutoplay: "media", muteAudio: "media",
  simpleMode: "layout", hideDistractions: "layout", unstickHeaders: "layout", hideFooter: "layout", skipLink: "layout", readerMode: "layout", singleColumn: "layout", collapseMenus: "layout", hideSidebars: "layout", hidePopups: "layout", hideComments: "layout", hideSocial: "layout",
  largeCursor: "pointer", cursorColor: "pointer", strongFocus: "pointer", focusColor: "pointer", hoverHighlight: "pointer",
  readingRuler: "reading", readingGuide: "reading", focusMode: "reading",
  largeTargets: "motor", extendedTimeouts: "motor", noDrag: "motor", clickGuard: "motor", dwellClick: "motor", handedness: "motor",
  captions: "sound", captionSize: "sound", captionStyle: "sound", visualAlerts: "sound", transcripts: "sound", signLanguage: "sound",
  tts: "voice", ttsRate: "voice", ttsPitch: "voice", ttsVolume: "voice", readOnSelect: "voice", readOnHover: "voice",
  aiSimplify: "help", simplifyParagraphs: "help", plainLanguage: "help", stepByStep: "help", confirmActions: "help", iconLabels: "help", aiHelp: "help", warnExternalLinks: "help", breakReminder: "help",
  screenReader: "general", language: "general",
};

export const groupOf = (key: PreferenceKey): SettingGroup => GROUP_OF[key];

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
  if (def.control === "color") {
    if (typeof value !== "string" || !(value === "default" || /^#[0-9a-f]{6}$/i.test(value))) throw new PreferenceError(`${key} must be "default" or #rrggbb`, key);
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
  vision: { fontScale: 1.5, contrast: "high", strongFocus: true, largeTargets: true, highlightLinks: true, aiHelp: true },
  hearing: { captions: true, visualAlerts: true, transcripts: true },
  motor: { largeTargets: true, extendedTimeouts: true, noDrag: true, reduceMotion: true, largeCursor: true },
  cognitive: { simpleMode: true, hideDistractions: true, confirmActions: true, iconLabels: true, stepByStep: true, plainLanguage: true, aiHelp: true },
  reading: { lineSpacing: 1.5, readingRuler: true, tts: true, ttsRate: 0.8, aiHelp: true },
  tech: { fontScale: 1.25, simpleMode: true, largeTargets: true, confirmActions: true, extendedTimeouts: true, iconLabels: true, aiHelp: true },
  color: { outlineControls: true, highlightLinks: true },
  light: { brightness: 0.85, warmth: 0.3, hideBackgroundImages: true },
  seizure: { flashGuard: true, reduceMotion: true, stopAutoplay: true },
  attention: { hidePopups: true, hideSidebars: true, focusMode: true, hideDistractions: true, reduceMotion: true, stopAutoplay: true, readingGuide: true },
  sensory: { muteAudio: true, stopAutoplay: true, flashGuard: true, reduceMotion: true, saturation: 0.5, hideDistractions: true },
  tremor: { clickGuard: true, largeTargets: true, largeCursor: true, noDrag: true, extendedTimeouts: true, confirmActions: true },
  oneHand: { largeTargets: true, noDrag: true, skipLink: true },
  memory: { aiSimplify: true, collapseMenus: true, hidePopups: true, simpleMode: true, stepByStep: true, confirmActions: true, plainLanguage: true, aiHelp: true, hideDistractions: true, extendedTimeouts: true, warnExternalLinks: true },
  dyslexia: { dyslexiaFont: true, lineSpacing: 1.5, letterSpacing: 0.05, wordSpacing: 0.2, textAlign: "left", noItalics: true, noUppercase: true, readingGuide: true, tts: true },
  numbers: { clearNumbers: true, fontScale: 1.25, confirmActions: true },
  speech: { plainLanguage: true, iconLabels: true, aiHelp: true, tts: true },
  fatigue: { extendedTimeouts: true, largeTargets: true, reduceMotion: true, brightness: 0.85, hideDistractions: true, breakReminder: 40 },
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
export function describeValue(key: PreferenceKey, value: unknown, lang: Language = "az"): string {
  const def = SETTING_BY_KEY.get(key);
  if (!def) return `${key}: ${String(value)}`;
  const label = settingLabel(def, lang);
  if (def.control === "toggle") return `${label}: ${value ? (lang === "en" ? "on" : "açıq") : lang === "en" ? "off" : "bağlı"}`;
  if (def.control === "color") return `${label}: ${value === "default" ? (lang === "en" ? "normal" : "normal") : String(value)}`;
  return `${label}: ${optionLabel(def, value as string | number, lang)}`;
}

export function changedKeys(prefs: Preferences, base: Preferences = DEFAULT_PREFERENCES): PreferenceKey[] {
  return (Object.keys(base) as (keyof Preferences)[]).filter((k) => k !== "version" && prefs[k] !== base[k]) as PreferenceKey[];
}

export function settingDef(key: PreferenceKey): SettingDef | undefined {
  return SETTING_BY_KEY.get(key);
}
