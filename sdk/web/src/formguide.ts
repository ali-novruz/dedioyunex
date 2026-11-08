// Form Guide: one field at a time, a plain explanation next to it, and a progress bar.
// Only a field's label and name may be sent for an explanation; values never are.

import type { Language } from "./schema";

const FIELDS = "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]):not([type=reset]),select,textarea";
const HIDE = "data-mu-fg-hidden";

interface Step {
  wrapper: HTMLElement;
  fields: HTMLElement[];
}

export type Explain = (label: string, hint: string) => Promise<string>;

const TEXT = {
  az: {
    progress: (a: number, b: number) => `Sahə ${a} / ${b}`,
    next: "Növbəti",
    back: "Geri",
    done: "Hazırdır. Məlumatları yoxlayıb göndərin.",
    built: { email: "E-poçt ünvanınızı yazın.", tel: "Telefon nömrənizi yazın.", date: "Tarixi seçin.", password: "Şifrənizi heç kimə deməyin.", select: "Siyahıdan birini seçin.", number: "Rəqəmlə yazın." } as Record<string, string>,
  },
  en: {
    progress: (a: number, b: number) => `Field ${a} of ${b}`,
    next: "Next",
    back: "Back",
    done: "All done. Check your details and send.",
    built: { email: "Enter your e-mail address.", tel: "Enter your phone number.", date: "Choose the date.", password: "Never tell anyone your password.", select: "Choose one from the list.", number: "Enter a number." } as Record<string, string>,
  },
};

export class FormGuide {
  private enabled = false;
  private cleanups: (() => void)[] = [];

  constructor(
    private readonly doc: Document,
    private readonly lang: () => Language,
    private readonly explain: Explain,
    private readonly say: (text: string) => void,
  ) {}

  apply(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.cleanups.splice(0).forEach((undo) => undo());
    if (!enabled) return;
    const run = () => this.doc.querySelectorAll<HTMLElement>("form,[data-mu-form-guide]").forEach((f) => this.guide(f));
    if (this.doc.readyState === "loading") this.doc.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }

  private visible(el: HTMLElement): boolean {
    return el.getClientRects().length > 0;
  }

  /** The largest element around a field that holds no other field: label and input travel together. */
  private wrap(first: HTMLElement, fields: HTMLElement[], form: HTMLElement): HTMLElement {
    const all = Array.from(form.querySelectorAll<HTMLElement>(FIELDS));
    let node: HTMLElement = first;
    while (node.parentElement && node.parentElement !== form) {
      const parent = node.parentElement;
      if (all.some((f) => parent.contains(f) && !fields.includes(f))) break;
      node = parent;
    }
    return node;
  }

  private stepsOf(form: HTMLElement): Step[] {
    const seen = new Set<HTMLElement>();
    const steps: Step[] = [];
    const candidates = Array.from(form.querySelectorAll<HTMLElement>(FIELDS)).filter((f) => this.visible(f) && !f.closest("[data-mu-ui]"));
    for (const field of candidates) {
      if (seen.has(field)) continue;
      const input = field as HTMLInputElement;
      const group = (input.type === "radio" || input.type === "checkbox") && input.name ? candidates.filter((c) => (c as HTMLInputElement).name === input.name) : [field];
      group.forEach((g) => seen.add(g));
      steps.push({ wrapper: this.wrap(field, group, form), fields: group });
    }
    return steps;
  }

