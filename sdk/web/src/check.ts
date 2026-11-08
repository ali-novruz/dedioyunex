// Compatibility checker: run on a page that already has the engine applied at a large text scale.
// Finds the problems that make enlarged pages unusable.

export interface CheckIssue {
  kind: "clipped" | "smallTarget" | "lowContrast" | "unlabeled";
  selector: string;
  detail: string;
}

export interface CheckReport {
  fontScale: number;
  horizontalOverflow: boolean;
  counts: Record<CheckIssue["kind"], number>;
  issues: CheckIssue[];
  score: number; // 0–100
}

function selectorOf(el: Element): string {
  if (el.id) return `#${el.id}`;
  const cls = [...el.classList].slice(0, 2).map((c) => `.${c}`).join("");
  return `${el.tagName.toLowerCase()}${cls}`;
}

function rgb(v: string): [number, number, number, number] | null {
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function lum(c: [number, number, number, number]): number {
  const f = (x: number) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function bgOf(el: Element | null): [number, number, number, number] | null {
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage !== "none") return null;
    const c = rgb(cs.backgroundColor);
    if (c && c[3] > 0.9) return c;
  }
  return [255, 255, 255, 1];
}

export function runCheck(doc: Document, fontScale: number, lang: "az" | "en" = "az"): CheckReport {
  const issues: CheckIssue[] = [];
  const view = doc.defaultView!;
  const horizontalOverflow = doc.documentElement.scrollWidth > view.innerWidth + 2;

  doc.querySelectorAll<HTMLElement>("[data-cz-t]").forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const hidden = (v: string) => v === "hidden" || v === "clip";
    if ((hidden(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) || (hidden(cs.overflowX) && el.scrollWidth > el.clientWidth + 2)) {
      issues.push({ kind: "clipped", selector: selectorOf(el), detail: lang === "en" ? "text does not fit its box and is cut off" : "mətn qutuya sığmır və kəsilir" });
    }
    const fg = rgb(cs.color), bg = bgOf(el);
    if (fg && bg) {
      const a = lum(fg), b = lum(bg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5) issues.push({ kind: "lowContrast", selector: selectorOf(el), detail: `kontrast ${ratio.toFixed(1)}:1` });
    }
  });

  doc.querySelectorAll<HTMLElement>("button,a[href],[role=button],input:not([type=hidden]),select").forEach((el) => {
    if (el.closest("[data-cz-ui]")) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (el.tagName !== "A" && (r.width < 44 || r.height < 44)) {
      issues.push({ kind: "smallTarget", selector: selectorOf(el), detail: `${Math.round(r.width)}×${Math.round(r.height)}px` });
    }
    if ((el.tagName === "BUTTON" || el.getAttribute("role") === "button") && !/\p{L}/u.test(el.textContent ?? "") && !el.getAttribute("aria-label") && !el.getAttribute("title")) {
      issues.push({ kind: "unlabeled", selector: selectorOf(el), detail: lang === "en" ? "button with no text and no aria-label" : "yazısız və aria-label-sız düymə" });
    }
  });

  const counts = { clipped: 0, smallTarget: 0, lowContrast: 0, unlabeled: 0 };
  issues.forEach((i) => counts[i.kind]++);
  const penalty = (horizontalOverflow ? 25 : 0) + Math.min(25, counts.clipped * 5) + Math.min(20, counts.lowContrast * 2) + Math.min(15, counts.smallTarget) + Math.min(15, counts.unlabeled * 5);
  return { fontScale, horizontalOverflow, counts, issues, score: Math.max(0, 100 - penalty) };
}
