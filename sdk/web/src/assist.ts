// Page explainer: collects what the user sees (text, headings, controls) and turns the AI answer into UI.
// Privacy: form values are never read; anything inside [data-mu-private] or SDK UI is skipped;
// URLs are sent without query string or hash.

export interface PageHelp {
  headline: string;
  summary: string;
  points: string[];
  actions: { id: string; explain: string }[];
}

export interface PageSnapshot {
  url: string;
  title: string;
  headings: string[];
  text: string;
  actions: { id: string; label: string; kind: string; hint?: string }[];
}

const SKIP = "[data-mu-ui],[data-mu-private],script,style,noscript,template,svg";
const CONTROLS = "a[href],button,[role=button],[role=link],[role=tab],[role=menuitem],input[type=submit],input[type=button],select,summary";
const AID = "data-mu-aid";

function visible(el: Element): boolean {
  if (el.closest(SKIP)) return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
}

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function labelOf(el: Element): string {
  const own = clean((el as HTMLElement).innerText);
  if (/\p{L}/u.test(own)) return own.slice(0, 120);
  const aria = clean(el.getAttribute("aria-label")) || clean(el.getAttribute("title"));
  const img = clean(el.querySelector("img[alt]")?.getAttribute("alt"));
  const val = el instanceof HTMLInputElement ? clean(el.value) : "";
  return (aria || img || val || own).slice(0, 120);
}

function kindOf(el: Element): string {
  const t = el.tagName.toLowerCase();
  if (t === "a" || el.getAttribute("role") === "link") return "link";
  if (t === "select") return "dropdown";
  if (t === "summary") return "expand";
  if (el.getAttribute("role") === "tab") return "tab";
  return "button";
}

function hintOf(el: Element, label: string): string | undefined {
  const parts: string[] = [];
  const title = clean(el.getAttribute("title"));
  const aria = clean(el.getAttribute("aria-label"));
  if (title && title !== label) parts.push(title);
  if (aria && aria !== label && aria !== title) parts.push(aria);
  if (el instanceof HTMLAnchorElement && el.href) {
    try {
      const u = new URL(el.href);
      parts.push(u.origin === location.origin ? u.pathname : `${u.host}${u.pathname}`);
    } catch {
      /* ignore malformed href */
    }
  }
  const icon = clean(el.textContent);
  if (icon && !/\p{L}/u.test(icon)) parts.push(`icon "${icon.slice(0, 8)}"`);
  return parts.length ? parts.join("; ").slice(0, 120) : undefined;
}

/** Takes a snapshot of the page and tags controls with data-mu-aid (same label → same id). */
export function snapshot(doc: Document): PageSnapshot {
  const root = doc.querySelector("main,[role=main],article") ?? doc.body;
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3"))
    .filter(visible)
    .map((h) => clean((h as HTMLElement).innerText))
    .filter(Boolean)
    .slice(0, 20);

  let text = "";
  for (const el of Array.from(root.querySelectorAll("h1,h2,h3,h4,p,li,dt,dd,td,th,blockquote,figcaption,label"))) {
    if (text.length > 4000) break;
    if (!visible(el)) continue;
    const t = clean((el as HTMLElement).innerText);
    if (t && !text.includes(t)) text += t + "\n";
  }

  // Many sites put their text in plain <div>/<span> blocks instead of paragraphs.
  if (text.length < 200) {
    for (const el of Array.from(root.querySelectorAll("div,span,b,strong,em,section"))) {
      if (text.length > 4000) break;
      if (el.querySelector("div,p,section,ul,ol,table,h1,h2,h3") || el.closest(CONTROLS) || !visible(el)) continue;
      const t = clean((el as HTMLElement).innerText);
      if (t.length >= 3 && !text.includes(t)) text += t + "\n";
    }
  }

  const byKey = new Map<string, string>();
  const actions: PageSnapshot["actions"] = [];
  let n = 0;
  for (const el of Array.from(doc.querySelectorAll(CONTROLS))) {
    if (!visible(el)) continue;
    const label = labelOf(el);
    const kind = kindOf(el);
    const hint = hintOf(el, label);
    if (!label && !hint) continue;
    const key = `${kind}|${label}|${hint ?? ""}`;
    let id = byKey.get(key);
    if (!id) {
      if (actions.length >= 80) continue;
      id = `a${++n}`;
      byKey.set(key, id);
      actions.push({ id, label, kind, hint });
    }
    el.setAttribute(AID, id);
  }

  return { url: location.origin + location.pathname, title: clean(doc.title), headings, text: text.slice(0, 4000), actions };
}

export function controlFor(target: Element | null): Element | null {
  return target?.closest(`[${AID}]`) ?? target?.closest(CONTROLS) ?? null;
}

export function aidOf(el: Element): string | null {
  return el.getAttribute(AID);
}

export function elementsFor(doc: Document, id: string): Element[] {
  return Array.from(doc.querySelectorAll(`[${AID}="${id}"]`)).filter(visible);
}
