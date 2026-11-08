// Interface languages. Every user-facing string is written as a pair, so a missing translation does not compile.

export type Lang = "az" | "en";

export const LANG_COOKIE = "mu_lang";

export const LOCALE: Record<Lang, string> = { az: "az-AZ", en: "en-GB" };

export function isLang(v: unknown): v is Lang {
  return v === "az" || v === "en";
}

/** A message in both languages, for errors raised on the server. */
export interface Bi {
  az: string;
  en: string;
}

export const bi = (az: string, en: string): Bi => ({ az, en });

/** Picks one side of a translation pair: `const l = tr(lang); l("Salam", "Hello")`. */
export const tr = (lang: Lang) => (az: string, en: string): string => (lang === "en" ? en : az);
