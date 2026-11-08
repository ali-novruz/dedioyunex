// Preference engine: applies MƏNƏ UYĞUN preferences to any web page.
// "auto" mode works without any cooperation from the site (generic CSS + DOM scanner).
// "tokens" mode only exposes CSS variables, data attributes and events; the site styles itself.

import { DEFAULT_PREFERENCES, type Preferences } from "./schema";
import { Behaviors } from "./behaviors";

export type Mode = "auto" | "tokens";

export interface EngineOptions {
  mode: Mode;
  /** Origin that serves /fonts (platform origin). */
  assetBase: string;
}

const STYLE_ID = "meneuygun-style";
const SVG_ID = "meneuygun-filters";
const UI = "data-mu-ui"; // marks elements created by the SDK; never scanned or styled by the scanner

const BOOL_ATTRS: (keyof Preferences)[] = [
  "highlightLinks", "largeCursor", "strongFocus", "screenReader", "captions", "visualAlerts", "transcripts",
  "signLanguage", "largeTargets", "extendedTimeouts", "noDrag", "reduceMotion", "simpleMode", "hideDistractions",
  "plainLanguage", "stepByStep", "confirmActions", "iconLabels", "dyslexiaFont", "readingRuler", "tts", "aiHelp",
  "noItalics", "noUppercase", "emphasizeHeadings", "clearNumbers", "flatDesign", "outlineControls", "hideImages", "hoverZoom", "hideVideos", "hideBackgroundImages",
  "flashGuard", "stopAutoplay", "muteAudio", "unstickHeaders", "hideFooter", "skipLink", "hoverHighlight", "readingGuide", "focusMode", "clickGuard", "readOnSelect", "readOnHover", "warnExternalLinks",
  "readerMode", "singleColumn", "collapseMenus", "hideSidebars", "hidePopups", "hideComments", "hideSocial", "aiSimplify", "simplifyParagraphs", "formGuide",
];

// Settings with a value: exposed as data-mu-* and --mu-* when they differ from the default.
const VALUE_KEYS: (keyof Preferences)[] = [
  "fontFamily", "fontWeight", "wordSpacing", "paragraphSpacing", "textAlign", "maxLineWidth", "textColor", "backgroundColor", "linkColor", "headingColor", "buttonColor", "buttonTextColor", "borderColor", "focusColor",
  "brightness", "saturation", "warmth", "pageZoom", "cursorColor", "dwellClick", "handedness", "captionSize", "captionStyle", "ttsPitch", "ttsVolume", "breakReminder", "guardLevel",
];

// Only these need the page re-scanned. Everything else is applied by attributes and CSS, without touching layout.
const DOM_KEYS: (keyof Preferences)[] = ["fontScale", "lineSpacing", "letterSpacing", "contrast", "iconLabels", "captions", "readingRuler", "readingGuide"];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// ---------- color-vision correction (daltonization, Machado 2009 severity 1.0) ----------
type M3 = number[][];
const SIM: Record<string, M3> = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const SHIFT: Record<string, M3> = {
  protanopia: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  deuteranopia: [[0, 0, 0], [0.7, 1, 0], [0.7, 0, 1]],
  tritanopia: [[1, 0, 0.7], [0, 1, 0.7], [0, 0, 0]],
};
function correctionMatrix(kind: string): string {
  const S = SIM[kind], H = SHIFT[kind];
  const rows: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++) {
      // M = I + H · (I − S)
      let v = i === j ? 1 : 0;
      for (let k = 0; k < 3; k++) v += H[i][k] * ((k === j ? 1 : 0) - S[k][j]);
      row.push(+v.toFixed(5));
    }
    rows.push([...row, 0, 0]);
  }
  rows.push([0, 0, 0, 1, 0]);
  return rows.map((r) => r.join(" ")).join("  ");
}

const CURSOR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 4 L6 40 L15 31 L21 45 L28 42 L22 28 L35 28 Z' fill='%23000' stroke='%23fff' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E\") 6 4, auto";
const CURSOR_POINTER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 4 L6 40 L15 31 L21 45 L28 42 L22 28 L35 28 Z' fill='%230b6e4f' stroke='%23fff' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E\") 6 4, pointer";

const CURSOR_FILL: Record<string, string> = { black: "%23000", white: "%23fff", yellow: "%23ffd600", red: "%23d50000", blue: "%230d47a1" };
const colouredCursor = (fill: string, kind: string) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 4 L6 40 L15 31 L21 45 L28 42 L22 28 L35 28 Z' fill='${fill}' stroke='${fill === "%23000" ? "%23fff" : "%23000"}' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") 6 4, ${kind}`;

