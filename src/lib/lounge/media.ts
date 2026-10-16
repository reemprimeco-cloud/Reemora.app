/** Lounge uploads live in private Supabase buckets. The database keeps the
 *  canonical storage URL (what the client got back from getPublicUrl, used
 *  as a stable identifier), and every place that renders an image or file
 *  swaps it for the members-only proxy at /api/lounge/media/... which
 *  checks the session before streaming the object. Pure, client-safe. */

const STORAGE_RE = /\/storage\/v1\/object\/(?:public|authenticated|sign)\/(lounge-media|lounge-files)\/([^?#]+)/;

export const LOUNGE_BUCKETS = ["lounge-media", "lounge-files"] as const;

export function isLoungeStorageUrl(url: string | null | undefined): boolean {
  return Boolean(url && STORAGE_RE.test(url));
}

/** Rewrites a Lounge storage URL to the authenticated proxy; passes any
 *  other URL through untouched. */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(STORAGE_RE);
  return m ? `/api/lounge/media/${m[1]}/${m[2]}` : url;
}

/** Same as mediaSrc but asks the proxy to send the file as a download. */
export function mediaDownloadHref(url: string | null | undefined, filename?: string | null): string | null {
  const src = mediaSrc(url);
  if (!src || !src.startsWith("/api/lounge/media/")) return src;
  return `${src}?download=${encodeURIComponent(filename || "file")}`;
}
