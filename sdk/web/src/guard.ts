// Action Guard: a clear stop before a payment, submission, deletion or subscription.
// Runs entirely in the browser. Nothing about the action leaves the page.

import type { Language } from "./schema";

const INK = "#262626", PAPER = "#f3f3f3", FIELD = "#f5bc4a";
const COUNTDOWN_S = 10;

const CSS = `
:host{all:initial}
*{box-sizing:border-box;font:inherit}
.veil{position:fixed;inset:0;display:grid;place-items:center;padding:16px;background:rgba(38,38,38,.72);font:17px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:${INK}}
.win{width:min(30em,100%);background:${PAPER};border:2px solid ${INK};border-radius:3px;box-shadow:8px 8px 0 ${INK}}
.bar{padding:.3em .8em;border-bottom:2px solid ${INK};font-size:.85em;font-weight:600}
.body{padding:1.1em 1.2em}
h2{margin:0 0 .4em;font-size:1.35em;font-weight:800;line-height:1.2}
p{margin:0 0 1em}
.warn{padding:.5em .7em;margin-bottom:1em;background:#fae8e5;border:2px solid #8f1d14;color:#8f1d14;font-weight:600}
.row{display:flex;flex-wrap:wrap;gap:.7em}
button{flex:1 1 9em;min-height:3em;padding:.5em 1em;border:2px solid ${INK};border-radius:.55em;background:transparent;color:${INK};font-weight:700;cursor:pointer}
.yes{background:${FIELD};box-shadow:4px 4px 0 ${INK}}
button:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
button:focus-visible{outline:3px solid ${INK};outline-offset:2px}
`;

type Kind = "payment" | "submit" | "delete" | "subscribe";

const TEXT = {
  az: {
    bar: "Cizzy qoruması",
    sure: "Əminsiniz?",
    payment: (a: string, to: string) => `Siz ${a || "pul"}${to ? ` ${to} üçün` : ""} ödəyirsiniz.`,
    submit: () => "Bu məlumatları göndərirsiniz.",
    delete: () => "Bu silinəcək və geri qaytarmaq olmaz.",
    subscribe: () => "Abunə olursunuz. Hər ay pul tutula bilər.",
    yes: "Bəli, davam et",
    no: "Xeyr, geri",
    wait: (s: number) => `Gözləyin: ${s}`,
    strict: "Təhlükəsiz rejim açıqdır. Tələsməyin.",
    q1: "Kimsə sizə zəng edib bunu etməyinizi istədi?",
    q2: "Kimsə sizdən kod, kart nömrəsi və ya CVV istədi?",
    answerYes: "Bəli",
    answerNo: "Xeyr",
    stopTitle: "Dayandırıldı. Bu fırıldaq ola bilər.",
    stop: "Heç nə göndərilmədi. Telefonu bağlayın. Heç bir bank və ya dövlət qurumu telefonla kart nömrəsi, CVV və ya SMS kodu istəmir. Etibar etdiyiniz birinə zəng edin.",
    close: "Bağla",
  },
  en: {
    bar: "Cizzy protection",
    sure: "Are you sure?",
    payment: (a: string, to: string) => `You are paying ${a || "money"}${to ? ` to ${to}` : ""}.`,
    submit: () => "You are sending this information.",
    delete: () => "This will be deleted and cannot be brought back.",
    subscribe: () => "You are subscribing. Money may be taken every month.",
    yes: "Yes, continue",
    no: "No, go back",
    wait: (s: number) => `Please wait: ${s}`,
    strict: "Safe mode is on. Take your time.",
    q1: "Did someone phone you and ask you to do this?",
    q2: "Did someone ask you for a code, card number or CVV?",
    answerYes: "Yes",
    answerNo: "No",
    stopTitle: "Stopped. This may be a scam.",
    stop: "Nothing was sent. Hang up the phone. No bank or government office asks for a card number, CVV or SMS code by phone. Call someone you trust.",
    close: "Close",
  },
};

export class ActionGuard {
  private level = "off";
  private allowed: HTMLElement | null = null;
  private host: HTMLElement | null = null;
  private timer = 0;

  constructor(
    private readonly doc: Document,
    private readonly lang: () => Language,
    private readonly say: (text: string) => void,
  ) {}

  apply(level: string): void {
    if (level === this.level) return;
    if (this.level === "off" && level !== "off") {
      this.doc.addEventListener("click", this.onClick, true);
      this.doc.addEventListener("submit", this.onSubmit, true);
    }
    if (level === "off" && this.level !== "off") {
      this.doc.removeEventListener("click", this.onClick, true);
      this.doc.removeEventListener("submit", this.onSubmit, true);
      this.close();
    }
    this.level = level;
  }