const FONT_STACK: Record<string, string> = {
  sans: 'Verdana, Tahoma, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Consolas, "Courier New", monospace',
  rounded: 'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
};

function buildCss(assetBase: string): string {
  const A = "html.mu-auto";
  const font = (w: number, sub: string, range: string) =>
    `@font-face{font-family:"MU Lexend";font-style:normal;font-display:swap;font-weight:${w};src:url("${assetBase}/fonts/lexend-${sub}-${w}-normal.woff2") format("woff2");unicode-range:${range}}`;
  const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
  const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
  const notIcon = ":not(i):not(code):not(pre):not(kbd):not(samp):not([class*='icon']):not([class*='fa-']):not([class*='material']):not([class*='glyphicon']):not([aria-hidden='true'])";
  return [
    font(400, "latin", LATIN), font(400, "latin-ext", LATIN_EXT), font(700, "latin", LATIN), font(700, "latin-ext", LATIN_EXT),
    // text scaling + spacing (values set per element by the scanner)
    `${A}.mu-scaling [data-mu-fs]{font-size:var(--mu-fs)!important}`,
    `${A}.mu-scaling [data-mu-lh]{line-height:var(--mu-lhv)!important}`,
    `${A}.mu-scaling [data-mu-c]{color:var(--mu-color)!important;-webkit-text-fill-color:var(--mu-color)!important;text-shadow:none!important}`,
    `${A}.mu-scaling[data-mu-letter-spacing] [data-mu-t]{letter-spacing:calc(var(--mu-letter-spacing)*1em)!important;word-spacing:calc(var(--mu-letter-spacing)*2em)!important}`,
    // contrast and color filters are composed into one filter on <html>
    `${A}[data-mu-filter]{filter:var(--mu-filter)!important}`,
    `${A}[data-mu-contrast='dark'] :is(img,video,picture,canvas,iframe,embed,object,svg image,[data-mu-no-invert]){filter:invert(1) hue-rotate(180deg)!important}`,
    `${A}[data-mu-contrast='dark']{background:#fff!important}`,
    // links
    `${A}[data-mu-highlight-links] a[href]:not([role=button]):not([class*='btn']):not([class*='button']){text-decoration:underline!important;text-decoration-thickness:.12em!important;text-underline-offset:.18em!important;font-weight:700!important}`,
    // cursor
    `${A}[data-mu-large-cursor],${A}[data-mu-large-cursor] *{cursor:${CURSOR}!important}`,
    `${A}[data-mu-large-cursor] :is(a[href],button,[role=button],label,summary,select,input[type=checkbox],input[type=radio]){cursor:${CURSOR_POINTER}!important}`,
    // focus
    `${A}[data-mu-strong-focus] :is(:focus-visible,input:focus,select:focus,textarea:focus){outline:4px solid #ffbf00!important;outline-offset:3px!important;box-shadow:0 0 0 8px #111!important}`,
    // large targets
    `${A}[data-mu-large-targets] :is(button,[role=button],input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea,summary){min-height:48px!important}`,
    `${A}[data-mu-large-targets] :is(button,[role=button]){min-width:48px!important}`,
    `${A}[data-mu-large-targets] :is(input[type=checkbox],input[type=radio]){width:28px!important;height:28px!important}`,
    // motion
    `${A}[data-mu-reduce-motion] *,${A}[data-mu-reduce-motion] *::before,${A}[data-mu-reduce-motion] *::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}`,
    // distractions (ads, marked elements)
    `${A}:is([data-mu-hide-distractions],[data-mu-simple-mode]) :is([data-mu-distraction],ins.adsbygoogle,iframe[src*='doubleclick'],iframe[src*='googlesyndication'],iframe[id^='google_ads'],div[id^='google_ads'],[id^='div-gpt-ad'],.advertisement,.ad-banner,[aria-label='Advertisement'],marquee){display:none!important}`,
    // simple mode: site-marked secondary content and sidebars
    `${A}[data-mu-simple-mode] :is([data-mu-simple='hide'],aside:not([data-mu-simple='keep']),[role='complementary']:not([data-mu-simple='keep'])){display:none!important}`,
    `${A}[data-mu-simple-mode] [data-mu-simple='primary']{outline:3px solid #262626!important;outline-offset:4px!important;font-weight:700!important}`,
    // readable font
    `${A}[data-mu-dyslexia-font] body,${A}[data-mu-dyslexia-font] body *${notIcon}{font-family:"MU Lexend",system-ui,sans-serif!important}`,
    // icon labels inserted by the scanner
    `${A} [data-mu-labeled]{width:auto!important;min-width:max-content!important;padding-inline:.5em!important;display:inline-flex!important;align-items:center!important}`,
    `${A} [${UI}='icon-label']{display:inline-block!important;margin-inline-start:.35em!important;font-size:.85em!important;font-weight:700!important;line-height:1.2!important;vertical-align:middle!important;white-space:nowrap!important}`,
    ...extraCss(A, notIcon),
    // reading ruler
    `[${UI}='ruler']{position:fixed;left:0;right:0;pointer-events:none;z-index:2147483646;background:rgba(0,0,0,.45);transition:none}`,
    `[${UI}='ruler-band']{position:fixed;left:0;right:0;pointer-events:none;z-index:2147483646;border-top:3px solid #ffbf00;border-bottom:3px solid #ffbf00;background:rgba(255,230,0,.12)}`,
  ].join("\n");
}

