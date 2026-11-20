/** Small helpers for the Claude Library (shared by the public page and the
 *  admin manager). */

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Best-effort page count read straight from the PDF bytes: the page tree
 *  root's /Count, else the number of /Type /Page objects. Returns null when
 *  the file hides them (compressed object streams) — the page count is
 *  optional and simply not shown then. */
export function countPdfPages(bytes: Uint8Array): number | null {
  const text = new TextDecoder("latin1").decode(bytes);
  let best = 0;
  for (const m of text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)) best = Math.max(best, Number(m[1]));
  for (const m of text.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) best = Math.max(best, Number(m[1]));
  if (best > 0) return best;
  const pages = text.match(/\/Type\s*\/Page(?!s)\b/g)?.length ?? 0;
  return pages > 0 ? pages : null;
}

/** A download file name that is safe in a Content-Disposition header. */
export function safeFileName(name: string, fallback = "Reemora-guide.pdf"): string {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  if (!cleaned || cleaned === "pdf") return fallback;
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}