  private stop(e: Event, el: HTMLElement): void {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!this.host) this.ask(el);
  }

  private onClick = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.("[data-cz-guard]") as HTMLElement | null;
    if (!el || el.closest("[data-cz-ui]")) return;
    if (el === this.allowed) return;
    this.stop(e, el);
  };

  /** Pressing Enter in a field submits without any click on the guarded button. */
  private onSubmit = (e: Event) => {
    const el = (e.target as HTMLFormElement).querySelector?.<HTMLElement>("[data-cz-guard]");
    if (!el) return;
    if (el === this.allowed) {
      this.allowed = null;
      return;
    }
    this.stop(e, el);
  };

  private proceed(el: HTMLElement): void {
    this.close();
    this.allowed = el;
    el.click();
    // A plain button has no submit event to clear this.
    setTimeout(() => {
      if (this.allowed === el) this.allowed = null;
    }, 0);
  }

  private close(): void {
    clearInterval(this.timer);
    this.host?.remove();
    this.host = null;
  }

  private message(el: HTMLElement): string {
    const t = TEXT[this.lang()];
    const own = el.getAttribute("data-cz-guard-text");
    if (own) return own;
    const kind = el.getAttribute("data-cz-guard") as Kind;
    if (kind === "payment") return t.payment(el.getAttribute("data-cz-guard-amount") ?? "", el.getAttribute("data-cz-guard-to") ?? "");
    if (kind === "delete" || kind === "subscribe") return t[kind]();
    return t.submit();
  }

  private ask(el: HTMLElement): void {
    const host = this.doc.createElement("div");
    host.setAttribute("data-cz-ui", "guard");
    host.setAttribute("role", "alertdialog");
    host.setAttribute("aria-modal", "true");
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${CSS}</style><div class="veil"><div class="win"><div class="bar"></div><div class="body"></div></div></div>`;
    this.doc.body.appendChild(host);
    this.host = host;
    shadow.querySelector(".bar")!.textContent = TEXT[this.lang()].bar;
    shadow.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape") this.close();
    });
    const body = shadow.querySelector(".body") as HTMLElement;
    if (this.level === "strict") this.question(body, el, 0);
    else this.confirm(body, el, false);
  }

  private screen(body: HTMLElement, title: string, text: string, warn: string | null): HTMLElement {
    body.textContent = "";
    if (warn) {
      const w = this.doc.createElement("div");
      w.className = "warn";
      w.textContent = warn;
      body.append(w);
    }
    const h = this.doc.createElement("h2");
    h.textContent = title;
    body.append(h);
    if (text) {
      const p = this.doc.createElement("p");
      p.textContent = text;
      body.append(p);
    }
    const row = this.doc.createElement("div");
    row.className = "row";
    body.append(row);
    this.say(`${title} ${text}`);
    return row;
  }

  private button(row: HTMLElement, label: string, primary: boolean, onPress: () => void): HTMLButtonElement {
    const b = this.doc.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (primary) b.className = "yes";
    b.addEventListener("click", onPress);
    row.append(b);
    return b;
  }

  private confirm(body: HTMLElement, el: HTMLElement, strict: boolean): void {
    const t = TEXT[this.lang()];
    const row = this.screen(body, t.sure, this.message(el), strict ? t.strict : null);
    const no = this.button(row, t.no, false, () => this.close());
    const yes = this.button(row, t.yes, true, () => this.proceed(el));
    no.focus();
    if (!strict) return;
    let left = COUNTDOWN_S;
    yes.disabled = true;
    yes.textContent = t.wait(left);
    this.timer = window.setInterval(() => {
      left--;
      if (left > 0) {
        yes.textContent = t.wait(left);
        return;
      }
      clearInterval(this.timer);
      yes.disabled = false;
      yes.textContent = t.yes;
    }, 1000);
  }

  private question(body: HTMLElement, el: HTMLElement, index: number): void {
    const t = TEXT[this.lang()];
    const row = this.screen(body, index === 0 ? t.q1 : t.q2, "", t.strict);
    const yes = this.button(row, t.answerYes, false, () => this.blocked(body));
    this.button(row, t.answerNo, false, () => (index === 0 ? this.question(body, el, 1) : this.confirm(body, el, true)));
    yes.focus();
  }

  private blocked(body: HTMLElement): void {
    const t = TEXT[this.lang()];
    const row = this.screen(body, t.stopTitle, t.stop, null);
    this.button(row, t.close, true, () => this.close()).focus();
  }
}