/** Everything the user can change about how a page looks. Page content only: the SDK's own UI is excluded. */
function extraCss(A: string, notIcon: string): string[] {
  const mine = `:not([${UI}]):not([${UI}] *)`;
  const all = `body *${mine}`;
  const block = `:is(p,li,h1,h2,h3,h4,td,blockquote,dd)${mine}`;
  const headings = `:is(h1,h2,h3,h4,h5,h6)${mine}`;
  const buttons = `:is(button,[role=button],input[type=submit],input[type=button],.btn)${mine}`;
  const controls = `:is(a[href],button,[role=button],input,select,textarea,summary)${mine}`;
  const media = "img,picture,video,canvas,svg,iframe";
  return [
    // text
    ...Object.entries(FONT_STACK).map(([v, stack]) => `${A}[data-mu-font-family='${v}'] body *${notIcon}${mine}{font-family:${stack}!important}`),
    `${A}[data-mu-font-weight='medium'] ${all}${notIcon}{font-weight:500!important}`,
    `${A}[data-mu-font-weight='bold'] ${all}${notIcon}{font-weight:700!important}`,
    `${A}[data-mu-word-spacing] ${all}{word-spacing:calc(var(--mu-word-spacing)*1em)!important}`,
    `${A}[data-mu-paragraph-spacing] :is(p,li)${mine}{margin-bottom:calc(var(--mu-paragraph-spacing)*1em)!important}`,
    `${A}[data-mu-text-align='left'] ${block}{text-align:left!important}`,
    `${A}[data-mu-max-line-width] ${block}{max-width:var(--mu-max-line-width)!important}`,
    `${A}[data-mu-no-italics] ${all}${notIcon}{font-style:normal!important}`,
    `${A}[data-mu-no-uppercase] ${all}{text-transform:none!important;font-variant-caps:normal!important}`,
    `${A}[data-mu-emphasize-headings] ${headings}{font-weight:800!important;border-bottom:3px solid currentColor!important;padding-bottom:.15em!important}`,
    `${A}[data-mu-clear-numbers] ${all}{font-variant-numeric:tabular-nums lining-nums slashed-zero!important}`,
    // colours
    `${A}[data-mu-background-color],${A}[data-mu-background-color] body{background:var(--mu-background-color)!important}`,
    `${A}[data-mu-background-color] :is(div,section,article,main,header,footer,nav,aside,ul,ol,li,p,table,tr,td,th,form,fieldset)${mine}{background-color:var(--mu-background-color)!important;background-image:none!important}`,
    `${A}[data-mu-text-color] body,${A}[data-mu-text-color] ${all}:not(a):not(button):not(svg):not(svg *){color:var(--mu-text-color)!important;-webkit-text-fill-color:var(--mu-text-color)!important}`,
    `${A}[data-mu-heading-color] ${headings}{color:var(--mu-heading-color)!important;-webkit-text-fill-color:var(--mu-heading-color)!important}`,
    `${A}[data-mu-link-color] a[href]${mine},${A}[data-mu-link-color] a[href]${mine} *{color:var(--mu-link-color)!important;-webkit-text-fill-color:var(--mu-link-color)!important}`,
    `${A}[data-mu-button-color] ${buttons}{background-color:var(--mu-button-color)!important;background-image:none!important}`,
    `${A}[data-mu-button-text-color] ${buttons},${A}[data-mu-button-text-color] ${buttons} *{color:var(--mu-button-text-color)!important;-webkit-text-fill-color:var(--mu-button-text-color)!important}`,
    `${A}[data-mu-border-color] ${all}{border-color:var(--mu-border-color)!important}`,
    `${A}[data-mu-focus-color] :is(:focus-visible,input:focus,select:focus,textarea:focus){outline:4px solid var(--mu-focus-color)!important;outline-offset:3px!important}`,
    // display
    `${A}[data-mu-page-zoom]{zoom:var(--mu-page-zoom)!important}`,
    `${A}[data-mu-flat-design] ${all}{box-shadow:none!important;text-shadow:none!important;border-radius:0!important}`,
    `${A}[data-mu-outline-controls] ${controls}{outline:2px solid currentColor!important;outline-offset:1px!important}`,
    // images and media
    `${A}[data-mu-hide-images] :is(img,picture,[role=img]:not(svg))${mine}{display:none!important}`,
    `${A}[data-mu-hover-zoom] img${mine}{transition:transform .15s ease-out!important}`,
    `${A}[data-mu-hover-zoom] img${mine}:hover{transform:scale(1.8)!important;position:relative!important;z-index:2147483000!important}`,
    `${A}[data-mu-hide-videos] :is(video,iframe[src*='youtube'],iframe[src*='youtu.be'],iframe[src*='vimeo'],iframe[src*='tiktok'])${mine}{display:none!important}`,
    `${A}[data-mu-hide-background-images] body,${A}[data-mu-hide-background-images] ${all}{background-image:none!important}`,
    `${A}[data-mu-flash-guard] *,${A}[data-mu-flash-guard] *::before,${A}[data-mu-flash-guard] *::after{animation:none!important;transition:none!important}`,
    `${A}[data-mu-flash-guard] marquee${mine}{display:none!important}`,
    // page structure
    `${A} [data-mu-unstick]{position:static!important}`,
    `${A}[data-mu-hide-footer] :is(footer,[role=contentinfo])${mine}{display:none!important}`,
    // pointer
    ...Object.entries(CURSOR_FILL).flatMap(([v, fill]) => [
      `${A}[data-mu-cursor-color='${v}'],${A}[data-mu-cursor-color='${v}'] *{cursor:${colouredCursor(fill, "auto")}!important}`,
      `${A}[data-mu-cursor-color='${v}'] :is(a[href],button,[role=button],label,summary,select){cursor:${colouredCursor(fill, "pointer")}!important}`,
    ]),
    `${A}[data-mu-hover-highlight] :is(a[href],button,[role=button],input,select,textarea,summary,p,li,h1,h2,h3)${mine}:hover{outline:3px solid var(--mu-focus-color,#ffbf00)!important;outline-offset:2px!important}`,
    `${A}[data-mu-focus-mode] ${block}{opacity:.35!important}`,
    `${A}[data-mu-focus-mode] ${block}:hover,${A}[data-mu-focus-mode] ${block}:focus-within{opacity:1!important}`,
    `${A}[data-mu-reading-guide]:not([data-mu-reading-ruler]) [${UI}='ruler']{background:transparent!important}`,
    `${A} [data-mu-dwell]{outline:4px dashed currentColor!important;outline-offset:2px!important}`,
    // simplifying complicated sites
    `${A} [data-mu-rd-hide]{display:none!important}`,
    `${A} [data-mu-rd-main]{max-width:72ch!important;margin-inline:auto!important;float:none!important}`,
    `${A} [data-mu-collapsed]{display:none!important}`,
    `${A} [data-mu-ai-hidden]{display:none!important}`,
    `${A} [data-mu-fg-hidden]{display:none!important}`,
    `${A}[data-mu-single-column] :is(main,section,[class*='grid' i],[class*='row' i],[class*='columns' i],[class*='flex' i])${mine}{display:block!important}`,
    `${A}[data-mu-single-column] :is(main,article,section,div)${mine}{float:none!important;width:auto!important;max-width:100%!important}`,
    `${A}[data-mu-hide-sidebars] :is(aside,[role=complementary],[class*='sidebar' i],[id*='sidebar' i])${mine}:not([data-mu-simple='keep']){display:none!important}`,
    `${A}[data-mu-hide-popups] :is([class*='cookie' i],[id*='cookie' i],[class*='newsletter' i],[class*='gdpr' i],[id*='onetrust' i],[class*='modal-backdrop' i],[class*='popup' i],[id*='popup' i])${mine}{display:none!important}`,
    `${A}[data-mu-hide-comments] :is([id*='comment' i],[class*='comment' i],[id*='disqus' i])${mine}{display:none!important}`,
    `${A}[data-mu-hide-social] :is([class*='social' i],[class*='share' i],[id*='share' i],a[href*='facebook.com/sharer'],a[href*='twitter.com/intent'],a[href*='wa.me'])${mine}{display:none!important}`,
    // captions
    `${A}[data-mu-caption-size] video::cue{font-size:calc(var(--mu-caption-size)*1em)!important}`,
    `${A}[data-mu-caption-style='yellow'] video::cue{color:#ffeb3b!important;background:#000!important}`,
    `${A}[data-mu-caption-style='white'] video::cue{color:#000!important;background:#fff!important}`,
    // our own small page elements
    `[${UI}='skip']{position:fixed;left:8px;top:-80px;z-index:2147483647;padding:.7em 1em;background:#262626;color:#f5bc4a;font:700 16px system-ui,sans-serif}`,
    `[${UI}='skip']:focus{top:8px}`,
    `[${UI}='break']{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:2147483647;padding:.8em 1.2em;background:#262626;color:#f3f3f3;border-radius:3px;font:600 17px system-ui,sans-serif}`,
  ];
}

