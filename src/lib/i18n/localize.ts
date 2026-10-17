import type { Lang } from "./dictionaries";

/** Content localization for admin-managed rows.
 *
 *  Public content tables carry optional `*_ar` twins of their text fields
 *  (migration 0036). `localizeRow` returns a copy of the row with each
 *  listed field replaced by its Arabic twin when the visitor's language is
 *  Arabic and the twin is filled; empty twins fall back to the original,
 *  so a half-translated record still reads. English callers get the row
 *  back untouched. The `_ar` fields stay on the object so admin screens
 *  can still read both. */

function filled(v: unknown): boolean {
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

export function localizeRow<T extends object>(row: T, lang: Lang, fields: readonly string[]): T {
  if (lang !== "ar") return row;
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const field of fields) {
    const twin = out[`${field}_ar`];
    if (filled(twin)) out[field] = twin;
  }
  return out as T;
}

export const INSTRUCTOR_FIELDS = ["full_name", "title", "bio", "timeline", "skills"] as const;
export const CERTIFICATE_FIELDS = ["title", "issuing_body"] as const;
export const COURSE_FIELDS = ["title", "short_description", "description", "curriculum"] as const;
export const CATEGORY_FIELDS = ["name"] as const;
export const TESTIMONIAL_FIELDS = ["student_name", "role_company", "quote"] as const;
export const PORTFOLIO_FIELDS = ["title", "description", "category"] as const;
