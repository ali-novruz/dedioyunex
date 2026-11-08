import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, tr, type Lang } from "./lang";
import { currentUser } from "./session";

/** Azerbaijani unless the visitor chose otherwise. Reads only the cookie, so it needs no database and is safe on error paths. */
export async function requestLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(saved) ? saved : "az";
}

/** Language of the current page: the signed-in user's setting, otherwise the visitor's choice. */
export async function pageLang(): Promise<Lang> {
  const user = await currentUser();
  return user ? user.prefs.language : requestLang();
}

export async function pageT() {
  const lang = await pageLang();
  return { lang, l: tr(lang) };
}