function filterFor(p: Preferences): string {
  const parts: string[] = [];
  if (p.contrast === "high") parts.push("contrast(1.15)");
  if (p.contrast === "dark") parts.push("invert(1) hue-rotate(180deg)");
  if (p.colorFilter === "grayscale") parts.push("grayscale(1)");
  else if (p.colorFilter !== "none") parts.push(`url("#mu-cf-${p.colorFilter}")`);
  if (p.brightness !== 1) parts.push(`brightness(${p.brightness})`);
  if (p.saturation !== 1) parts.push(`saturate(${p.saturation})`);
  if (p.warmth !== 0) parts.push(`sepia(${p.warmth})`);
  return parts.join(" ");
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK", "svg", "SVG", "CANVAS", "VIDEO", "AUDIO", "IFRAME", "OBJECT"]);
const FORM_TEXT = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]),textarea,select,button";

type RGBA = [number, number, number, number];
function parseColor(v: string): RGBA | null {
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}
function luminance([r, g, b]: RGBA): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: RGBA, b: RGBA): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function blend(top: RGBA, under: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

function inOwnUi(el: Element): boolean {
  return !!el.closest(`[${UI}]`);
}

/** Elements that directly render text (own text nodes or form controls) inside `root`. */
function collectTextElements(root: Node): Set<HTMLElement> {
  const out = new Set<HTMLElement>();
  const doc = root.ownerDocument ?? (root as Document);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || out.has(el as HTMLElement)) continue;
    if (SKIP_TAGS.has(el.tagName) || el.closest("svg") || inOwnUi(el)) continue;
    out.add(el as HTMLElement);
  }
  if (root instanceof Element || root instanceof Document) {
    const base = root as Element | Document;
    if (root instanceof Element && root.matches(FORM_TEXT) && !inOwnUi(root)) out.add(root as HTMLElement);
    base.querySelectorAll<HTMLElement>(FORM_TEXT).forEach((el) => { if (!inOwnUi(el)) out.add(el); });
  }
  return out;
}

