// One authored icon set: 24px grid, 2px stroke, round joins. Always decorative; the visible word carries the meaning.
import type { Category } from "@sdk/schema";

const PATHS = {
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-6h4v6" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><rect x="13" y="4.5" width="4" height="5" /><rect x="7" y="14.5" width="4" height="5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L11.7 6.6" /><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.100a4 4 0 0 0 5.7 5.700l1.4-1.4" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3M9 21h6" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
  speaker: <><path d="M4 9.500v5h3.500L12 18.500v-13L7.5 9.500H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11" /></>,
  check: <path d="M4.5 12.500l5 5 10-11" />,
  cross: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  back: <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" />,
  keyboard: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.500h2" /></>,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M15 9V5.500A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.500v8A1.5 1.5 0 0 0 5.5 15H9" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  warn: <><path d="M12 4l9.5 16h-19L12 4z" /><path d="M12 10v4.500M12 17.500h.01" /></>,
  vision: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  hearing: <><path d="M7 9.500a5.5 5.5 0 1 1 11 0c0 3.5-3.5 4-3.5 7a3 3 0 0 1-5.5 1.5" /><path d="M10 10a2.5 2.5 0 0 1 5 0" /></>,
  motor: <><path d="M8 12V5.500a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.500a1.5 1.5 0 0 1 3 0V14" /><path d="M8 12l-1.8-1.800a1.6 1.6 0 0 0-2.3 2.300L8.5 18.500A7 7 0 0 0 13.5 21 3.5 3.5 0 0 0 17 17.500V14" /></>,
  cognitive: <><path d="M12 3a7 7 0 0 0-4.5 12.400V19h9v-3.600A7 7 0 0 0 12 3z" /><path d="M9.5 22h5M12 8v4M10 10h4" /></>,
  reading: <><path d="M12 6.500C10 5 7 4.5 3.5 4.500v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14C17 4.5 14 5 12 6.500z" /><path d="M12 6.500v14" /></>,
  tech: <><rect x="4" y="4" width="16" height="11" rx="1.5" /><path d="M9 20h6M12 15v5" /></>,
  droplet: <path d="M12 3s6.5 6.5 6.5 11a6.5 6.5 0 0 1-13 0C5.5 9.5 12 3 12 3z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800" /></>,
  bolt: <path d="M13 2.500L5 13.500h6l-1 8 8-11h-6z" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.500" /><path d="M12 12h.01" /></>,
  wave: <path d="M3 12h2l2-6 3 13 3-16 3 12 2-3h3" />,
  hash: <path d="M9 3.500L7.500 20.500M16.500 3.500L15 20.500M4 9h17M3 15h17" />,
  chat: <path d="M4 5h16v11H10l-4.500 4v-4H4z" />,
  battery: <><rect x="2.500" y="8" width="17" height="9" rx="1.500" /><path d="M22 11v3M6 11v3" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export const CATEGORY_ICON: Record<Category, IconName> = {
  vision: "vision",
  hearing: "hearing",
  motor: "motor",
  cognitive: "cognitive",
  reading: "reading",
  tech: "tech",
  color: "droplet",
  light: "sun",
  seizure: "bolt",
  attention: "target",
  sensory: "wave",
  tremor: "motor",
  oneHand: "motor",
  memory: "cognitive",
  dyslexia: "reading",
  numbers: "hash",
  speech: "chat",
  fatigue: "battery",
};
