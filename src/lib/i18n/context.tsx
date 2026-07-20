"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LANG, DICTIONARIES, DIR, interpolate, type Dictionary, type Lang } from "./dictionaries";

export const LANG_COOKIE = "lang";

interface LanguageContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  dict: Dictionary;
  setLang: (next: Lang) => void;
  t: (template: string, values?: Record<string, string | number>) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = React.useState<Lang>(initialLang);

  const setLang = React.useCallback(
    (next: Lang) => {
      if (next === lang) return;
      // 1 year cookie. `SameSite=Lax` is safe here (visitor-set preference).
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      setLangState(next);
      // Refresh the current route so server components pick up the new cookie
      // and re-render with the correct dictionary + <html lang/dir>.
      router.refresh();
    },
    [lang, router]
  );

  const value = React.useMemo<LanguageContextValue>(() => {
    const dict = DICTIONARIES[lang];
    return {
      lang,
      dir: DIR[lang],
      dict,
      setLang,
      t: (template, values = {}) => interpolate(template, values),
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    // Fallback so any accidental use outside a provider doesn't crash the
    // build (e.g. in an isolated Storybook / test); falls back to English.
    const dict = DICTIONARIES[DEFAULT_LANG];
    return {
      lang: DEFAULT_LANG,
      dir: DIR[DEFAULT_LANG],
      dict,
      setLang: () => {},
      t: (template, values = {}) => interpolate(template, values),
    };
  }
  return ctx;
}