export class PreferenceEngine {
  private prefs: Preferences = DEFAULT_PREFERENCES;
  private observer: MutationObserver | null = null;
  private pending = new Set<Node>();
  private frame = 0;
  private marked = new Set<HTMLElement>();
  private labels = new Set<HTMLElement>();
  private rulerEls: HTMLElement[] = [];
  private applied = false;
  private behaviors: Behaviors;
  private onPointer = (e: PointerEvent | MouseEvent | TouchEvent) => this.moveRuler(e);
  private readonly html: HTMLElement;

  constructor(private readonly doc: Document, private readonly opts: EngineOptions) {
    this.html = doc.documentElement;
    this.behaviors = new Behaviors(doc);
  }

  get current(): Preferences {
    return this.prefs;
  }

  /** Apply preferences. Safe to call before <body> exists (scanner starts on DOMContentLoaded). */
  apply(prefs: Preferences): void {
    const previous = this.prefs;
    this.prefs = prefs;
    this.writeRootState();
    if (this.opts.mode !== "auto") return;
    this.ensureStyle();
    this.ensureFilters();
    if (this.doc.readyState === "loading") {
      this.doc.addEventListener("DOMContentLoaded", () => this.applyDom(), { once: true });
    } else if (!this.applied || DOM_KEYS.some((k) => previous[k] !== prefs[k])) {
      this.applyDom();
    }
    this.behaviors.apply(prefs);
  }

