/** Social handles and bare domains → canonical https links, and back.
 *  Pure helpers, safe for client components.
 *
 *  Members type only their username (e.g. "prime_kw") or a bare domain
 *  ("reemora.app"); we store the full https URL so every <a href> stays
 *  a safe absolute link and, on phones, opens the native app via the
 *  platform's universal links. Pasting a full URL still works. */

export const SOCIAL_KEYS = ["instagram", "linkedin", "x", "youtube", "github", "other"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** Canonical profile base per platform, the visible prefix in the editor,
 *  and the hostnames we recognise when turning a pasted URL back into a
 *  handle. */
const PLATFORMS: Record<Exclude<SocialKey, "other">, { base: string; prefix: string; hosts: string[]; pathPrefix?: string }> = {
  instagram: { base: "https://instagram.com/", prefix: "instagram.com/", hosts: ["instagram.com"] },
  x: { base: "https://x.com/", prefix: "x.com/", hosts: ["x.com", "twitter.com"] },
  youtube: { base: "https://youtube.com/@", prefix: "youtube.com/@", hosts: ["youtube.com"], pathPrefix: "@" },
  github: { base: "https://github.com/", prefix: "github.com/", hosts: ["github.com"] },
  linkedin: { base: "https://linkedin.com/in/", prefix: "linkedin.com/in/", hosts: ["linkedin.com"], pathPrefix: "in/" },
};

const HANDLE_RE = /^@?[A-Za-z0-9._-]{1,64}$/;
const DOMAINISH_RE = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(\/\S*)?$/;

export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname) && value.length <= 300;
  } catch {
    return false;
  }
}

/** The text shown before the input for a given field ("" for free links). */
export function socialPrefix(key: SocialKey | "website"): string {
  if (key === "website" || key === "other") return "https://";
  return PLATFORMS[key].prefix;
}

/** Turn what a member typed into a canonical https URL.
 *  Returns "" for an empty value, null when it cannot be made into a safe link. */
export function normalizeLink(key: SocialKey | "website", raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return isSafeHttpUrl(value) ? value : null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null; // javascript:, mailto:, data: …

  if (key !== "website" && key !== "other") {
    const p = PLATFORMS[key];
    if (HANDLE_RE.test(value)) return p.base + value.replace(/^@/, "");
    // "instagram.com/prime_kw" or "www.instagram.com/prime_kw/"
    if (DOMAINISH_RE.test(value)) {
      const url = "https://" + value;
      return isSafeHttpUrl(url) ? url : null;
    }
    return null;
  }

  if (DOMAINISH_RE.test(value)) {
    const url = "https://" + value;
    return isSafeHttpUrl(url) ? url : null;
  }
  return null;
}

/** What to show in the editor input for a stored URL: the bare handle
 *  when the URL is on the platform's own host, otherwise the full URL. */
export function editableValue(key: SocialKey | "website", url: string | null | undefined): string {
  if (!url) return "";
  if (key === "website" || key === "other") return url.replace(/^https?:\/\//i, "");
  const handle = handleOf(key, url);
  return handle ? handle.replace(/^@/, "") : url;
}

/** "@prime_kw" for a recognised platform URL, otherwise null. */
export function handleOf(key: SocialKey, url: string): string | null {
  if (key === "other") return null;
  const p = PLATFORMS[key];
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m|mobile)\./, "").toLowerCase();
    if (!p.hosts.includes(host)) return null;
    let path = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, "");
    if (p.pathPrefix) {
      if (!path.startsWith(p.pathPrefix)) return null;
      path = path.slice(p.pathPrefix.length);
    }
    const first = path.split("/")[0];
    return first && HANDLE_RE.test(first) ? "@" + first.replace(/^@/, "") : null;
  } catch {
    return null;
  }
}

/** Host name for a safe external link label, e.g. "github.com". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Short label for a link chip: the handle when we know it, else the host. */
export function linkLabel(key: SocialKey | "website", url: string): string {
  if (key !== "website") {
    const h = handleOf(key, url);
    if (h) return h;
  }
  return hostOf(url);
}
