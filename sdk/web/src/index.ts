// MƏNƏ UYĞUN Web SDK entry. Usage:
//   <script src="https://PLATFORM/sdk.js" data-client-id="YOUR_CLIENT_ID"></script>
// Optional attributes: data-mode="auto|tokens", data-floating="false", data-base-url="https://PLATFORM"

import { PreferenceEngine, type Mode } from "./apply";
import { normalizePreferences, SETTINGS, DEFAULT_PREFERENCES, type Preferences, type PreferenceKey } from "./schema";
import { runCheck, type CheckReport } from "./check";
import { speak, stopSpeaking, voiceInfo, isSpeechSupported } from "./tts";

const VERSION = "1.0.0";

interface Config {
  clientId: string;
  baseUrl: string;
  mode: Mode;
  floating: boolean;
  /** Type-B settings the site implements itself (data-supports). */
  supports: PreferenceKey[];
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
  console.warn("[MeneUygun] localStorage is blocked; the connection will not survive a page reload.");
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
  if (!crypto.subtle) throw new Error("MƏNƏ UYĞUN requires a secure context (HTTPS or localhost).");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

// ---------- texts ----------
const T = {
  connect: "MƏNƏ UYĞUN-dan ayarları gətir",
  waiting: "Gözləyin…",
  active: "Mənə uyğun ayarlar aktiv",
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
  substitute: "Azərbaycan səsi tapılmadı — türk səsi ilə oxunur.",
};

const WIDGET_CSS = `
:host{all:initial;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:calc(17px * min(var(--mu-font-scale,1),1.5));color:#111}
*{box-sizing:border-box;font:inherit}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:.5em}
button{cursor:pointer;border:0;border-radius:999px;min-height:2.9em;padding:.6em 1.15em;font-weight:700;line-height:1.2;display:inline-flex;align-items:center;gap:.55em}
button:focus-visible{outline:4px solid #ffbf00;outline-offset:3px}
.primary{background:#0b6e4f;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)}
.primary:hover{background:#095a41}
.chip{background:#e6f3ee;color:#0b6e4f;border:2px solid #0b6e4f}
.ghost{background:#fff;color:#0b6e4f;border:2px solid #0b6e4f;min-height:2.4em;padding:.4em .9em}
.logo{width:1.7em;height:1.7em;border-radius:50%;background:#fff;color:#0b6e4f;display:grid;place-items:center;font-weight:900;font-size:.75em;letter-spacing:-.02em;flex:none}
.chip .logo{background:#0b6e4f;color:#fff}
.msg{margin-top:.4em;font-size:.85em;color:#9a1c1c;background:#fff;border-radius:.4em;padding:.25em .5em}
.note{margin-top:.4em;font-size:.8em;background:#fff;color:#333;border-radius:.4em;padding:.25em .5em;max-width:22em}
.menu{margin-top:.5em;background:#fff;border:2px solid #0b6e4f;border-radius:1em;padding:.5em;display:flex;flex-direction:column;gap:.4em;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.tts{background:#111;color:#fff}
.tts.on{background:#ffbf00;color:#111}
`;

class MeneUygunSDK {
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
  private lastFetch = 0;

  get preferences(): Preferences | null {
    return this.prefs;
  }
  get isConnected(): boolean {
    return !!this.cfg && !!store.get(this.key("token"));
  }

