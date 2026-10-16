import { describe, expect, it } from "vitest";
import { mediaSrc, mediaDownloadHref, isLoungeStorageUrl } from "./media";

const BASE = "https://syrjxgskzvximkwosdna.supabase.co/storage/v1/object/public";

describe("mediaSrc", () => {
  it("routes Lounge storage URLs through the members-only proxy", () => {
    expect(mediaSrc(`${BASE}/lounge-media/abc/avatar-1.jpg`)).toBe("/api/lounge/media/lounge-media/abc/avatar-1.jpg");
    expect(mediaSrc(`${BASE}/lounge-files/abc/chat-1-report.pdf?x=1`)).toBe("/api/lounge/media/lounge-files/abc/chat-1-report.pdf");
  });

  it("leaves other URLs untouched and handles empty values", () => {
    expect(mediaSrc("https://example.com/pic.png")).toBe("https://example.com/pic.png");
    expect(mediaSrc(`${BASE}/course-images/x.png`)).toBe(`${BASE}/course-images/x.png`);
    expect(mediaSrc(null)).toBeNull();
    expect(mediaSrc("")).toBeNull();
  });

  it("builds download links only for proxied files", () => {
    expect(mediaDownloadHref(`${BASE}/lounge-files/abc/f.pdf`, "Report 1.pdf")).toBe("/api/lounge/media/lounge-files/abc/f.pdf?download=Report%201.pdf");
    expect(mediaDownloadHref("https://example.com/f.pdf", "f.pdf")).toBe("https://example.com/f.pdf");
  });

  it("recognises Lounge storage URLs", () => {
    expect(isLoungeStorageUrl(`${BASE}/lounge-media/abc/a.jpg`)).toBe(true);
    expect(isLoungeStorageUrl("https://example.com/a.jpg")).toBe(false);
  });
});
