// Best-effort mapping of MƏNƏ UYĞUN settings to existing standards and platform features.
// "approx" = close equivalent, not an exact one-to-one term of the standard.
import type { PreferenceKey } from "./schema";

export interface StandardRefs {
  wcag?: string[]; // WCAG 2.2 success criteria the setting helps users with
  iso24751?: string; // ISO/IEC 24751 (Individualized adaptability and accessibility) — approx. preference area
  css?: string; // CSS media feature / OS setting with the same intent
}

export const STANDARDS: Record<PreferenceKey, StandardRefs> = {
  fontScale: { wcag: ["1.4.4 Resize Text", "1.4.10 Reflow"], iso24751: "display: text size (approx)", css: "OS text size / Dynamic Type" },
  lineSpacing: { wcag: ["1.4.12 Text Spacing"], iso24751: "display: line spacing (approx)" },
  letterSpacing: { wcag: ["1.4.12 Text Spacing"], iso24751: "display: letter spacing (approx)" },
  contrast: { wcag: ["1.4.3 Contrast (Minimum)", "1.4.6 Contrast (Enhanced)"], iso24751: "display: contrast/colour scheme (approx)", css: "prefers-contrast, prefers-color-scheme" },
  colorFilter: { wcag: ["1.4.1 Use of Color"], iso24751: "display: colour adaptation (approx)", css: "OS colour filters" },
  highlightLinks: { wcag: ["1.4.1 Use of Color", "2.4.4 Link Purpose"], iso24751: "display: link emphasis (approx)" },
  largeCursor: { iso24751: "display: cursor size (approx)", css: "OS pointer size" },
  strongFocus: { wcag: ["2.4.7 Focus Visible", "2.4.13 Focus Appearance"] },
  screenReader: { wcag: ["4.1.2 Name, Role, Value", "1.1.1 Non-text Content"], iso24751: "screen reader (approx)" },
  captions: { wcag: ["1.2.2 Captions (Prerecorded)", "1.2.4 Captions (Live)"], iso24751: "content: captions (approx)" },
  visualAlerts: { wcag: ["1.3.3 Sensory Characteristics"], iso24751: "visual alerts (approx)" },
  transcripts: { wcag: ["1.2.1 Audio-only and Video-only", "1.2.8 Media Alternative"], iso24751: "content: transcript (approx)" },
  signLanguage: { wcag: ["1.2.6 Sign Language (Prerecorded)"], iso24751: "content: sign language (approx)" },
  largeTargets: { wcag: ["2.5.8 Target Size (Minimum)", "2.5.5 Target Size (Enhanced)"] },
  extendedTimeouts: { wcag: ["2.2.1 Timing Adjustable", "2.2.6 Timeouts"] },
  noDrag: { wcag: ["2.5.7 Dragging Movements", "2.5.1 Pointer Gestures"] },
  reduceMotion: { wcag: ["2.3.3 Animation from Interactions", "2.2.2 Pause, Stop, Hide"], css: "prefers-reduced-motion" },
  simpleMode: { wcag: ["3.2.6 Consistent Help (COGA)"], iso24751: "content: simplification (approx)" },
  hideDistractions: { wcag: ["2.2.2 Pause, Stop, Hide"] },
  plainLanguage: { wcag: ["3.1.5 Reading Level"], iso24751: "content: language level (approx)" },
  stepByStep: { wcag: ["3.3.7 Redundant Entry", "3.3.2 Labels or Instructions"] },
  confirmActions: { wcag: ["3.3.4 Error Prevention (Legal, Financial, Data)", "3.3.6 Error Prevention (All)"] },
  iconLabels: { wcag: ["1.1.1 Non-text Content", "2.5.3 Label in Name"] },
  dyslexiaFont: { iso24751: "display: font face (approx)" },
  readingRuler: { iso24751: "display: reading guide (approx)" },
  tts: { iso24751: "text-to-speech (approx)" },
  ttsRate: { iso24751: "text-to-speech: speech rate (approx)" },
  language: { wcag: ["3.1.1 Language of Page"], iso24751: "language (approx)" },
};
