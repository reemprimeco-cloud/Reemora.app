/** Pure helpers safe to import from client components. */
import type { LoungeSocialLinks } from "@/lib/supabase/lounge.types";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function memberHref(userId: string) {
  return `/lounge/members/${userId}`;
}

export function postHref(postId: string) {
  return `/lounge/posts/${postId}`;
}

/** Relative time with the dictionary's own templates. */
export function timeAgo(
  iso: string,
  t: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string },
  lang: "en" | "ar"
): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo.replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.hoursAgo.replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 7) return t.daysAgo.replace("{n}", String(days));
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined, lang: "en" | "ar"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function socialLinksOf(value: unknown): LoungeSocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: LoungeSocialLinks = {};
  for (const key of ["instagram", "linkedin", "x", "youtube", "github", "other"] as const) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && /^https?:\/\//.test(v)) out[key] = v;
  }
  return out;
}

/** Host name for a safe external link label, e.g. "github.com". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A profile counts as complete when it has a picture, a bio, at least one
 *  skill and at least one link. Mirrors lounge_evaluate_achievements(). */
export function isProfileComplete(m: { avatar_url: string | null; bio: string | null; skills: string[]; website_url: string | null; social_links: unknown }) {
  const links = socialLinksOf(m.social_links);
  return Boolean(m.avatar_url && m.bio && m.bio.trim().length >= 10 && m.skills.length > 0 && (m.website_url || Object.keys(links).length > 0));
}