  /** Remove everything the engine added. */
  reset(): void {
    this.prefs = DEFAULT_PREFERENCES;
    this.applied = false;
    this.writeRootState();
    this.clearDom();
    this.behaviors.clear();
    this.stopObserver();
  }

  // ---------- root attributes and variables (both modes) ----------
  private writeRootState(): void {
    const p = this.prefs, h = this.html, s = h.style;
    s.setProperty("--mu-font-scale", String(p.fontScale));
    s.setProperty("--mu-line-spacing", String(p.lineSpacing));
    s.setProperty("--mu-letter-spacing", String(p.letterSpacing));
    s.setProperty("--mu-tts-rate", String(p.ttsRate));
    for (const k of BOOL_ATTRS) {
      const name = "data-mu-" + kebab(k);
      if (p[k]) h.setAttribute(name, ""); else h.removeAttribute(name);
    }
    const setOrRemove = (name: string, value: string | null) => (value === null ? h.removeAttribute(name) : h.setAttribute(name, value));
    setOrRemove("data-mu-contrast", p.contrast === "normal" ? null : p.contrast);
    setOrRemove("data-mu-color-filter", p.colorFilter === "none" ? null : p.colorFilter);
    setOrRemove("data-mu-font-scale", p.fontScale === 1 ? null : String(p.fontScale));
    setOrRemove("data-mu-line-spacing", p.lineSpacing === 1 ? null : String(p.lineSpacing));
    setOrRemove("data-mu-letter-spacing", p.letterSpacing === 0 ? null : String(p.letterSpacing));
    h.setAttribute("data-mu-language", p.language);
    for (const k of VALUE_KEYS) {
      const name = kebab(k);
      if (p[k] === DEFAULT_PREFERENCES[k]) {
        h.removeAttribute("data-mu-" + name);
        s.removeProperty("--mu-" + name);
      } else {
        h.setAttribute("data-mu-" + name, String(p[k]));
        s.setProperty("--mu-" + name, String(p[k]));
      }
    }
    const filter = filterFor(p);
    if (this.opts.mode === "auto" && filter) {
      s.setProperty("--mu-filter", filter);
      h.setAttribute("data-mu-filter", "");
    } else {
      s.removeProperty("--mu-filter");
      h.removeAttribute("data-mu-filter");
    }
    h.classList.toggle("mu-auto", this.opts.mode === "auto");
  }

  private ensureStyle(): void {
    if (this.doc.getElementById(STYLE_ID)) return;
    const style = this.doc.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute(UI, "style");
    style.textContent = buildCss(this.opts.assetBase);
    (this.doc.head ?? this.html).appendChild(style);
  }

  private ensureFilters(): void {
    if (this.prefs.colorFilter === "none" || this.prefs.colorFilter === "grayscale") return;
    const attach = () => {
      if (this.doc.getElementById(SVG_ID)) return;
      const NS = "http://www.w3.org/2000/svg";
      const svg = this.doc.createElementNS(NS, "svg");
      svg.id = SVG_ID;
      svg.setAttribute(UI, "filters");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
      for (const kind of Object.keys(SIM)) {
        const f = this.doc.createElementNS(NS, "filter");
        f.id = `mu-cf-${kind}`;
        const m = this.doc.createElementNS(NS, "feColorMatrix");
        m.setAttribute("type", "matrix");
        m.setAttribute("values", correctionMatrix(kind));
        f.appendChild(m);
        svg.appendChild(f);
      }
      this.doc.body.appendChild(svg);
    };
    if (this.doc.body) attach(); else this.doc.addEventListener("DOMContentLoaded", attach, { once: true });
  }

  // ---------- DOM features (auto mode) ----------
  private needsTextScan(): boolean {
    const p = this.prefs;
    return p.fontScale !== 1 || p.lineSpacing !== 1 || p.letterSpacing !== 0 || p.contrast === "high";
  }

