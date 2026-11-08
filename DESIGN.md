# Design

Source: the user's Canva reference "Yellow Colorful UI Health and Wellness Bio-Link Website". Style only; no content or name is reused.

Idea: every action is a physical key on a yellow desk. Press it and it goes down.

## Colour

| Token | Value | Use |
|---|---|---|
| `--field` | `#f5bc4a` | Page background; primary key inside a window |
| `--field-soft` | `#fce7bd` | Notices |
| `--paper` | `#f3f3f3` | Windows; primary key on the field |
| `--white` | `#ffffff` | Inputs |
| `--ink` | `#262626` | Text, borders, shadows, pressed keys |
| `--ink-soft` | `#4a4a4a` | Secondary text on paper only |
| `--danger` / `--danger-soft` | `#8f1d14` / `#fae8e5` | Errors, destructive actions |
| `--good` / `--good-soft` | `#1c5a36` / `#e2efe6` | Success |

No gradients, no soft shadows, no other hues. Text on the field is always `--ink`.

## Type

- Archivo for everything, 400 to 800. Headings 800 with tight tracking.
- Libre Baskerville Italic only for the one-line slogan.
- **Every font must contain Ə and ə (U+018F, U+0259).** Many popular fonts do not; Rubik and Figtree fail. Check before adding a face: measure each of `ƏəĞğİıÖöŞşÇçÜü` against two different fallbacks.
- Lexend remains the "easy-to-read font" setting.

## Components

- **Window**: paper, 2px ink border, 3px radius, 7px hard shadow, title bar. The only container. Rows inside are split by a thin rule; windows are never nested.
- **Window rings**: three small empty rings, decorative. They carry no glyphs, so they cannot be mistaken for close or minimise controls.
- **Key** (`.btn-primary`): 2px ink border, about 12px radius, 6px hard shadow. Hover moves it 2px; pressing moves it the full 6px and the shadow disappears; selected stays down and turns ink.
- **Secondary** (`.btn-secondary`): flat outline, fills ink on hover.
- **Switch**: always shows the word (Açıq / Bağlı, On / Off); position is never the only signal.
- **Icons**: one authored set in `components/Icons.tsx`, 24px grid, 2px stroke, always next to a word. No emoji in product UI.

## Assistant

Speaking and typing are two equal ways in, side by side. While a suggestion is on screen, typing adjusts it and the assistant continues from that suggestion.

## Language

Azerbaijani by default, English by choice. Strings are written as pairs, `l("az", "en")`, so a missing translation does not compile. Server errors use `bi("az", "en")`. Signed-in users follow their saved language, visitors a cookie.

## Accessibility outranks style

High contrast, dark mode, text size, spacing and reduced motion are applied by the same engine partners use, and always win. Text on field and paper is at least 8:1. Touch targets are at least 44px.

## Scope notes

- SDK widgets repeat these tokens inline because they live in a shadow root on other sites, and use the system font so no web font loads on partner pages.
- Demo pages keep their deliberately poor look so the before and after is visible. Only the top strip uses this style.
