/** Max pixels on the long edge after downscaling. Comfortably above what
 *  any course card, gallery or hero needs, while cutting a modern phone
 *  photo (4000px+) down to a fraction of its original weight. */
const MAX_EDGE = 1800;

/** What we aim to get the encoded file under. Well below Supabase's limit,
 *  so an upload never fails for size. */
const TARGET_BYTES = 1.5 * 1024 * 1024;

/** JPEG quality steps to try, best first. Each retry re-encodes smaller. */
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Shrinks an image so it always fits the upload limit instead of being
 *  rejected for being too big — phone photos routinely run 5-12MB.
 *
 *  Downscales the long edge to MAX_EDGE, then re-encodes as JPEG, dropping
 *  quality a step at a time until it comes in under TARGET_BYTES. Returns
 *  the original file untouched when it's already small enough, or when the
 *  browser can't process it (GIF/SVG, canvas unavailable) — in that case
 *  the caller still uploads something rather than nothing.
 */
export async function compressImage(file: File): Promise<File> {
  // Animated GIFs and SVGs don't survive a canvas round-trip (the GIF loses
  // its animation, the SVG its scalability), so leave them alone.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= TARGET_BYTES) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let best: Blob | null = null;
    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, quality);
      if (!blob) break;
      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }

    // Keep whichever is actually smaller — re-encoding a already-efficient
    // image can make it bigger.
    if (!best || best.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([best], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
