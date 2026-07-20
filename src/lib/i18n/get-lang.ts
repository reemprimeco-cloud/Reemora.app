import { cookies } from "next/headers";
import { DEFAULT_LANG, DICTIONARIES, DIR, interpolate, isLang, type Dictionary, type Lang } from "./dictionaries";

export const LANG_COOKIE = "lang";

/** Read the visitor's language from the `lang` cookie. Calling this from a
 *  Server Component forces the page into dynamic rendering (which is what we
 *  want — the response depends on the cookie). */
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const raw = jar.get(LANG_COOKIE)?.value;
  return isLang(raw) ? raw : DEFAULT_LANG;
}

export function getDir(lang: Lang) {
  return DIR[lang];
}

export function getDict(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}

/** Server-side translation helper. Returns a `t` function bound to `lang`.
 *  Accepts a `values` map for `{token}` interpolation. */
export function getT(lang: Lang) {
  const dict = DICTIONARIES[lang];
  return {
    lang,
    dir: DIR[lang],
    dict,
    t(template: string, values: Record<string, string | number> = {}): string {
      return interpolate(template, values);
    },
  };
}
