// Behaviour adaptations that CSS cannot do: guarding clicks, hover-to-click, stopping media, warnings.

import type { Preferences } from "./schema";

const UI = "data-cz-ui";

const KEYS: (keyof Preferences)[] = ["clickGuard", "dwellClick", "warnExternalLinks", "muteAudio", "stopAutoplay", "flashGuard", "unstickHeaders", "skipLink", "breakReminder", "readerMode", "collapseMenus", "language"];

const CONTROL = "a[href],button,[role=button],summary,input[type=checkbox],input[type=radio],select";
const CONSEQUENTIAL = /ödə|sil\b|göndər|təsdiq|köçür|\bpay\b|delete|remove|send|confirm|buy|order|transfer/i;

export class Behaviors {
  private signature = "";
  private cleanups: (() => void)[] = [];

  constructor(private readonly doc: Document) {}

  apply(p: Preferences): void {
    const signature = KEYS.map((k) => String(p[k])).join("|");
    if (signature === this.signature) return;
    this.clear();
    this.signature = signature;
    const run = () => this.start(p);
    if (this.doc.body) run();
    else this.doc.addEventListener("DOMContentLoaded", run, { once: true });
  }

  clear(): void {
    this.cleanups.splice(0).forEach((undo) => undo());
    this.signature = "";
  }

  private on(target: EventTarget, type: string, fn: (e: Event) => void, capture = true): void {
    target.addEventListener(type, fn, capture);
    this.cleanups.push(() => target.removeEventListener(type, fn, capture));
  }

  private start(p: Preferences): void {
    const en = p.language === "en";
    if (p.clickGuard) this.guardClicks();
    if (p.dwellClick > 0) this.dwell(p.dwellClick);
    if (p.warnExternalLinks) this.warnExternal(en);
    if (p.muteAudio || p.stopAutoplay || p.flashGuard) this.media(p.muteAudio, p.stopAutoplay || p.flashGuard);
    if (p.flashGuard) this.freezeGifs();
    if (p.unstickHeaders) this.unstick();
    if (p.skipLink) this.addSkipLink(en);
    if (p.breakReminder > 0) this.remindBreaks(p.breakReminder, en);
    if (p.readerMode) this.reader();
    if (p.collapseMenus) this.shortenMenus(en);
  }

