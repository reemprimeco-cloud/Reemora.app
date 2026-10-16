/** Browser-side image downscaling so uploads always fit the bucket limit.
 *
 *  Phone photos routinely run 5–12 MB (iPhone 48 MP shots are ~8 MB), and
 *  Supabase Storage rejects anything over the bucket's file_size_limit
 *  with a 400 that looks like a generic failure to the member. Everything
 *  here is best-effort: on any decode or encode failure the caller still
 *  gets a File back, and `isTooLarge()` is the guard before uploading. */

export interface CompressOptions {
  /** Longest edge after downscaling. */
  maxEdge?: number;
  /** What we try to get the encoded file under. */
  targetBytes?: number;
}

const DEFAULT_MAX_EDGE = 1800;
const DEFAULT_TARGET = 1.5 * 1024 * 1024;
/** JPEG quality steps to try, best first. */
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.45];
/** If the smallest quality still misses the target, shrink and retry. */
const SHRINK_ROUNDS = 3;

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

function decodeWithImg(file: File): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };
    img.src = url;
  });
}

/** createImageBitmap decodes off the main thread and, where supported,
 *  resizes during decode so a 48 MP photo never hits the canvas pixel
 *  limits Safari enforces. Falls back to a plain <img>. */
async function decode(file: File, maxEdge: number): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const probe = await createImageBitmap(file);
      const scale = Math.min(1, maxEdge / Math.max(probe.width, probe.height));
      if (scale >= 1) return { source: probe, width: probe.width, height: probe.height, close: () => probe.close() };
      const w = Math.max(1, Math.round(probe.width * scale));
      const h = Math.max(1, Math.round(probe.height * scale));
      try {
        const resized = await createImageBitmap(probe, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
        probe.close();
        return { source: resized, width: w, height: h, close: () => resized.close() };
      } catch {
        // Resize options unsupported: draw the full bitmap scaled instead.
        return { source: probe, width: probe.width, height: probe.height, close: () => probe.close() };
      }
    } catch {
      /* fall through to <img> */
    }
  }
  return decodeWithImg(file);
}

async function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const direct = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    } catch {
      resolve(null);
    }
  });
  if (direct) return direct;
  // Some WebKit builds return null from toBlob on large canvases; the
  // data-URL path is slower but reliable.
  try {
    const res = await fetch(canvas.toDataURL("image/jpeg", quality));
    return await res.blob();
  } catch {
    return null;
  }
}

function encode(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Shrinks an image so it fits the upload limit instead of being rejected.
 *  Returns the original file when it is already small enough and needs no
 *  resizing, or when the browser cannot process it (GIF/SVG stay as-is). */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const target = opts.targetBytes ?? DEFAULT_TARGET;

  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= target && !opts.maxEdge) return file;

  let decoded: Decoded | null = null;
  try {
    decoded = await decode(file, maxEdge);
    let scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    let best: Blob | null = null;

    for (let round = 0; round <= SHRINK_ROUNDS; round++) {
      const w = Math.max(1, Math.round(decoded.width * scale));
      const h = Math.max(1, Math.round(decoded.height * scale));
      const canvas = encode(decoded.source, w, h);
      if (!canvas) break;
      for (const quality of QUALITY_STEPS) {
        const blob = await toBlob(canvas, quality);
        if (!blob) break;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= target) break;
      }
      if (best && best.size <= target) break;
      scale *= 0.7;
    }

    if (!best) return file;
    // Only accept the re-encode when it actually helps; a small, efficient
    // image can grow when re-encoded.
    if (best.size >= file.size && scale >= 1) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([best], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    decoded?.close();
  }
}

export const LOUNGE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const LOUNGE_FILES_MAX_BYTES = 10 * 1024 * 1024;

export function isTooLarge(file: File, limit = LOUNGE_MEDIA_MAX_BYTES): boolean {
  return file.size > limit;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