  private applyDom(): void {
    if (!this.doc.body) return;
    this.applied = true;
    this.clearDom();
    const p = this.prefs;
    if (this.needsTextScan()) {
      this.html.classList.add("mu-scaling");
      this.scanText(collectTextElements(this.doc.body));
    }
    if (p.iconLabels) this.addIconLabels(this.doc.body);
    if (p.captions) this.enableCaptions(this.doc.body);
    if (p.readingRuler || p.readingGuide) this.startRuler();
    if (this.needsTextScan() || p.iconLabels || p.captions) this.startObserver();
  }

  private clearDom(): void {
    for (const el of this.marked) {
      el.removeAttribute("data-mu-t");
      el.removeAttribute("data-mu-fs");
      el.removeAttribute("data-mu-lh");
      el.removeAttribute("data-mu-c");
      el.style.removeProperty("--mu-fs");
      el.style.removeProperty("--mu-lhv");
      el.style.removeProperty("--mu-color");
    }
    this.marked.clear();
    this.html.classList.remove("mu-scaling");
    for (const l of this.labels) {
      l.parentElement?.removeAttribute("data-mu-labeled");
      l.remove();
    }
    this.labels.clear();
    this.stopRuler();
  }

  /**
   * Text scaling that works for px-, rem- and em-based sites alike:
   * 1) read every text element's original size with all overrides disabled,
   * 2) write an explicit px size (original × scale) and a proportional line-height.
   * Layout spacing is untouched, only text grows.
   */
  private scanText(elements: Set<HTMLElement>): void {
    const els = [...elements].filter((el) => el.isConnected && !this.marked.has(el));
    if (els.length === 0) return;
    const p = this.prefs;
    const h = this.html;
    h.classList.remove("mu-scaling");
    const fixContrast = p.contrast === "high";
    const bgCache = new Map<Element, RGBA | null>();
    const measured = els.map((el) => {
      const cs = getComputedStyle(el);
      return { el, fs: parseFloat(cs.fontSize), lh: cs.lineHeight, color: fixContrast ? this.betterColor(el, cs, bgCache) : null };
    });
    h.classList.add("mu-scaling");
    for (const { el, fs, lh, color } of measured) {
      if (!fs) continue;
      if (color) {
        el.style.setProperty("--mu-color", color);
        el.setAttribute("data-mu-c", "");
      }
      const size = fs * p.fontScale;
      el.setAttribute("data-mu-t", "");
      if (p.fontScale !== 1) {
        el.style.setProperty("--mu-fs", `${+size.toFixed(2)}px`);
        el.setAttribute("data-mu-fs", "");
      }
      const origLh = lh === "normal" ? null : parseFloat(lh);
      let target: number | null = origLh !== null && p.fontScale !== 1 ? origLh * p.fontScale : null;
      if (p.lineSpacing !== 1) {
        const spaced = size * (0.8 + 0.6 * p.lineSpacing); // 1.5 → 1.7×, 2 → 2.0×
        target = Math.max(target ?? 0, spaced);
      }
      if (target !== null) {
        el.style.setProperty("--mu-lhv", `${+target.toFixed(2)}px`);
        el.setAttribute("data-mu-lh", "");
      }
      this.marked.add(el);
    }
  }

  /** Background colour behind an element, or null when it sits on an image/gradient (unknown). */
  private backgroundOf(el: Element | null, cache: Map<Element, RGBA | null>): RGBA | null {
    if (!el) return [255, 255, 255, 1];
    if (cache.has(el)) return cache.get(el)!;
    const cs = getComputedStyle(el);
    let out: RGBA | null;
    if (cs.backgroundImage && cs.backgroundImage !== "none") out = null;
    else {
      const c = parseColor(cs.backgroundColor);
      const under = this.backgroundOf(el.parentElement, cache);
      if (!c || c[3] === 0) out = under;
      else if (c[3] >= 1) out = c;
      else out = under ? blend(c, under) : null;
    }
    cache.set(el, out);
    return out;
  }

  /** For "high" contrast: returns black or white when the text is below WCAG AAA (7:1) on its background. */
  private betterColor(el: HTMLElement, cs: CSSStyleDeclaration, cache: Map<Element, RGBA | null>): string | null {
    const fg = parseColor(cs.color);
    const bg = this.backgroundOf(el, cache);
    if (!fg || !bg) return null;
    const shown = fg[3] < 1 ? blend(fg, bg) : fg;
    if (contrastRatio(shown, bg) >= 7) return null;
    const black: RGBA = [0, 0, 0, 1], white: RGBA = [255, 255, 255, 1];
    return contrastRatio(black, bg) >= contrastRatio(white, bg) ? "#000" : "#fff";
  }

