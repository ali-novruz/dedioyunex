// Cizzy Web SDK entry. Usage:
//   <script src="https://PLATFORM/sdk.js" data-client-id="YOUR_CLIENT_ID"></script>
// Optional attributes: data-mode="auto|tokens", data-floating="false", data-base-url="https://PLATFORM"

import { PreferenceEngine, type Mode } from "./apply";
import { readPreferences, SETTINGS, DEFAULT_PREFERENCES, settingLabel, type Language, type Preferences, type PreferenceKey } from "./schema";
import { runCheck, type CheckReport } from "./check";
import { ActionGuard } from "./guard";
import { FormGuide } from "./formguide";
import { snapshot, controlFor, aidOf, elementsFor, type PageHelp } from "./assist";
import { setCloudVoice, speak, stopSpeaking, voiceInfo, isSpeechSupported } from "./tts";

const VERSION = "1.0.0";

interface Config {
  clientId: string;
  baseUrl: string;
  mode: Mode;
  floating: boolean;
  /** Type-B settings the site implements itself (data-supports). */
  supports: PreferenceKey[];
  /** Page explainer: "on" = on demand (default), "auto" = also show a short summary under the main heading, "off". */
  ai: "on" | "auto" | "off";
}

type EventName = "preferences" | "connect" | "disconnect" | "error";
type Listener = (detail: unknown) => void;

// ---------- storage (localStorage, in-memory if the browser blocks it) ----------
const memory = new Map<string, string>();
let storageWarned = false;
const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { warnStorage(); return memory.get(k) ?? null; }
  },
  set(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { warnStorage(); memory.set(k, v); }
  },
  del(k: string): void {
    try { localStorage.removeItem(k); } catch { warnStorage(); memory.delete(k); }
  },
};
function warnStorage() {
  if (storageWarned) return;
  storageWarned = true;
  console.warn("[Cizzy] localStorage is blocked; the connection will not survive a page reload.");
}

