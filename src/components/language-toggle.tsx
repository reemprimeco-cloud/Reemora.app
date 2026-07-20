"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

/** Public-site language switcher. Flips the `lang` cookie and refreshes so
 *  server components pick up the new language on the next render. */
export function LanguageToggle() {
  const { lang, setLang, dict } = useLanguage();
  const next = lang === "en" ? "ar" : "en";
  const label = next === "ar" ? dict.nav.switchToArabic : dict.nav.switchToEnglish;

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border-c px-3 text-[13.5px] font-semibold text-foreground transition active:scale-95 hover:border-blue-400 hover:text-blue-600"
    >
      <Languages size={16} aria-hidden="true" />
      <span aria-hidden="true">{lang === "en" ? "عربي" : "EN"}</span>
    </button>
  );
}