  private addIconLabels(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>("button,a[href],[role=button]").forEach((el) => {
      if (inOwnUi(el) || el.querySelector(`[${UI}='icon-label']`)) return;
      if (/\p{L}/u.test(el.textContent ?? "")) return; // already has words (emoji/symbol-only counts as an icon)
      const label = el.getAttribute("aria-label") || el.getAttribute("title") || el.querySelector("img[alt]")?.getAttribute("alt");
      if (!label || !label.trim()) return;
      const span = this.doc.createElement("span");
      span.setAttribute(UI, "icon-label");
      span.setAttribute("aria-hidden", "true");
      span.textContent = label.trim();
      el.appendChild(span);
      el.setAttribute("data-mu-labeled", "");
      this.labels.add(span);
    });
  }

  private enableCaptions(root: ParentNode): void {
    root.querySelectorAll("video").forEach((v) => {
      const tracks = Array.from(v.textTracks).filter((t) => t.kind === "captions" || t.kind === "subtitles");
      if (tracks.length === 0) return;
      const lang = this.prefs.language;
      const pick = tracks.find((t) => t.language.startsWith(lang)) ?? tracks[0];
      tracks.forEach((t) => (t.mode = t === pick ? "showing" : "disabled"));
    });
  }

  private startRuler(): void {
    if (this.rulerEls.length) return;
    const top = this.doc.createElement("div");
    const band = this.doc.createElement("div");
    const bottom = this.doc.createElement("div");
    top.setAttribute(UI, "ruler");
    bottom.setAttribute(UI, "ruler");
    band.setAttribute(UI, "ruler-band");
    top.style.top = "0";
    this.rulerEls = [top, band, bottom];
    this.rulerEls.forEach((e) => this.doc.body.appendChild(e));
    this.placeRuler(this.doc.defaultView ? this.doc.defaultView.innerHeight / 3 : 200);
    this.doc.addEventListener("mousemove", this.onPointer, { passive: true });
    this.doc.addEventListener("touchmove", this.onPointer, { passive: true });
    this.doc.addEventListener("pointerdown", this.onPointer, { passive: true });
  }

  private stopRuler(): void {
    this.rulerEls.forEach((e) => e.remove());
    this.rulerEls = [];
    this.doc.removeEventListener("mousemove", this.onPointer);
    this.doc.removeEventListener("touchmove", this.onPointer);
    this.doc.removeEventListener("pointerdown", this.onPointer);
  }

  private moveRuler(e: PointerEvent | MouseEvent | TouchEvent): void {
    const y = "touches" in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
    if (typeof y === "number") this.placeRuler(y);
  }

  private placeRuler(y: number): void {
    const [top, band, bottom] = this.rulerEls;
    if (!top) return;
    const rootPx = parseFloat(getComputedStyle(this.html).fontSize) || 16;
    const half = rootPx * this.prefs.fontScale * 1.4;
    const a = Math.max(0, y - half), b = y + half;
    top.style.height = `${a}px`;
    band.style.top = `${a}px`;
    band.style.height = `${b - a}px`;
    bottom.style.top = `${b}px`;
    bottom.style.bottom = "0";
  }

  // ---------- dynamic content ----------
  private startObserver(): void {
    if (this.observer || typeof MutationObserver === "undefined") return;
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && inOwnUi(n as Element)) return;
          this.pending.add(n.nodeType === 3 ? (n.parentNode ?? n) : n);
        });
        if (r.type === "characterData" && r.target.parentNode) this.pending.add(r.target.parentNode);
      }
      // Batch at most ~4 rescans per second: busy pages (tickers, chats) must not trigger a full style recalc every frame.
      if (this.pending.size && !this.frame) this.frame = setTimeout(() => this.flush(), 250) as unknown as number;
    });
    this.observer.observe(this.doc.body, { childList: true, subtree: true });
  }

  private stopObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.pending.clear();
  }

  private flush(): void {
    this.frame = 0;
    const nodes = [...this.pending].filter((n) => n.isConnected);
    this.pending.clear();
    if (this.opts.mode !== "auto") return;
    const p = this.prefs;
    if (this.needsTextScan()) {
      const all = new Set<HTMLElement>();
      for (const n of nodes) collectTextElements(n).forEach((e) => all.add(e));
      this.scanText(all);
    }
    for (const n of nodes) {
      if (!(n instanceof Element)) continue;
      if (p.iconLabels) this.addIconLabels(n);
      if (p.captions) this.enableCaptions(n);
    }
  }
}