// ---------- PKCE ----------
function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomString(len = 32): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return b64url(a);
}
async function challengeFor(verifier: string): Promise<string> {
  if (!crypto.subtle) throw new Error("Cizzy requires a secure context (HTTPS or localhost).");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

// ---------- texts ----------
const AZ = {
  connect: "Cizzy-dən ayarları gətir",
  waiting: "Gözləyin…",
  active: "Cizzy ayarları aktiv",
  refresh: "Yenilə",
  edit: "Ayarları dəyiş",
  disconnect: "Ayır",
  popupClosed: "Pəncərə bağlandı. Yenidən cəhd edin.",
  denied: "İcazə verilmədi.",
  failed: "Qoşulmaq alınmadı. Yenidən cəhd edin.",
  listen: "Toxun və dinlə",
  listening: "Oxumaq istədiyiniz yerə toxunun",
  stop: "Dayandır",
  readPage: "Səhifəni oxu",
  noVoice: "Bu brauzerdə səsli oxunuş yoxdur.",
  substitute: "Azərbaycan səsi tapılmadı, türk səsi ilə oxunur.",
  whatPage: "Bu səhifə nədir?",
  whatIsThis: "Bu nədir?",
  whatIsThisOn: "Haqqında bilmək istədiyiniz düyməyə toxunun",
  thinking: "Səhifəni oxuyuram…",
  short: "Qısaca",
  keyPoints: "Əsas məqamlar",
  canDo: "Bu səhifədə nə edə bilərsiniz",
  show: "Göstər",
  readAloud: "Oxu",
  close: "Bağla",
  noExplain: "Bu düymə üçün izah tapılmadı.",
  plain: "Sadə dildə",
  youAreHere: "Siz buradasınız",
  whatToDo: "Nə edim?",
  showAll: "Bütün düymələri göstər",
  supports: "Bu sayt aktiv ayarlarınızdan {a}/{b}-ni dəstəkləyir.",
  unsupported: "Dəstəklənmir",
  checkTitle: "Cizzy yoxlama",
  overflow: "Üfüqi sürüşmə",
  overflowYes: "var",
  overflowNo: "yoxdur",
  clipped: "Kəsilən mətnlər",
  small: "Kiçik toxunma sahələri (<44px)",
  contrast: "Aşağı kontrast (<4.5:1)",
  unnamed: "Adsız ikon düymələr",
};

type Texts = Record<keyof typeof AZ, string>;

const EN: Texts = {
  connect: "Bring my Cizzy settings",
  waiting: "Please wait…",
  active: "My settings are on",
  refresh: "Refresh",
  edit: "Change settings",
  disconnect: "Disconnect",
  popupClosed: "The window was closed. Please try again.",
  denied: "Permission was not given.",
  failed: "Could not connect. Please try again.",
  listen: "Tap and listen",
  listening: "Tap where you want to hear",
  stop: "Stop",
  readPage: "Read this page",
  noVoice: "This browser cannot read aloud.",
  substitute: "No voice was found for this language.",
  whatPage: "What is this page?",
  whatIsThis: "What is this?",
  whatIsThisOn: "Tap the button you want to know about",
  thinking: "Reading the page…",
  short: "In short",
  keyPoints: "Key points",
  canDo: "What you can do here",
  show: "Show",
  readAloud: "Read aloud",
  close: "Close",
  noExplain: "No explanation was found for this button.",
  plain: "In plain words",
  youAreHere: "You are here",
  whatToDo: "What do I do?",
  showAll: "Show all buttons",
  supports: "This site supports {a} of your {b} active settings.",
  unsupported: "Not supported",
  checkTitle: "Cizzy check",
  overflow: "Sideways scrolling",
  overflowYes: "yes",
  overflowNo: "no",
  clipped: "Clipped text",
  small: "Small touch targets (<44px)",
  contrast: "Low contrast (<4.5:1)",
  unnamed: "Icon buttons without a name",
};

const TEXTS: Record<Language, Texts> = { az: AZ, en: EN };
let T: Texts = AZ;

// One authored icon set (24px grid, 2px stroke). Static strings only.
const svg = (d: string) => `<svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  page: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9.5 12h6M9.5 16h6"/>'),
  question: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1.1-1.3 2M12 17h.01"/>'),
  speaker: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="1"/>'),
  pointer: svg('<path d="M9 11V5a1.5 1.5 0 0 1 3 0v6l5.5 1.2a2 2 0 0 1 1.5 2.3l-.8 4A3 3 0 0 1 15.3 21h-3.1a4 4 0 0 1-3.2-1.6L5.5 14.7a1.5 1.5 0 0 1 2.3-2z"/>'),
};

/** A button's words. Visually hidden on phones (see WIDGET_CSS), still read by screen readers. */
function wordsOf(text: string): HTMLElement {
  const t = document.createElement("span");
  t.className = "t";
  t.textContent = text;
  return t;
}

function setLabel(btn: HTMLElement, icon: keyof typeof ICON, text: string): void {
  btn.innerHTML = ICON[icon];
  btn.append(wordsOf(text));
}

// The Cizzy mark: the letter c drawn as a dial with its knob.
const MARK = '<svg viewBox="0 0 40 40" width="1.5em" height="1.5em" aria-hidden="true"><path d="M28.68 9.66A13.5 13.5 0 1 0 28.68 30.34" fill="none" stroke="#262626" stroke-width="7.5" stroke-linecap="round"/><circle cx="28.68" cy="9.66" r="6" fill="#f5bc4a" stroke="#262626" stroke-width="3"/></svg>';

const INK = "#262626", PAPER = "#f3f3f3", FIELD = "#f5bc4a";

const WIDGET_CSS = `
:host{all:initial;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:calc(17px * min(var(--cz-font-scale,1),1.5));color:${INK}}
*{box-sizing:border-box;font:inherit}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:.6em}
button{cursor:pointer;background:${PAPER};color:${INK};border:2px solid ${INK};border-radius:.55em;min-height:2.9em;padding:.55em 1em;font-weight:600;line-height:1.2;display:inline-flex;align-items:center;gap:.5em;box-shadow:4px 4px 0 ${INK};touch-action:manipulation;transition:transform .07s cubic-bezier(.16,1,.3,1),box-shadow .07s cubic-bezier(.16,1,.3,1)}
button:hover:not(:disabled){transform:translate(1px,1px);box-shadow:3px 3px 0 ${INK}}
button:active:not(:disabled){transform:translate(4px,4px);box-shadow:0 0 0 ${INK}}
button:focus-visible{outline:3px solid ${INK};outline-offset:2px;box-shadow:0 0 0 2px ${PAPER},4px 4px 0 2px ${INK}}
button:disabled{cursor:progress}
.primary{background:${FIELD}}
.chip{background:${PAPER}}
.ghost{background:transparent;box-shadow:none;min-height:2.5em;padding:.35em .85em}
.ghost:hover:not(:disabled){background:${INK};color:${PAPER};transform:none;box-shadow:none}
.logo{display:inline-flex;flex:none}
.msg{margin-top:.5em;font-size:.88em;color:#8f1d14;background:${PAPER};border:2px solid #8f1d14;border-radius:3px;padding:.3em .55em}
.note{margin-top:.5em;font-size:.82em;background:${PAPER};color:${INK};border:2px solid ${INK};border-radius:3px;padding:.3em .55em;max-width:22em}
.menu{margin-top:.6em;background:${PAPER};border:2px solid ${INK};border-radius:3px;padding:.6em;display:flex;flex-direction:column;gap:.45em;box-shadow:6px 6px 0 ${INK}}
.on{background:${INK};color:${FIELD};box-shadow:none;transform:translate(4px,4px)}
.window{background:${PAPER};color:${INK};border:2px solid ${INK};border-radius:3px;box-shadow:7px 7px 0 ${INK};width:min(27em,92vw)}
.bar{display:flex;align-items:center;gap:.6em;min-height:2.1em;padding:.2em .7em;border-bottom:2px solid ${INK};font-size:.85em;font-weight:600}
.dots{display:inline-flex;gap:.3em}
.dots i{display:block;width:.55em;height:.55em;border:1.5px solid ${INK};border-radius:50%}
.sheet{padding:1em 1.1em;max-height:76vh;overflow:auto;line-height:1.45}
.sheet h2{font-size:1.25em;margin:.1em 0 .5em;font-weight:800}
.sheet h3{font-size:1em;margin:1em 0 .35em;font-weight:700}
.sheet ul{margin:0;padding-left:1.2em}
.sheet li{margin:.25em 0}
.act{display:flex;gap:.6em;align-items:flex-start;justify-content:space-between;border-top:1.5px solid ${INK}33;padding:.55em 0}
.act b{display:block}
.bubble{background:${INK};color:${PAPER};border-radius:3px;padding:.7em .9em;max-width:min(22em,88vw);line-height:1.4}
.bubble b{display:block;margin-bottom:.2em;color:${FIELD}}
@media (prefers-reduced-motion:reduce){button{transition:none}}
@media (max-width:767px){
:host([data-words]){bottom:76px!important}
button{max-width:calc(100vw - 32px)}
button.dock{width:48px;height:48px;min-height:48px;padding:0;gap:0;justify-content:center;font-size:17px}
.w:not(.words) button.dock:not(.on):not(:disabled) .t{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.words button.dock,button.dock.on,button.dock:disabled{width:auto;height:auto;padding:.35em .7em;gap:.4em;font-size:15px}
}
`;

class CizzySDK {
  readonly version = VERSION;
  private cfg: Config | null = null;
  private engine: PreferenceEngine | null = null;
  private prefs: Preferences | null = null;
  private listeners = new Map<EventName, Set<Listener>>();
  private buttons: { root: HTMLElement; floating: boolean }[] = [];
  private busy = false;
  private error: string | null = null;
  private menuOpen = false;
  private ttsHost: HTMLElement | null = null;
  private ttsRoot: HTMLElement | null = null;
  private listening = false;
  private help: PageHelp | null = null;
  private helpFor = "";
  private helpLoading = false;
  private helpPromise: Promise<PageHelp> | null = null;
  private helpPending = "";
  private controlHelp = new Map<string, string>();
  private bubbleTurn = 0;
  private autoRetried = "";
  private ttsError: string | null = null;
  private helpError: string | null = null;
  private panelHost: HTMLElement | null = null;
  private bubbleHost: HTMLElement | null = null;
  private explaining = false;
  private autoShown = "";
  private lastFetch = 0;

  get preferences(): Preferences | null {
    return this.prefs;
  }
  get isConnected(): boolean {
    return !!this.cfg && !!store.get(this.key("token"));
  }

  init(config: Partial<Config> & { clientId: string }): void {
    if (this.cfg) throw new Error("Cizzy.init() was already called");
    if (!config.clientId) throw new Error("Cizzy: clientId is required");
    const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "");
    if (!baseUrl) throw new Error("Cizzy: baseUrl is required");
    const known = new Set(SETTINGS.map((s) => s.key));
    const supports = (config.supports ?? []).filter((k) => {
      if (known.has(k)) return true;
      console.warn(`[Cizzy] data-supports: unknown setting "${k}" ignored`);
      return false;
    });
    this.cfg = { clientId: config.clientId, baseUrl, mode: config.mode ?? "auto", floating: config.floating ?? true, supports, ai: config.ai ?? "on" };
    this.engine = new PreferenceEngine(document, { mode: this.cfg.mode, assetBase: baseUrl });
    this.injectGlobalStyle();
    setCloudVoice({
      check: async () => ((await (await fetch(`${baseUrl}/v1/tts`)).json()) as { available: boolean }).available,
      speak: async (text, rate) => {
        const token = store.get(this.key("token"));
        if (!token) throw new Error("not connected");
        const r = await fetch(`${baseUrl}/v1/tts`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text, rate }) });
        if (!r.ok) throw new Error(`Speech request failed (${r.status})`);
        return r.blob();
      },
    });
    const sayIfWanted = (text: string) => {
      if (this.prefs?.tts) void this.speak(text).catch((e) => console.warn("[Cizzy]", e));
    };
    this.guard = new ActionGuard(document, () => this.lang(), sayIfWanted);
    this.forms = new FormGuide(
      document,
      () => this.lang(),
      async (label, hint) => {
        const body = await this.assistFetch({ title: document.title, headings: [], text: "", focus: { label, kind: "form field", hint } });
        return String(body.explain);
      },
      sayIfWanted,
    );
    new MutationObserver(() => {
      this.renderButtons();
      this.renderTts();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // 1) apply cached preferences immediately (no flash of unadjusted content)
    const cached = store.get(this.key("prefs"));
    if (cached && store.get(this.key("token"))) {
      try {
        this.setPrefs(readPreferences(JSON.parse(cached)), false);
      } catch (e) {
        console.warn("[Cizzy] cached preferences invalid, ignoring", e);
        store.del(this.key("prefs"));
      }
    }
    // 2) finish a redirect-mode authorization, else refresh from the server
    const onReady = () => {
      this.renderButtons();
      this.renderTts();
      if (!this.completeRedirect()) this.safeRefresh();
      if (new URLSearchParams(location.search).has("cz-check")) void this.check().then((r) => this.showCheck(r));
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady, { once: true });
    else onReady();

    // 3) keep in sync: when the user comes back to the tab, and across tabs
    const onBack = () => {
      if (document.visibilityState === "visible" && Date.now() - this.lastFetch > 2_000) this.safeRefresh();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    window.addEventListener("storage", (e) => {
      try {
        if (e.key === this.key("prefs") && e.newValue) this.setPrefs(readPreferences(JSON.parse(e.newValue)), false);
        if (e.key === this.key("token") && !e.newValue) this.clearLocal(false);
        // Another tab (e.g. a popup opened as a tab) finished connecting.
        if (e.key === this.key("token") && e.newValue && !this.prefs) this.safeRefresh();
      } catch (err) {
        console.warn("[Cizzy] ignoring malformed storage event", err);
      }
    });
  }

  on(name: EventName, cb: Listener): () => void {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(cb);
    if (name === "preferences" && this.prefs) cb(this.prefs);
    return () => this.off(name, cb);
  }
  off(name: EventName, cb: Listener): void {
    this.listeners.get(name)?.delete(cb);
  }

  async connect(): Promise<Preferences> {
    const cfg = this.need();
    if (this.busy) throw new Error("Connection already in progress");
    this.busy = true;
    this.error = null;
    this.renderButtons();
    try {
      const verifier = randomString(48);
      const state = randomString(16);
      const challenge = await challengeFor(verifier);
      const page = location.href.split("#")[0];
      const params = new URLSearchParams({
        response_type: "code",
        client_id: cfg.clientId,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        redirect_uri: "postmessage",
        response_mode: "web_message",
        origin: location.origin,
        return_to: page,
      });
      // Saved for the redirect leg: used when the popup is blocked or opens without window.opener
      // (some mobile/in-app browsers). localStorage so that a new tab can finish the flow too.
      store.set(this.key("pkce"), JSON.stringify({ verifier, state, redirectUri: "postmessage", at: Date.now() }));
      const w = 500, h = 760;
      const left = Math.max(0, (screen.width - w) / 2), top = Math.max(0, (screen.height - h) / 2);
      const popup = window.open(`${cfg.baseUrl}/oauth/authorize?${params}`, "cizzy_auth", `width=${w},height=${h},left=${left},top=${top}`);
      if (!popup) {
        // Popup blocked: full-page redirect flow.
        store.set(this.key("pkce"), JSON.stringify({ verifier, state, redirectUri: page, at: Date.now() }));
        params.set("redirect_uri", page);
        params.set("response_mode", "cz_fragment");
        params.delete("return_to");
        location.assign(`${cfg.baseUrl}/oauth/authorize?${params}`);
        return await new Promise<Preferences>(() => {});
      }
      const code = await this.waitForCode(popup, state);
      store.del(this.key("pkce"));
      const prefs = await this.exchange(code, verifier, "postmessage");
      this.emit("connect", prefs);
      return prefs;
    } catch (e) {
      // The popup may have finished in another tab (no window.opener): then we are connected after all.
      if (store.get(this.key("token"))) {
        this.error = null;
        this.safeRefresh();
        throw e;
      }
      // Show our own message when we raised it, a generic one otherwise.
      this.error = e instanceof Error && REVERSE[e.message] ? e.message : T.failed;
      this.emit("error", e);
      throw e;
    } finally {
      this.busy = false;
      this.renderButtons();
    }
  }

  async disconnect(): Promise<void> {
    const cfg = this.need();
    const token = store.get(this.key("token"));
    try {
      if (token) {
        const r = await fetch(`${cfg.baseUrl}/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, client_id: cfg.clientId }),
        });
        if (!r.ok) console.warn("[Cizzy] revoke failed with", r.status);
      }
    } finally {
      // Always disconnect locally, even offline.
      this.clearLocal(true);
    }
  }

  /** Re-fetch preferences from the platform. No-op when not connected. */
  async refresh(): Promise<Preferences | null> {
    const cfg = this.need();
    const token = store.get(this.key("token"));
    if (!token) return null;
    this.lastFetch = Date.now();
    const r = await fetch(`${cfg.baseUrl}/v1/preferences`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) {
      this.clearLocal(true);
      return null;
    }
    if (!r.ok) throw new Error(`Cizzy: preferences request failed (${r.status})`);
    const body = await r.json();
    const prefs = readPreferences(body.preferences);
    this.setPrefs(prefs, true);
    return prefs;
  }

  /** Read a text aloud with the user's voice settings. */
  async speak(text: string): Promise<void> {
    const p = this.prefs;
    await speak(text, { language: this.lang(), rate: p?.ttsRate ?? 1, pitch: p?.ttsPitch, volume: p?.ttsVolume });
  }

  /**
   * Which of the user's active settings this site honours.
   * Type A settings are applied by the SDK in auto mode; type B only when listed in data-supports.
   */
  get compatibility(): { active: number; supported: number; unsupported: string[] } {
    const p = this.prefs;
    if (!p || !this.cfg) return { active: 0, supported: 0, unsupported: [] };
    const cfg = this.cfg;
    const active = SETTINGS.filter((s) => s.key !== "language" && s.key !== "ttsRate" && p[s.key] !== DEFAULT_PREFERENCES[s.key]);
    const unsupported = active.filter((s) => !(cfg.supports.includes(s.key) || (s.kind === "A" && cfg.mode === "auto")));
    return { active: active.length, supported: active.length - unsupported.length, unsupported: unsupported.map((s) => settingLabel(s, this.lang())) };
  }

  /** Compatibility check for site owners: renders the page at the given text scale and reports problems. */
  async check(opts: { fontScale?: number } = {}): Promise<CheckReport> {
    const engine = this.engine;
    if (!engine) throw new Error("Cizzy is not initialised");
    const before = this.prefs;
    const scale = opts.fontScale ?? 2;
    engine.apply({ ...DEFAULT_PREFERENCES, fontScale: scale });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const report = runCheck(document, scale, this.lang());
      console.table(report.issues.map((i) => ({ problem: i.kind, element: i.selector, detail: i.detail })));
      return report;
    } finally {
      if (before) engine.apply(before); else engine.reset();
    }
  }

  // ---------- internals ----------
  /** Fail-open refresh: network/server errors keep the cached preferences and never break the page. */
  private safeRefresh(): void {
    this.refresh().catch((e) => console.warn("[Cizzy] could not refresh preferences, using cached ones", e));
  }

  private showCheck(r: CheckReport): void {
    const { root } = this.shadowHost(null, null);
    const host = root.getRootNode() as ShadowRoot;
    (host.host as HTMLElement).style.cssText = "position:fixed;top:12px;right:12px;z-index:2147483647;max-width:min(30em,92vw)";
    const box = document.createElement("div");
    box.className = "menu";
    box.style.maxHeight = "80vh";
    box.style.overflow = "auto";
    const title = document.createElement("b");
    title.textContent = `${T.checkTitle} (${r.fontScale * 100}%): ${r.score}/100`;
    box.append(title);
    const lines = [
      `${T.overflow}: ${r.horizontalOverflow ? T.overflowYes : T.overflowNo}`,
      `${T.clipped}: ${r.counts.clipped}`,
      `${T.small}: ${r.counts.smallTarget}`,
      `${T.contrast}: ${r.counts.lowContrast}`,
      `${T.unnamed}: ${r.counts.unlabeled}`,
    ];
    for (const l of lines) {
      const d = document.createElement("div");
      d.textContent = l;
      box.append(d);
    }
    const close = document.createElement("button");
    close.className = "ghost";
    close.textContent = T.close;
    close.addEventListener("click", () => (host.host as HTMLElement).remove());
    box.append(close);
    root.append(box);
  }

  /** The user's language once connected, otherwise the language of the page. */
  private lang(): Language {
    return this.prefs?.language ?? (document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "az");
  }

  private need(): Config {
    if (!this.cfg) throw new Error("Cizzy is not initialised; add data-client-id to the script tag or call Cizzy.init()");
    return this.cfg;
  }
  private key(k: string): string {
    return `cizzy:${this.cfg?.clientId}:${k}`;
  }
  private emit(name: EventName, detail: unknown): void {
    this.listeners.get(name)?.forEach((cb) => {
      try { cb(detail); } catch (e) { console.error("[Cizzy] listener error", e); }
    });
    document.dispatchEvent(new CustomEvent(`cizzy:${name}`, { detail }));
  }

  private setPrefs(prefs: Preferences, persist: boolean): void {
    this.prefs = prefs;
    if (persist) store.set(this.key("prefs"), JSON.stringify(prefs));
    this.engine!.apply(prefs);
    this.syncAutoReading();
    this.guard.apply(prefs.guardLevel);
    this.forms.apply(prefs.formGuide && this.cfg?.mode === "auto");
    void this.syncSimplify();
    this.renderTts();
    this.renderButtons();
    this.emit("preferences", prefs);
  }

  private clearLocal(emit: boolean): void {
    store.del(this.key("token"));
    store.del(this.key("prefs"));
    this.prefs = null;
    this.engine?.reset();
    this.syncAutoReading();
    this.guard?.apply("off");
    this.forms?.apply(false);
    this.stopListening();
    this.stopExplaining();
    this.closePanel();
    document.querySelector("[data-cz-ui='plain-summary']")?.remove();
    document.querySelector("[data-cz-ui='reminder']")?.remove();
    this.help = null;
    this.renderTts();
    this.menuOpen = false;
    this.renderButtons();
    if (emit) this.emit("disconnect", null);
  }

  private waitForCode(popup: Window, state: string): Promise<string> {
    const origin = new URL(this.need().baseUrl).origin;
    return new Promise((resolve, reject) => {
      const onMsg = (e: MessageEvent) => {
        if (e.origin !== origin || e.source !== popup) return;
        const d = e.data as { type?: string; code?: string; state?: string; error?: string };
        if (!d || d.type !== "cizzy:authorize") return;
        cleanup();
        if (d.state !== state) return reject(new Error(T.failed));
        if (d.error) return reject(new Error(d.error === "access_denied" ? T.denied : T.failed));
        if (!d.code) return reject(new Error(T.failed));
        resolve(d.code);
      };
      const timer = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error(T.popupClosed));
        }
      }, 400);
      const cleanup = () => {
        clearInterval(timer);
        window.removeEventListener("message", onMsg);
      };
      window.addEventListener("message", onMsg);
    });
  }

  private async exchange(code: string, verifier: string, redirectUri: string): Promise<Preferences> {
    const cfg = this.need();
    const r = await fetch(`${cfg.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code, code_verifier: verifier, client_id: cfg.clientId, redirect_uri: redirectUri }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error_description || `Token exchange failed (${r.status})`);
    store.set(this.key("token"), body.access_token);
    const prefs = readPreferences(body.preferences);
    this.setPrefs(prefs, true);
    this.lastFetch = Date.now();
    return prefs;
  }

  /** Handles the return leg of the popup-blocked redirect flow. Returns true if it took over. */
  private completeRedirect(): boolean {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (!hash.has("cz_code") && !hash.has("cz_error")) return false;
    const saved = store.get(this.key("pkce"));
    store.del(this.key("pkce"));
    history.replaceState(null, "", location.href.split("#")[0]);
    if (!saved) {
      console.warn("[Cizzy] authorization response without a pending request");
      return false;
    }
    const { verifier, state, redirectUri, at } = JSON.parse(saved) as { verifier: string; state: string; redirectUri: string; at: number };
    if (Date.now() - at > 10 * 60_000) {
      this.error = T.failed;
      this.renderButtons();
      return true;
    }
    if (hash.get("cz_state") !== state || hash.has("cz_error")) {
      this.error = hash.get("cz_error") === "access_denied" ? T.denied : T.failed;
      this.renderButtons();
      return true;
    }
    this.busy = true;
    this.renderButtons();
    this.exchange(hash.get("cz_code")!, verifier, redirectUri)
      .then((p) => this.emit("connect", p))
      .catch((e) => {
        this.error = T.failed;
        this.emit("error", e);
      })
      .finally(() => {
        this.busy = false;
        this.renderButtons();
      });
    return true;
  }

  // ---------- UI (rendered in shadow roots so site CSS cannot break it) ----------
  private injectGlobalStyle(): void {
    if (document.getElementById("cizzy-ui-style")) return;
    const s = document.createElement("style");
    s.id = "cizzy-ui-style";
    s.setAttribute("data-cz-ui", "style");
    s.textContent = `[data-cz-reading]{outline:4px solid #ffbf00!important;outline-offset:4px!important;background-color:rgba(255,230,0,.28)!important}
html[data-cz-listening] body *{cursor:help!important}`;
    (document.head ?? document.documentElement).appendChild(s);
  }

  private shadowHost(container: HTMLElement | null, floatingSide: "left" | "right" | null): { host: HTMLElement; root: HTMLElement } {
    const host = document.createElement("div");
    host.setAttribute("data-cz-ui", "widget");
    if (floatingSide) {
      host.style.cssText = `position:fixed;${floatingSide}:16px;bottom:16px;z-index:2147483647;`;
    }
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${WIDGET_CSS}</style><div class="w"></div>`;
    (container ?? document.body).appendChild(host);
    return { host, root: shadow.querySelector(".w") as HTMLElement };
  }

  private renderButtons(): void {
    T = TEXTS[this.lang()];
    if (!this.cfg || !document.body) return;
    if (this.buttons.length === 0) {
      const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-cz-button]"));
      if (slots.length) slots.forEach((s) => this.buttons.push({ root: this.shadowHost(s, null).root, floating: false }));
      else if (this.cfg.floating) this.buttons.push({ root: this.shadowHost(null, "right").root, floating: true });
    }
    for (const b of this.buttons) this.paintButton(b.root, b.floating);
    this.placeFloating();
  }

  /** One-handed use: the floating buttons move to the side of the hand in use. */
  private placeFloating(): void {
    const left = this.prefs?.handedness === "left";
    const side = (host: HTMLElement, onLeft: boolean) => {
      host.style.left = onLeft ? "16px" : "auto";
      host.style.right = onLeft ? "auto" : "16px";
    };
    for (const b of this.buttons) if (b.floating) side((b.root.getRootNode() as ShadowRoot).host as HTMLElement, left);
    if (this.ttsHost) side(this.ttsHost, !left);
  }

  private paintButton(root: HTMLElement, floating: boolean): void {
    const connected = this.isConnected && !!this.prefs;
    root.textContent = "";
    root.classList.toggle("words", !!this.prefs?.iconLabels);
    const el = (tag: string, cls: string, text?: string) => {
      const e = document.createElement(tag);
      e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    const logo = () => {
      const mark = el("span", "logo");
      mark.innerHTML = MARK;
      return mark;
    };
    if (!connected) {
      const btn = el("button", "primary dock") as HTMLButtonElement;
      btn.append(logo(), wordsOf(this.busy ? T.waiting : T.connect));
      btn.disabled = this.busy;
      btn.addEventListener("click", () => this.connect().catch(() => {}));
      root.append(btn);
    } else {
      const row = el("div", "row");
      const chip = el("button", "chip dock");
      chip.append(logo(), wordsOf(T.active));
      chip.setAttribute("aria-expanded", String(this.menuOpen));
      chip.addEventListener("click", () => {
        this.menuOpen = !this.menuOpen;
        this.renderButtons();
      });
      row.append(chip);
      root.append(row);
      if (this.menuOpen || !floating) {
        const menu = el("div", floating ? "menu" : "row");
        if (!floating) menu.style.marginTop = ".4em";
        const refresh = el("button", "ghost", T.refresh);
        refresh.addEventListener("click", () => this.refresh().catch((e) => console.error(e)));
        const edit = el("button", "ghost", T.edit);
        edit.addEventListener("click", () => window.open(`${this.need().baseUrl}/ayarlar`, "_blank", "noopener"));
        const off = el("button", "ghost", T.disconnect);
        off.addEventListener("click", () => this.disconnect().catch((e) => console.error(e)));
        menu.append(refresh, edit, off);
        root.append(menu);
        const c = this.compatibility;
        if (c.active > 0) {
          const note = el("div", "note", T.supports.replace("{a}", String(c.supported)).replace("{b}", String(c.active)));
          if (c.unsupported.length) note.textContent += ` ${T.unsupported}: ${c.unsupported.join(", ")}.`;
          root.append(note);
        }
      }
    }
    if (this.error) root.append(el("div", "msg", this.error));
  }

  // ---------- text-to-speech widget ----------
  private renderTts(): void {
    T = TEXTS[this.lang()];
    if (!document.body) return;
    const tts = !!this.prefs?.tts;
    const ai = this.aiEnabled();
    if (!tts && !ai && !this.simplifyShown) {
      this.ttsHost?.remove();
      this.ttsHost = this.ttsRoot = null;
      this.closePanel();
      this.stopExplaining();
      return;
    }
    if (!this.ttsHost) {
      const { host, root } = this.shadowHost(null, "left");
      this.ttsHost = host;
      this.ttsRoot = root;
      this.placeFloating();
    }
    const root = this.ttsRoot!;
    root.textContent = "";
    root.classList.toggle("words", !!this.prefs?.iconLabels);
    this.ttsHost!.toggleAttribute("data-words", !!this.prefs?.iconLabels);
    if (ai) {
      const arow = document.createElement("div");
      arow.className = "row";
      arow.style.marginBottom = ".45em";
      const what = document.createElement("button");
      what.className = "dock";
      setLabel(what, "page", this.helpLoading ? T.thinking : T.whatPage);
      what.disabled = this.helpLoading;
      what.addEventListener("click", () => void this.openPanel());
      const expl = document.createElement("button");
      expl.className = this.explaining ? "dock on" : "dock";
      setLabel(expl, "question", this.explaining ? T.whatIsThisOn : T.whatIsThis);
      expl.setAttribute("aria-pressed", String(this.explaining));
      expl.addEventListener("click", () => (this.explaining ? this.stopExplaining() : this.startExplaining()));
      arow.append(what, expl);
      root.append(arow);
      if (this.helpError) {
        const m = document.createElement("div");
        m.className = "msg";
        m.textContent = this.helpError;
        root.append(m);
      }
      if (this.cfg?.ai === "auto" && (this.prefs?.plainLanguage || this.prefs?.simpleMode)) void this.autoSummary();
    }
    if (this.simplifyShown) {
      const all = document.createElement("button");
      all.textContent = T.showAll;
      all.style.marginBottom = ".45em";
      all.addEventListener("click", () => {
        document.querySelectorAll("[data-cz-ai-hidden]").forEach((el) => el.removeAttribute("data-cz-ai-hidden"));
        this.simplifyShown = false;
        this.renderTts();
      });
      root.append(all);
    }
    if (!tts) return;
    const row = document.createElement("div");
    row.className = "row";
    const listen = document.createElement("button");
    listen.className = this.listening ? "dock on" : "dock";
    setLabel(listen, this.listening ? "pointer" : "speaker", this.listening ? T.listening : T.listen);
    listen.setAttribute("aria-pressed", String(this.listening));
    listen.addEventListener("click", () => (this.listening ? this.stopListening() : this.startListening()));
    const page = document.createElement("button");
    page.className = "dock";
    setLabel(page, "page", T.readPage);
    page.addEventListener("click", () => this.readElement(document.querySelector("main,[role=main],article") ?? document.body));
    const stop = document.createElement("button");
    stop.className = "dock";
    setLabel(stop, "stop", T.stop);
    stop.addEventListener("click", () => {
      stopSpeaking();
      this.clearReading();
    });
    row.append(listen, page, stop);
    root.append(row);
    if (this.ttsError) {
      const m = document.createElement("div");
      m.className = "msg";
      m.textContent = this.ttsError;
      root.append(m);
    }
    if (!isSpeechSupported()) {
      const n = document.createElement("div");
      n.className = "note";
      n.textContent = T.noVoice;
      root.append(n);
      return;
    }
    void voiceInfo(this.lang()).then((info) => {
      if (!this.ttsRoot || this.ttsRoot !== root) return;
      if (!info.available || info.substitute) {
        const n = document.createElement("div");
        n.className = "note";
        n.textContent = info.available ? T.substitute : T.noVoice;
        root.append(n);
      }
    });
  }

  // ---------- page explainer (AI) ----------
  private aiEnabled(): boolean {
    return !!this.prefs?.aiHelp && !!this.cfg && this.cfg.ai !== "off" && this.isConnected;
  }

  private async assistFetch(payload: unknown): Promise<Record<string, unknown>> {
    const cfg = this.need();
    const token = store.get(this.key("token"));
    if (!token) throw new Error(T.failed);
    const r = await fetch(`${cfg.baseUrl}/v1/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) {
      this.clearLocal(true);
      throw new Error(T.failed);
    }
    if (!r.ok) throw new Error(body.error_description || T.failed);
    return body;
  }

  private signature(snap: ReturnType<typeof snapshot>): string {
    return `${this.lang()}|${snap.url}|${snap.text.length}|${snap.actions.length}`;
  }

  /** Explains the current page. One request at a time; the server caches identical pages. */
  async explainPage(): Promise<PageHelp> {
    const snap = snapshot(document);
    const sig = this.signature(snap);
    if (this.help && this.helpFor === sig) return this.help;
    if (this.helpPromise && this.helpPending === sig) return this.helpPromise;
    this.helpLoading = true;
    this.helpError = null;
    this.helpPending = sig;
    this.renderTts();
    this.helpPromise = this.assistFetch(snap)
      .then((body) => {
        const help = body as unknown as PageHelp;
        this.help = { headline: help.headline, summary: help.summary, points: help.points ?? [], actions: help.actions ?? [] };
        this.helpFor = sig;
        this.showReminder(this.help);
        return this.help;
      })
      .catch((e) => {
        this.helpError = e instanceof Error ? e.message : T.failed;
        throw e;
      })
      .finally(() => {
        this.helpPromise = null;
        this.helpLoading = false;
        this.renderTts();
      });
    return this.helpPromise;
  }

  /** Memory aid (simple mode): a sticky "You are here: …" bar so the user does not lose track of the task. */
  private showReminder(help: PageHelp): void {
    document.querySelector("[data-cz-ui='reminder']")?.remove();
    if (!this.prefs?.simpleMode) return;
    const bar = document.createElement("div");
    bar.setAttribute("data-cz-ui", "reminder");
    bar.setAttribute("role", "note");
    bar.style.cssText = "position:sticky;top:0;z-index:2147483640;display:flex;gap:.8em;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:.6em 1em;background:#262626;color:#f3f3f3;font:600 1.05em/1.4 system-ui,sans-serif";
    const t = document.createElement("span");
    t.textContent = `${T.youAreHere}: ${help.headline}`;
    const b = document.createElement("button");
    b.textContent = T.whatToDo;
    b.style.cssText = "min-height:2.4em;padding:.3em 1em;border:2px solid #f5bc4a;border-radius:.45em;background:#f5bc4a;color:#262626;font:inherit;cursor:pointer";
    b.addEventListener("click", () => void this.openPanel());
    bar.append(t, b);
    document.body.prepend(bar);
  }

  private closePanel(): void {
    this.panelHost?.remove();
    this.panelHost = null;
  }

  private async openPanel(): Promise<void> {
    let help: PageHelp;
    try {
      help = await this.explainPage();
    } catch (e) {
      console.warn("[Cizzy] page explainer failed", e);
      return;
    }
    this.closePanel();
    const { host, root } = this.shadowHost(null, null);
    host.style.cssText = "position:fixed;right:12px;top:12px;z-index:2147483647";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-label", T.whatPage);
    this.panelHost = host;
    const win = document.createElement("div");
    win.className = "window";
    const titleBar = document.createElement("div");
    titleBar.className = "bar";
    titleBar.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    titleBar.append("Cizzy");
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    win.append(titleBar, sheet);
    const h = (tag: string, text: string) => {
      const e = document.createElement(tag);
      e.textContent = text;
      return e;
    };
    sheet.append(h("h2", help.headline), h("h3", T.short), h("p", help.summary));
    if (help.points.length) {
      sheet.append(h("h3", T.keyPoints));
      const ul = document.createElement("ul");
      help.points.forEach((p) => ul.append(h("li", p)));
      sheet.append(ul);
    }
    const labels = new Map(snapshotLabels());
    if (help.actions.length) {
      sheet.append(h("h3", T.canDo));
      for (const a of help.actions) {
        const row = document.createElement("div");
        row.className = "act";
        const txt = document.createElement("div");
        txt.append(h("b", labels.get(a.id) || "•"), h("span", a.explain));
        const go = document.createElement("button");
        go.className = "ghost";
        go.textContent = T.show;
        go.addEventListener("click", () => this.showControl(a.id));
        row.append(txt, go);
        sheet.append(row);
      }
    }
    const bar = document.createElement("div");
    bar.className = "row";
    bar.style.marginTop = ".8em";
    const read = document.createElement("button");
    setLabel(read, "speaker", T.readAloud);
    read.addEventListener("click", () => void this.speak(`${help.headline}. ${help.summary} ${help.points.join(". ")}`).catch((e) => console.warn(e)));
    const close = document.createElement("button");
    close.className = "ghost";
    close.textContent = T.close;
    close.addEventListener("click", () => this.closePanel());
    bar.append(read, close);
    sheet.append(bar);
    root.append(win);
    close.focus();
    function snapshotLabels(): [string, string][] {
      return Array.from(document.querySelectorAll("[data-cz-aid]")).map((el) => [el.getAttribute("data-cz-aid")!, (el as HTMLElement).innerText?.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || ""]);
    }
  }

  private showControl(id: string): void {
    const el = elementsFor(document, id)[0] as HTMLElement | undefined;
    if (!el) return;
    this.closePanel();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.setAttribute("data-cz-reading", "");
    setTimeout(() => el.removeAttribute("data-cz-reading"), 3500);
    if (typeof el.focus === "function") el.focus({ preventScroll: true });
  }

  private onExplainClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target || target.closest("[data-cz-ui]")) return;
    const ctl = controlFor(target);
    if (!ctl) return;
    e.preventDefault();
    e.stopPropagation();
    void this.explainControl(ctl);
  };

  /** Every control can be explained: from the page answer when it has it, otherwise with its own small request. */
  private async explainControl(el: Element): Promise<void> {
    const turn = ++this.bubbleTurn;
    const snap = snapshot(document);
    const id = aidOf(el);
    const action = snap.actions.find((a) => a.id === id);
    const label = (el as HTMLElement).innerText?.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || "";
    const finish = (text: string) => {
      if (turn !== this.bubbleTurn) return;
      this.showBubble(el, label, text);
      if (this.prefs?.tts) void this.speak(`${label}. ${text}`).catch((e) => console.warn("[Cizzy]", e));
    };
    const fromPage = this.help && this.helpFor === this.signature(snap) ? this.help.actions.find((a) => a.id === id) : undefined;
    if (fromPage) return finish(fromPage.explain);
    if (!action) return finish(T.noExplain);
    const key = `${this.lang()}|${snap.url}|${action.kind}|${action.label}|${action.hint ?? ""}`;
    const known = this.controlHelp.get(key);
    if (known) return finish(known);
    this.showBubble(el, label, T.thinking);
    try {
      const body = await this.assistFetch({ title: snap.title, headings: snap.headings, text: snap.text.slice(0, 600), focus: action });
      const explain = String(body.explain);
      this.controlHelp.set(key, explain);
      finish(explain);
    } catch (e) {
      console.warn("[Cizzy] control explainer failed", e);
      if (turn === this.bubbleTurn) this.showBubble(el, label, e instanceof Error ? e.message : T.failed);
    }
  }

  private showBubble(el: Element, title: string, text: string): void {
    this.bubbleHost?.remove();
    const { host, root } = this.shadowHost(null, null);
    this.bubbleHost = host;
    const r = el.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 120, r.bottom + 8);
    const left = Math.max(8, Math.min(window.innerWidth - 320, r.left));
    host.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:2147483647`;
    host.setAttribute("role", "status");
    const b = document.createElement("div");
    b.className = "bubble";
    const t = document.createElement("b");
    t.textContent = title || "?";
    const p = document.createElement("span");
    p.textContent = text;
    b.append(t, p);
    root.append(b);
    setTimeout(() => {
      if (this.bubbleHost === host) {
        host.remove();
        this.bubbleHost = null;
      }
    }, 7000);
  }

  private startExplaining(): void {
    this.explaining = true;
    document.addEventListener("click", this.onExplainClick, true);
    this.renderTts();
  }

  private stopExplaining(): void {
    if (!this.explaining) return;
    this.explaining = false;
    document.removeEventListener("click", this.onExplainClick, true);
    this.bubbleHost?.remove();
    this.bubbleHost = null;
    this.renderTts();
  }

  /** data-ai="auto" + plain language: a short "Sadə dildə" box under the main heading. */
  private async autoSummary(): Promise<void> {
    const url = location.href.split("#")[0];
    if (this.autoShown === url) return;
    this.autoShown = url;
    try {
      const help = await this.explainPage();
      const h1 = document.querySelector("main h1, article h1, h1");
      if (!h1 || document.querySelector("[data-cz-ui='plain-summary']")) return;
      const box = document.createElement("div");
      box.setAttribute("data-cz-ui", "plain-summary");
      box.style.cssText = "margin:.6em 0 1em;padding:.8em 1em;border:2px solid #262626;background:#f3f3f3;color:#262626;border-radius:3px;box-shadow:5px 5px 0 #262626;font:inherit;line-height:1.5";
      const b = document.createElement("b");
      b.textContent = `${T.plain}: ${help.headline}`;
      const p = document.createElement("div");
      p.textContent = help.summary;
      box.append(b, p);
      h1.insertAdjacentElement("afterend", box);
    } catch (e) {
      console.warn("[Cizzy] auto summary failed", e);
      if (this.autoRetried !== url) {
        this.autoRetried = url;
        setTimeout(() => {
          this.autoShown = "";
          void this.autoSummary();
        }, 10_000);
      }
    }
  }

  private onSelectRead = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length > 1) void this.say(sel, null);
  };

  private hoverTimer = 0;
  private onHoverRead = (e: MouseEvent) => {
    clearTimeout(this.hoverTimer);
    const target = e.target as Element | null;
    if (!target || target.closest("[data-cz-ui]")) return;
    const block = target.closest("p,li,h1,h2,h3,h4,h5,h6,td,th,label,button,a,blockquote,figcaption,dd,dt,summary");
    if (!block || block.hasAttribute("data-cz-reading")) return;
    this.hoverTimer = window.setTimeout(() => this.readElement(block as HTMLElement), 700);
  };

  private guard!: ActionGuard;
  private forms!: FormGuide;
  private simplifiedFor = "";
  private simplifyShown = false;

  /** AI keeps only the controls needed here. Anything uncertain or failing leaves the page as it was. */
  private async syncSimplify(): Promise<void> {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => void this.syncSimplify(), { once: true });
      return;
    }
    const wanted = !!this.prefs?.aiSimplify && this.isConnected && this.cfg?.ai !== "off" && this.cfg?.mode === "auto";
    this.syncParagraphs();
    if (!wanted) return this.undoSimplify();
    const snap = snapshot(document);
    const sig = this.signature(snap);
    if (this.simplifiedFor === sig || snap.actions.length <= 6) return;
    this.simplifiedFor = sig;
    try {
      const body = await this.assistFetch({ ...snap, simplify: true });
      const keep = new Set(body.keep as string[]);
      document.querySelectorAll<HTMLElement>("[data-cz-aid]").forEach((el) => {
        if (keep.has(el.getAttribute("data-cz-aid")!) || el.matches("[data-cz-simple='primary'],[data-cz-simple='keep'],[type=submit]") || el.closest("form")) return;
        el.setAttribute("data-cz-ai-hidden", "");
      });
      this.simplifyShown = true;
      this.renderTts();
    } catch (e) {
      console.warn("[Cizzy] AI simplification failed, leaving the page unchanged", e);
    }
  }

  private undoSimplify(): void {
    document.querySelectorAll("[data-cz-ai-hidden]").forEach((el) => el.removeAttribute("data-cz-ai-hidden"));
    this.simplifyShown = false;
    this.simplifiedFor = "";
  }

  /** A "plain words" button under long paragraphs. Each one asks the AI only when pressed. */
  private syncParagraphs(): void {
    const wanted = !!this.prefs?.simplifyParagraphs && this.isConnected && this.cfg?.ai !== "off";
    document.querySelectorAll("[data-cz-ui='plain-para']").forEach((e) => e.remove());
    if (!wanted) return;
    const root = document.querySelector("main,[role=main],article") ?? document.body;
    root.querySelectorAll<HTMLElement>("p").forEach((p) => {
      const text = (p.innerText ?? "").trim();
      if (text.length < 180 || p.closest("[data-cz-ui]") || p.offsetParent === null) return;
      const wrap = document.createElement("div");
      wrap.setAttribute("data-cz-ui", "plain-para");
      wrap.style.cssText = "margin:.4em 0 1em;font:600 15px/1.45 system-ui,sans-serif;color:#262626";
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = T.plain;
      b.style.cssText = "min-height:40px;padding:.3em .9em;border:2px solid #262626;border-radius:.45em;background:#f5bc4a;color:#262626;font:inherit;cursor:pointer";
      b.addEventListener("click", () => {
        b.disabled = true;
        b.textContent = T.thinking;
        this.assistFetch({ rewrite: text })
          .then((body) => {
            const box = document.createElement("div");
            box.style.cssText = "padding:.7em .9em;background:#f3f3f3;border:2px solid #262626;border-radius:3px;font-weight:500";
            box.textContent = String(body.plain);
            wrap.replaceChildren(box);
            if (this.prefs?.tts) void this.speak(String(body.plain)).catch((e) => console.warn("[Cizzy]", e));
          })
          .catch((e) => {
            b.disabled = false;
            b.textContent = e instanceof Error ? e.message : T.failed;
          });
      });
      wrap.append(b);
      p.insertAdjacentElement("afterend", wrap);
    });
  }

  private syncAutoReading(): void {
    document.removeEventListener("mouseup", this.onSelectRead);
    document.removeEventListener("keyup", this.onSelectRead);
    document.removeEventListener("mouseover", this.onHoverRead);
    clearTimeout(this.hoverTimer);
    if (this.prefs?.readOnSelect) {
      document.addEventListener("mouseup", this.onSelectRead);
      document.addEventListener("keyup", this.onSelectRead);
    }
    if (this.prefs?.readOnHover) document.addEventListener("mouseover", this.onHoverRead);
  }

  private onListenClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target || target.closest("[data-cz-ui]")) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = window.getSelection()?.toString().trim();
    if (sel) {
      void this.say(sel, null);
      return;
    }
    const block = target.closest("p,li,h1,h2,h3,h4,h5,h6,td,th,label,button,a,blockquote,figcaption,dd,dt,summary,caption,legend") ?? target;
    this.readElement(block as HTMLElement);
  };

  private startListening(): void {
    this.listening = true;
    document.documentElement.setAttribute("data-cz-listening", "");
    document.addEventListener("click", this.onListenClick, true);
    this.renderTts();
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    document.documentElement.removeAttribute("data-cz-listening");
    document.removeEventListener("click", this.onListenClick, true);
    stopSpeaking();
    this.clearReading();
    this.renderTts();
  }

  private readElement(el: HTMLElement): void {
    const text = (el.innerText || el.textContent || el.getAttribute("aria-label") || "").trim();
    if (!text) return;
    void this.say(text, el);
  }

  private async say(text: string, el: HTMLElement | null): Promise<void> {
    this.clearReading();
    if (el) el.setAttribute("data-cz-reading", "");
    const failed = (e: unknown) => {
      console.error("[Cizzy] reading aloud failed", e);
      this.clearReading();
      this.ttsError = T.noVoice;
      this.renderTts();
    };
    try {
      this.ttsError = null;
      await speak(text, { language: this.lang(), rate: this.prefs?.ttsRate ?? 1, pitch: this.prefs?.ttsPitch, volume: this.prefs?.ttsVolume, onEnd: () => this.clearReading(), onError: failed });
    } catch (e) {
      failed(e);
    }
  }

  private clearReading(): void {
    document.querySelectorAll("[data-cz-reading]").forEach((e) => e.removeAttribute("data-cz-reading"));
  }
}

const REVERSE: Record<string, true> = Object.fromEntries([...Object.values(AZ), ...Object.values(EN)].map((v) => [v, true]));

declare global {
  interface Window {
    Cizzy: CizzySDK;
  }
}

const sdk = new CizzySDK();
window.Cizzy = sdk;

// Auto-init from the script tag.
const script = document.currentScript as HTMLScriptElement | null;
if (script?.dataset.clientId) {
  sdk.init({
    clientId: script.dataset.clientId,
    baseUrl: script.dataset.baseUrl ?? new URL(script.src).origin,
    mode: script.dataset.mode === "tokens" ? "tokens" : "auto",
    floating: script.dataset.floating !== "false",
    supports: (script.dataset.supports ?? "").split(",").map((s) => s.trim()).filter(Boolean) as PreferenceKey[],
    ai: script.dataset.ai === "off" ? "off" : script.dataset.ai === "auto" ? "auto" : "on",
  });
}

export default sdk;