  /** Keeps only the main content: everything that is not on the path down to it is hidden. */
  private reader(): void {
    const view = this.doc.defaultView!;
    const own = (el: Element) => el.closest(`[${UI}]`);
    const textOf = (el: Element) => Array.from(el.querySelectorAll("p,li,h1,h2,h3")).reduce((n, x) => n + (x.textContent?.trim().length ?? 0), 0);
    let main = this.doc.querySelector<HTMLElement>("main,[role=main],article");
    if (!main) {
      let best = 0;
      this.doc.body.querySelectorAll<HTMLElement>("div,section").forEach((el) => {
        if (own(el) || view.getComputedStyle(el).display === "none") return;
        const direct = Array.from(el.children).filter((c) => /^(P|H1|H2|H3|UL|OL)$/.test(c.tagName)).reduce((n, c) => n + (c.textContent?.length ?? 0), 0);
        if (direct > best) {
          best = direct;
          main = el;
        }
      });
    }
    if (!main || textOf(main) < 40) return;
    const hidden: Element[] = [];
    for (let node: HTMLElement = main; node !== this.doc.body && node.parentElement; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement.children)) {
        if (sibling === node || own(sibling) || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) continue;
        sibling.setAttribute("data-cz-rd-hide", "");
        hidden.push(sibling);
      }
    }
    main.setAttribute("data-cz-rd-main", "");
    const root = main;
    this.cleanups.push(() => {
      hidden.forEach((el) => el.removeAttribute("data-cz-rd-hide"));
      root.removeAttribute("data-cz-rd-main");
    });
  }

  /** A menu of 12 items becomes 5 and a "More" button. */
  private shortenMenus(en: boolean): void {
    const KEEP = 5;
    this.doc.querySelectorAll<HTMLElement>("nav,[role=navigation],header ul").forEach((menu) => {
      if (menu.closest(`[${UI}]`)) return;
      const links = Array.from(menu.querySelectorAll<HTMLElement>("a[href],button")).filter((a) => !a.closest(`[${UI}]`));
      if (links.length <= KEEP + 1) return;
      const important = (a: HTMLElement) => a.matches("[aria-current],[data-cz-simple='primary'],[class~='active'],[class~='cur'],[class~='current']");
      const extra = links.filter((a, i) => i >= KEEP && !important(a));
      extra.forEach((a) => a.setAttribute("data-cz-collapsed", ""));
      const more = this.doc.createElement("button");
      more.type = "button";
      more.setAttribute(UI, "more");
      more.textContent = en ? `More (${extra.length})` : `Daha çox (${extra.length})`;
      more.addEventListener("click", () => {
        extra.forEach((a) => a.removeAttribute("data-cz-collapsed"));
        more.remove();
      });
      menu.append(more);
      this.cleanups.push(() => {
        extra.forEach((a) => a.removeAttribute("data-cz-collapsed"));
        more.remove();
      });
    });
  }

  /** Shaking hands press twice: the second press within 600 ms is ignored. */
  private guardClicks(): void {
    let last = 0;
    this.on(this.doc, "click", (e) => {
      const now = Date.now();
      if (now - last < 600) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      last = now;
    });
  }

  /** Resting the pointer on a control presses it. Never for actions with consequences. */
  private dwell(ms: number): void {
    let timer = 0;
    let current: HTMLElement | null = null;
    const cancel = () => {
      clearTimeout(timer);
      current?.removeAttribute("data-cz-dwell");
      current = null;
    };
    const consequential = (el: HTMLElement) =>
      el.matches("[type=submit],[data-cz-guard]") ||
      (el.tagName === "BUTTON" && !!el.closest("form") && el.getAttribute("type") !== "button") ||
      CONSEQUENTIAL.test(el.textContent ?? "");
    this.on(this.doc, "mouseover", (e) => {
      const el = (e.target as Element | null)?.closest?.(CONTROL) as HTMLElement | null;
      if (el === current) return;
      cancel();
      if (!el || el.closest(`[${UI}]`) || consequential(el)) return;
      current = el;
      el.setAttribute("data-cz-dwell", "");
      timer = window.setTimeout(() => {
        cancel();
        el.click();
      }, ms);
    });
    this.cleanups.push(cancel);
  }

  private warnExternal(en: boolean): void {
    this.on(this.doc, "click", (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !/^https?:/.test(a.href) || a.host === location.host) return;
      const text = en ? `You are leaving this site for ${a.host}. Do you trust it?` : `Bu saytdan çıxıb ${a.host} ünvanına keçirsiniz. Ona etibar edirsiniz?`;
      if (!window.confirm(text)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  }

  private media(mute: boolean, noAutoplay: boolean): void {
    let gesture = 0;
    const muted = new Set<HTMLMediaElement>();
    const handle = (m: HTMLMediaElement) => {
      if (mute && !m.muted) {
        m.muted = true;
        muted.add(m);
      }
      if (noAutoplay && Date.now() - gesture > 1500) m.pause();
    };
    this.on(this.doc, "pointerdown", () => (gesture = Date.now()));
    this.on(this.doc, "keydown", () => (gesture = Date.now()));
    this.on(this.doc, "play", (e) => handle(e.target as HTMLMediaElement));
    this.doc.querySelectorAll<HTMLMediaElement>("video,audio").forEach(handle);
    this.cleanups.push(() => muted.forEach((m) => (m.muted = false)));
  }

  /** Animated images are replaced by their first frame. One that cannot be read (other origin) is hidden instead. */
  private freezeGifs(): void {
    const freeze = (img: HTMLImageElement) => {
      if (!img.naturalWidth || img.hasAttribute("data-cz-gif")) return;
      const original = img.src;
      try {
        const c = this.doc.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        img.src = c.toDataURL();
        img.setAttribute("data-cz-gif", "");
        this.cleanups.push(() => {
          img.src = original;
          img.removeAttribute("data-cz-gif");
        });
      } catch {
        img.style.visibility = "hidden";
        this.cleanups.push(() => (img.style.visibility = ""));
      }
    };
    this.doc.querySelectorAll<HTMLImageElement>('img[src*=".gif"]').forEach((img) => {
      if (img.complete) freeze(img);
      else this.on(img, "load", () => freeze(img), false);
    });
  }

  /** Bars pinned to the screen cover the text when it is enlarged. Dialogs are left alone. */
  private unstick(): void {
    const view = this.doc.defaultView!;
    const marked: Element[] = [];
    this.doc.body.querySelectorAll("*").forEach((el) => {
      if (el.closest(`[${UI}]`)) return;
      const pos = view.getComputedStyle(el).position;
      if (pos !== "fixed" && pos !== "sticky") return;
      const r = el.getBoundingClientRect();
      if (r.width < view.innerWidth * 0.5 || r.height > view.innerHeight * 0.4) return;
      el.setAttribute("data-cz-unstick", "");
      marked.push(el);
    });
    this.cleanups.push(() => marked.forEach((el) => el.removeAttribute("data-cz-unstick")));
  }

  private addSkipLink(en: boolean): void {
    const target = this.doc.querySelector<HTMLElement>("main,[role=main],article,h1");
    if (!target) return;
    const a = this.doc.createElement("a");
    a.setAttribute(UI, "skip");
    a.href = "#";
    a.textContent = en ? "Skip to main content" : "Əsas məzmuna keç";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus();
    });
    this.doc.body.prepend(a);
    this.cleanups.push(() => a.remove());
  }

  private remindBreaks(minutes: number, en: boolean): void {
    const timer = window.setInterval(() => {
      if (this.doc.querySelector(`[${UI}='break']`)) return;
      const bar = this.doc.createElement("div");
      bar.setAttribute(UI, "break");
      bar.setAttribute("role", "status");
      bar.textContent = en ? "Time for a short break. Rest your eyes for a moment." : "Qısa fasilə vaxtıdır. Gözlərinizi bir az dincəldin.";
      this.doc.body.append(bar);
      setTimeout(() => bar.remove(), 20_000);
    }, minutes * 60_000);
    this.cleanups.push(() => clearInterval(timer));
  }
}