  init(config: Partial<Config> & { clientId: string }): void {
    if (this.cfg) throw new Error("MeneUygun.init() was already called");
    if (!config.clientId) throw new Error("MeneUygun: clientId is required");
    const baseUrl = (config.baseUrl ?? "").replace(/\/+$/, "");
    if (!baseUrl) throw new Error("MeneUygun: baseUrl is required");
    const known = new Set(SETTINGS.map((s) => s.key));
    const supports = (config.supports ?? []).filter((k) => {
      if (known.has(k)) return true;
      console.warn(`[MeneUygun] data-supports: unknown setting "${k}" ignored`);
      return false;
    });
    this.cfg = { clientId: config.clientId, baseUrl, mode: config.mode ?? "auto", floating: config.floating ?? true, supports };
    this.engine = new PreferenceEngine(document, { mode: this.cfg.mode, assetBase: baseUrl });
    this.injectGlobalStyle();

    // 1) apply cached preferences immediately (no flash of unadjusted content)
    const cached = store.get(this.key("prefs"));
    if (cached && store.get(this.key("token"))) {
      try {
        this.setPrefs(normalizePreferences(JSON.parse(cached)), false);
      } catch (e) {
        console.warn("[MeneUygun] cached preferences invalid, ignoring", e);
        store.del(this.key("prefs"));
      }
    }
    // 2) finish a redirect-mode authorization, else refresh from the server
    const onReady = () => {
      this.renderButtons();
      if (!this.completeRedirect()) this.safeRefresh();
      if (new URLSearchParams(location.search).has("mu-check")) void this.check().then((r) => this.showCheck(r));
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady, { once: true });
    else onReady();

    // 3) keep in sync: when the user comes back to the tab, and across tabs
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Date.now() - this.lastFetch > 10_000) this.safeRefresh();
    });
    window.addEventListener("storage", (e) => {
      if (e.key === this.key("prefs") && e.newValue) this.setPrefs(normalizePreferences(JSON.parse(e.newValue)), false);
      if (e.key === this.key("token") && !e.newValue) this.clearLocal(false);
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
      const popup = window.open(`${cfg.baseUrl}/oauth/authorize?${params}`, "meneuygun_auth", `width=${w},height=${h},left=${left},top=${top}`);
      if (!popup) {
        // Popup blocked: full-page redirect flow.
        store.set(this.key("pkce"), JSON.stringify({ verifier, state, redirectUri: page, at: Date.now() }));
        params.set("redirect_uri", page);
        params.set("response_mode", "mu_fragment");
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
      // Show our own Azerbaijani message when we raised it, a generic one otherwise.
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
    if (token) {
      const r = await fetch(`${cfg.baseUrl}/oauth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, client_id: cfg.clientId }),
      });
      if (!r.ok) console.warn("[MeneUygun] revoke failed with", r.status);
    }
    this.clearLocal(true);
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
    if (!r.ok) throw new Error(`MeneUygun: preferences request failed (${r.status})`);
    const body = await r.json();
    const prefs = normalizePreferences(body.preferences);
    this.setPrefs(prefs, true);
    return prefs;
  }

  /** Read a text aloud with the user's voice settings. */
  async speak(text: string): Promise<void> {
    const p = this.prefs;
    await speak(text, { language: p?.language ?? "az", rate: p?.ttsRate ?? 1 });
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
    return { active: active.length, supported: active.length - unsupported.length, unsupported: unsupported.map((s) => s.label) };
  }

  /** Compatibility check for site owners: renders the page at the given text scale and reports problems. */
  async check(opts: { fontScale?: number } = {}): Promise<CheckReport> {
    const engine = this.engine;
    if (!engine) throw new Error("MeneUygun is not initialised");
    const before = this.prefs;
    const scale = opts.fontScale ?? 2;
    engine.apply({ ...DEFAULT_PREFERENCES, fontScale: scale });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      const report = runCheck(document, scale);
      console.table(report.issues.map((i) => ({ problem: i.kind, element: i.selector, detail: i.detail })));
      return report;
    } finally {
      if (before) engine.apply(before); else engine.reset();
    }
  }

  // ---------- internals ----------
  /** Fail-open refresh: network/server errors keep the cached preferences and never break the page. */
  private safeRefresh(): void {
    this.refresh().catch((e) => console.warn("[MeneUygun] could not refresh preferences, using cached ones", e));
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
    title.textContent = `MƏNƏ UYĞUN yoxlama (${r.fontScale * 100}%): ${r.score}/100`;
    box.append(title);
    const lines = [
      `Üfüqi sürüşmə: ${r.horizontalOverflow ? "VAR ✗" : "yoxdur ✓"}`,
      `Kəsilən mətnlər: ${r.counts.clipped}`,
      `Kiçik toxunma sahələri (<44px): ${r.counts.smallTarget}`,
      `Aşağı kontrast (<4.5:1): ${r.counts.lowContrast}`,
      `Adsız ikon düymələr: ${r.counts.unlabeled}`,
    ];
    for (const l of lines) {
      const d = document.createElement("div");
      d.textContent = l;
      box.append(d);
    }
    const close = document.createElement("button");
    close.className = "ghost";
    close.textContent = "Bağla";
    close.addEventListener("click", () => (host.host as HTMLElement).remove());
    box.append(close);
    root.append(box);
  }

  private need(): Config {
    if (!this.cfg) throw new Error("MeneUygun is not initialised; add data-client-id to the script tag or call MeneUygun.init()");
    return this.cfg;
  }
  private key(k: string): string {
    return `meneuygun:${this.cfg?.clientId}:${k}`;
  }
  private emit(name: EventName, detail: unknown): void {
    this.listeners.get(name)?.forEach((cb) => {
      try { cb(detail); } catch (e) { console.error("[MeneUygun] listener error", e); }
    });
    document.dispatchEvent(new CustomEvent(`meneuygun:${name}`, { detail }));
  }

  private setPrefs(prefs: Preferences, persist: boolean): void {
    this.prefs = prefs;
    if (persist) store.set(this.key("prefs"), JSON.stringify(prefs));
    this.engine!.apply(prefs);
    this.renderTts();
    this.renderButtons();
    this.emit("preferences", prefs);
  }

  private clearLocal(emit: boolean): void {
    store.del(this.key("token"));
    store.del(this.key("prefs"));
    this.prefs = null;
    this.engine?.reset();
    this.stopListening();
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
        if (!d || d.type !== "meneuygun:authorize") return;
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
    const prefs = normalizePreferences(body.preferences);
    this.setPrefs(prefs, true);
    this.lastFetch = Date.now();
    return prefs;
  }

  /** Handles the return leg of the popup-blocked redirect flow. Returns true if it took over. */
  private completeRedirect(): boolean {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (!hash.has("mu_code") && !hash.has("mu_error")) return false;
    const saved = store.get(this.key("pkce"));
    store.del(this.key("pkce"));
    history.replaceState(null, "", location.href.split("#")[0]);
    if (!saved) {
      console.warn("[MeneUygun] authorization response without a pending request");
      return false;
    }
    const { verifier, state, redirectUri, at } = JSON.parse(saved) as { verifier: string; state: string; redirectUri: string; at: number };
    if (Date.now() - at > 10 * 60_000) {
      this.error = T.failed;
      this.renderButtons();
      return true;
    }
    if (hash.get("mu_state") !== state || hash.has("mu_error")) {
      this.error = hash.get("mu_error") === "access_denied" ? T.denied : T.failed;
      this.renderButtons();
      return true;
    }
    this.busy = true;
    this.renderButtons();
    this.exchange(hash.get("mu_code")!, verifier, redirectUri)
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
    if (document.getElementById("meneuygun-ui-style")) return;
    const s = document.createElement("style");
    s.id = "meneuygun-ui-style";
    s.setAttribute("data-mu-ui", "style");
    s.textContent = `[data-mu-reading]{outline:4px solid #ffbf00!important;outline-offset:4px!important;background-color:rgba(255,230,0,.28)!important}
html[data-mu-listening] body *{cursor:help!important}`;
    (document.head ?? document.documentElement).appendChild(s);
  }

  private shadowHost(container: HTMLElement | null, floatingSide: "left" | "right" | null): { host: HTMLElement; root: HTMLElement } {
    const host = document.createElement("div");
    host.setAttribute("data-mu-ui", "widget");
    if (floatingSide) {
      host.style.cssText = `position:fixed;${floatingSide}:16px;bottom:16px;z-index:2147483647;`;
    }
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${WIDGET_CSS}</style><div class="w"></div>`;
    (container ?? document.body).appendChild(host);
    return { host, root: shadow.querySelector(".w") as HTMLElement };
  }

  private renderButtons(): void {
    if (!this.cfg || !document.body) return;
    if (this.buttons.length === 0) {
      const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-mu-button]"));
      if (slots.length) slots.forEach((s) => this.buttons.push({ root: this.shadowHost(s, null).root, floating: false }));
      else if (this.cfg.floating) this.buttons.push({ root: this.shadowHost(null, "right").root, floating: true });
    }
    for (const b of this.buttons) this.paintButton(b.root, b.floating);
  }

  private paintButton(root: HTMLElement, floating: boolean): void {
    const connected = this.isConnected && !!this.prefs;
    root.textContent = "";
    const el = (tag: string, cls: string, text?: string) => {
      const e = document.createElement(tag);
      e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    const logo = () => el("span", "logo", "MU");
    if (!connected) {
      const btn = el("button", "primary") as HTMLButtonElement;
      btn.append(logo(), document.createTextNode(this.busy ? T.waiting : T.connect));
      btn.disabled = this.busy;
      btn.addEventListener("click", () => this.connect().catch(() => {}));
      root.append(btn);
    } else {
      const row = el("div", "row");
      const chip = el("button", "chip");
      chip.append(logo(), document.createTextNode("✓ " + T.active));
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
          const note = el("div", "note", `Bu sayt aktiv ayarlarınızdan ${c.supported}/${c.active}-ni dəstəkləyir.`);
          if (c.unsupported.length) note.title = "Dəstəklənmir: " + c.unsupported.join(", ");
          if (c.unsupported.length) note.textContent += ` Dəstəklənmir: ${c.unsupported.join(", ")}.`;
          root.append(note);
        }
      }
    }
    if (this.error) root.append(el("div", "msg", this.error));
  }

  // ---------- text-to-speech widget ----------
  private renderTts(): void {
    if (!document.body) return;
    const on = !!this.prefs?.tts;
    if (!on) {
      this.ttsHost?.remove();
      this.ttsHost = this.ttsRoot = null;
      return;
    }
    if (!this.ttsHost) {
      const { host, root } = this.shadowHost(null, "left");
      this.ttsHost = host;
      this.ttsRoot = root;
    }
    const root = this.ttsRoot!;
    root.textContent = "";
    const row = document.createElement("div");
    row.className = "row";
    const listen = document.createElement("button");
    listen.className = "tts" + (this.listening ? " on" : "");
    listen.textContent = (this.listening ? "👆 " + T.listening : "🔊 " + T.listen);
    listen.setAttribute("aria-pressed", String(this.listening));
    listen.addEventListener("click", () => (this.listening ? this.stopListening() : this.startListening()));
    const page = document.createElement("button");
    page.className = "tts";
    page.textContent = "📄 " + T.readPage;
    page.addEventListener("click", () => this.readElement(document.querySelector("main,[role=main],article") ?? document.body));
    const stop = document.createElement("button");
    stop.className = "tts";
    stop.textContent = "⏹ " + T.stop;
    stop.addEventListener("click", () => {
      stopSpeaking();
      this.clearReading();
    });
    row.append(listen, page, stop);
    root.append(row);
    if (!isSpeechSupported()) {
      const n = document.createElement("div");
      n.className = "note";
      n.textContent = T.noVoice;
      root.append(n);
      return;
    }
    void voiceInfo(this.prefs!.language).then((info) => {
      if (!this.ttsRoot || this.ttsRoot !== root) return;
      if (!info.available || info.substitute) {
        const n = document.createElement("div");
        n.className = "note";
        n.textContent = info.available ? T.substitute : T.noVoice;
        root.append(n);
      }
    });
  }

  private onListenClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target || target.closest("[data-mu-ui]")) return;
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
    document.documentElement.setAttribute("data-mu-listening", "");
    document.addEventListener("click", this.onListenClick, true);
    this.renderTts();
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    document.documentElement.removeAttribute("data-mu-listening");
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
    if (el) el.setAttribute("data-mu-reading", "");
    try {
      await speak(text, { language: this.prefs?.language ?? "az", rate: this.prefs?.ttsRate ?? 1, onEnd: () => this.clearReading() });
    } catch (e) {
      console.error("[MeneUygun]", e);
      this.clearReading();
    }
  }

  private clearReading(): void {
    document.querySelectorAll("[data-mu-reading]").forEach((e) => e.removeAttribute("data-mu-reading"));
  }
}

const REVERSE: Record<string, true> = Object.fromEntries(Object.values(T).map((v) => [v, true]));

declare global {
  interface Window {
    MeneUygun: MeneUygunSDK;
  }
}

const sdk = new MeneUygunSDK();
window.MeneUygun = sdk;

// Auto-init from the script tag.
const script = document.currentScript as HTMLScriptElement | null;
if (script?.dataset.clientId) {
  sdk.init({
    clientId: script.dataset.clientId,
    baseUrl: script.dataset.baseUrl ?? new URL(script.src).origin,
    mode: script.dataset.mode === "tokens" ? "tokens" : "auto",
    floating: script.dataset.floating !== "false",
    supports: (script.dataset.supports ?? "").split(",").map((s) => s.trim()).filter(Boolean) as PreferenceKey[],
  });
}

export default sdk;