  private labelOf(field: HTMLElement): string {
    const i = field as HTMLInputElement;
    const byFor = i.id ? this.doc.querySelector(`label[for="${CSS.escape(i.id)}"]`)?.textContent : null;
    return (byFor ?? field.closest("label")?.textContent ?? field.getAttribute("aria-label") ?? i.placeholder ?? i.name ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  }

  private guide(form: HTMLElement): void {
    if (form.getAttribute("data-mu-form-guide") === "off" || form.closest("[data-mu-ui]")) return;
    const steps = this.stepsOf(form);
    if (steps.length < 3 && !form.hasAttribute("data-mu-form-guide")) return;
    if (steps.length === 0) return;
    const t = TEXT[this.lang()];
    const submits = Array.from(form.querySelectorAll<HTMLElement>("[type=submit],button:not([type]),[data-mu-form-submit]")).filter((b) => !b.closest("[data-mu-ui]"));
    const explained = new Map<HTMLElement, string>();

    const panel = this.doc.createElement("div");
    panel.setAttribute("data-mu-ui", "form-guide");
    panel.style.cssText = "margin:.8em 0;padding:.8em 1em;background:#f3f3f3;color:#262626;border:2px solid #262626;border-radius:3px;font:500 16px/1.45 system-ui,sans-serif";
    const progress = this.doc.createElement("div");
    progress.style.cssText = "font-weight:700";
    const track = this.doc.createElement("div");
    track.style.cssText = "height:10px;margin:.4em 0 .6em;border:2px solid #262626;border-radius:2px";
    const bar = this.doc.createElement("div");
    bar.setAttribute("data-mu-fg-bar", "");
    bar.style.cssText = "height:100%;background:#262626";
    track.append(bar);
    const help = this.doc.createElement("div");
    help.style.cssText = "min-height:1.45em;margin-bottom:.6em";
    help.setAttribute("aria-live", "polite");
    const row = this.doc.createElement("div");
    row.style.cssText = "display:flex;gap:.6em";
    const makeButton = (label: string, primary: boolean) => {
      const b = this.doc.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = `flex:1;min-height:48px;border:2px solid #262626;border-radius:.5em;font:inherit;font-weight:700;cursor:pointer;color:#262626;background:${primary ? "#f5bc4a" : "transparent"}`;
      return b;
    };
    const back = makeButton(t.back, false);
    const next = makeButton(t.next, true);
    row.append(back, next);
    panel.append(progress, track, help, row);

    let index = 0;
    const atEnd = () => index >= steps.length;
    const describe = (step: Step) => {
      const f = step.fields[0] as HTMLInputElement;
      const own = f.getAttribute("data-mu-help") ?? f.title;
      if (own) return (help.textContent = own);
      const built = t.built[f.tagName === "SELECT" ? "select" : f.type];
      if (built) return (help.textContent = built);
      const known = explained.get(f);
      if (known) return (help.textContent = known);
      help.textContent = "";
      const asked = index;
      this.explain(this.labelOf(f), `${f.tagName.toLowerCase()} ${f.name ?? ""}`.trim())
        .then((text) => {
          explained.set(f, text);
          if (asked === index) help.textContent = text;
        })
        .catch((e) => console.warn("[MeneUygun] form field explanation failed", e));
      return "";
    };
    const show = (focus: boolean) => {
      steps.forEach((s, i) => (i === index ? s.wrapper.removeAttribute(HIDE) : s.wrapper.setAttribute(HIDE, "")));
      submits.forEach((b) => (atEnd() ? b.removeAttribute(HIDE) : b.setAttribute(HIDE, "")));
      progress.textContent = t.progress(Math.min(index + 1, steps.length), steps.length);
      bar.style.width = `${Math.round((Math.min(index + (atEnd() ? 0 : 1), steps.length) / steps.length) * 100)}%`;
      back.style.display = index === 0 ? "none" : "";
      next.style.display = atEnd() ? "none" : "";
      if (atEnd()) {
        help.textContent = t.done;
        this.say(t.done);
        steps.forEach((s) => s.wrapper.removeAttribute(HIDE));
        return;
      }
      const step = steps[index];
      step.wrapper.after(panel);
      describe(step);
      if (focus) step.fields[0].focus();
    };
    const advance = () => {
      if (!atEnd()) {
        const invalid = steps[index].fields.find((f) => !(f as HTMLInputElement).reportValidity());
        if (invalid) return;
      }
      index++;
      show(true);
    };
    next.addEventListener("click", advance);
    back.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      show(true);
    });
    const onEnter = (e: Event) => {
      const k = e as KeyboardEvent;
      if (k.key !== "Enter" || atEnd() || (k.target as HTMLElement).tagName === "TEXTAREA") return;
      k.preventDefault();
      advance();
    };
    form.addEventListener("keydown", onEnter);
    show(false);
    this.cleanups.push(() => {
      form.removeEventListener("keydown", onEnter);
      panel.remove();
      steps.forEach((s) => s.wrapper.removeAttribute(HIDE));
      submits.forEach((b) => b.removeAttribute(HIDE));
    });
  }
}
