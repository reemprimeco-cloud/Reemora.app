import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatMoney(amount: number, currency = "KWD") {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

export function formatDate(dateStr: string | null | undefined, lang: "en" | "ar" = "en") {
  const fallback = lang === "ar" ? "قريباً" : "TBA";
  if (!dateStr) return fallback;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const locale = lang === "ar" ? "ar-EG" : "en-GB";
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "course"
  );
}

/** Truthiness alone isn't enough to trust an env var as a URL — a stray
 *  quote, missing scheme, or a value pasted into the wrong field (e.g. an
 *  API key where a URL was expected) is still "truthy" but crashes
 *  @supabase/supabase-js's / @supabase/ssr's client constructor with a hard
 *  throw. Used to gate Supabase usage so a misconfigured env var degrades
 *  to the seed-data fallback / unauthenticated-passthrough instead of
 *  crashing the build or 500ing every request. */
export function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
